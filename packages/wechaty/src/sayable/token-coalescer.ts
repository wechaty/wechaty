/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import type { SayableStreamMode, SayableStreamOptions } from './types.ts'

const DEFAULT_FLUSH_INTERVAL_MS = 1200
const DEFAULT_MAX_CHUNK_SIZE = 250

const SENTENCE_DELIMITERS = /([.?!。！？\n]+[\s]*)/
const PARAGRAPH_DELIMITERS = /\n\n+/

export interface TokenCoalescerOptions extends Pick<
  SayableStreamOptions,
  'mode' | 'flushIntervalMs' | 'maxChunkSize'
> {
  /** Clock provider for deterministic testing (defaults to `Date.now`). */
  now?: () => number
}

/**
 * Stateful token coalescer that batches small streaming text tokens into
 * cohesive sentence or paragraph chunks (ADR-29) before delivery.
 */
export class TokenCoalescer {
  readonly #mode: SayableStreamMode
  readonly #flushIntervalMs: number
  readonly #maxChunkSize: number
  readonly #now: () => number

  #buffer = ''
  #lastFlushTime: number

  constructor (options: TokenCoalescerOptions = {}) {
    this.#mode = options.mode ?? 'sentence'
    this.#flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
    this.#maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE
    this.#now = options.now ?? Date.now
    this.#lastFlushTime = this.#now()
  }

  /**
   * Append a token to the buffer and return zero or one cohesive chunk ready
   * for delivery.
   */
  push (token: string): string[] {
    this.#buffer += token
    const now = this.#now()
    const isTooLong = this.#buffer.length >= this.#maxChunkSize

    let shouldFlush = isTooLong
    if (!shouldFlush) {
      if (this.#mode === 'paragraph') {
        shouldFlush = PARAGRAPH_DELIMITERS.test(this.#buffer)
      } else {
        const hasDelimiter = SENTENCE_DELIMITERS.test(this.#buffer)
        const isTimeUp = now - this.#lastFlushTime >= this.#flushIntervalMs
        shouldFlush = hasDelimiter && isTimeUp
      }
    }

    if (!shouldFlush) {
      return []
    }

    const trimmed = this.#buffer.trim()
    this.#buffer = ''
    this.#lastFlushTime = now
    return trimmed.length > 0 ? [ trimmed ] : []
  }

  /**
   * Drain any remaining buffered non-whitespace text and reset the clock.
   */
  flush (): string | undefined {
    const trimmed = this.#buffer.trim()
    this.#buffer = ''
    this.#lastFlushTime = this.#now()
    return trimmed.length > 0 ? trimmed : undefined
  }
}

/**
 * Web-standard `TransformStream` that coalesces high-frequency LLM text tokens
 * into cohesive sentence or paragraph chunks (ADR-29).
 */
export class TokenCoalescerTransform extends TransformStream<string, string> {
  constructor (options: TokenCoalescerOptions = {}) {
    const coalescer = new TokenCoalescer(options)
    super({
      transform (chunk, controller) {
        for (const out of coalescer.push(chunk)) {
          controller.enqueue(out)
        }
      },
      flush (controller) {
        const remaining = coalescer.flush()
        if (remaining !== undefined) {
          controller.enqueue(remaining)
        }
      },
    })
  }
}
