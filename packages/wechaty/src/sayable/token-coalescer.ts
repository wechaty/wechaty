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
/**
 * Token coalescing for LLM token streaming in `say()` (ADR-29).
 *
 * Why this module exists:
 * Generative AI streams emit fine-grained tokens at high frequency. Sending each
 * token as a separate IM message triggers platform rate limits and anti-spam bans,
 * while buffering the entire response introduces multi-second latency.
 *
 * What it owns:
 * - `TokenCoalescer`: stateful boundary-aware batcher for `'sentence'`,
 *   `'paragraph'`, and `'adaptive'` modes with `maxChunkSize` slicing.
 * - `TokenCoalescerTransform`: Web-standard `TransformStream<string, string>`
 *   wrapping `TokenCoalescer`.
 *
 * Architectural boundaries & key relationships:
 * - WinterTC-portable: uses only standard ECMAScript and Web Streams APIs.
 * - Consumed by `deliver-sayable.ts` (`deliverSayableStreamConversationPuppet`)
 *   and re-exported from `sayable/mod.ts`, `mods/mod.ts`, and `mods/browser.ts`.
 */
import type { SayableStreamMode, SayableStreamOptions } from './types.ts'

const DEFAULT_FLUSH_INTERVAL_MS = 1200
const DEFAULT_MAX_CHUNK_SIZE = 250

/**
 * Matches sentence-ending punctuation (`.`, `?`, `!`, `。`, `！`, `？`, `\n`)
 * where ASCII `.` must be followed by whitespace or end-of-string so numbers
 * (`3.14`), versions (`2.0.0`), and URLs are not split mid-token.
 */
const SENTENCE_BOUNDARY_RE = /(?:[?!。！？\n]+|\.(?=\s|$))[\s]*/g
const PARAGRAPH_BOUNDARY_RE = /\n\n+/g

export interface TokenCoalescerOptions extends Pick<
  SayableStreamOptions,
  'mode' | 'flushIntervalMs' | 'maxChunkSize'
> {
  /** Clock provider for deterministic testing (defaults to `Date.now`). */
  now?: () => number
}

function findLastMatchEnd (text: string, pattern: RegExp): number {
  pattern.lastIndex = 0
  let lastEnd = -1
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    lastEnd = match.index + match[0].length
  }
  return lastEnd
}

function sliceToMaxChunkSize (
  buffer: string,
  maxChunkSize: number,
  emitted: string[],
): string {
  let remaining = buffer
  while (remaining.length >= maxChunkSize) {
    const window = remaining.slice(0, maxChunkSize)
    const lastSpace = window.search(/\s+\S*$/)
    const splitAt = lastSpace > 0 ? lastSpace : maxChunkSize
    const head = remaining.slice(0, splitAt).trim()
    if (head.length > 0) {
      emitted.push(head)
    }
    remaining = remaining.slice(splitAt).replace(/^\s+/, '')
  }
  return remaining
}

/**
 * Stateful token coalescer that batches small streaming text tokens into
 * cohesive sentence, paragraph, or adaptive chunks (ADR-29) before delivery.
 *
 * Note: `flushIntervalMs` is evaluated synchronously when tokens arrive
 * (token-driven coalescing). Any trailing buffered text is drained on `flush()`.
 */
export class TokenCoalescer {
  readonly #mode: SayableStreamMode
  readonly #flushIntervalMs: number
  readonly #maxChunkSize: number
  readonly #now: () => number

  #buffer = ''
  #lastFlushTime: number

  constructor (options: TokenCoalescerOptions = {}) {
    const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS
    const maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE
    if (!Number.isFinite(flushIntervalMs) || flushIntervalMs < 0) {
      throw new RangeError(`flushIntervalMs must be a non-negative finite number, got ${flushIntervalMs}`)
    }
    if (!Number.isFinite(maxChunkSize) || maxChunkSize <= 0) {
      throw new RangeError(`maxChunkSize must be a positive finite number, got ${maxChunkSize}`)
    }

    this.#mode = options.mode ?? 'sentence'
    this.#flushIntervalMs = flushIntervalMs
    this.#maxChunkSize = maxChunkSize
    this.#now = options.now ?? Date.now
    this.#lastFlushTime = this.#now()
  }

  /**
   * Append a token to the buffer and return zero or more cohesive chunks
   * split at natural boundaries and capped at `maxChunkSize`.
   */
  push (token: string): string[] {
    this.#buffer += token
    const emitted: string[] = []
    const now = this.#now()
    const isTimeUp = now - this.#lastFlushTime >= this.#flushIntervalMs

    if (this.#mode === 'paragraph') {
      const splitEnd = findLastMatchEnd(this.#buffer, PARAGRAPH_BOUNDARY_RE)
      if (splitEnd > 0) {
        this.#emitCompletedSegments(this.#buffer.slice(0, splitEnd), PARAGRAPH_BOUNDARY_RE, emitted, now)
        this.#buffer = this.#buffer.slice(splitEnd)
      }
    } else if (this.#mode === 'adaptive') {
      const paraEnd = findLastMatchEnd(this.#buffer, PARAGRAPH_BOUNDARY_RE)
      if (paraEnd > 0) {
        this.#emitCompletedSegments(this.#buffer.slice(0, paraEnd), PARAGRAPH_BOUNDARY_RE, emitted, now)
        this.#buffer = this.#buffer.slice(paraEnd)
      } else if (isTimeUp) {
        const sentenceEnd = findLastMatchEnd(this.#buffer, SENTENCE_BOUNDARY_RE)
        if (sentenceEnd > 0) {
          this.#emitSlice(this.#buffer.slice(0, sentenceEnd), emitted, now)
          this.#buffer = this.#buffer.slice(sentenceEnd)
        } else if (this.#buffer.length >= Math.ceil(this.#maxChunkSize / 2)) {
          const lastSpace = this.#buffer.search(/\s+\S*$/)
          if (lastSpace > 0) {
            this.#emitSlice(this.#buffer.slice(0, lastSpace), emitted, now)
            this.#buffer = this.#buffer.slice(lastSpace).replace(/^\s+/, '')
          }
        }
      }
    } else {
      // 'sentence' mode
      if (isTimeUp) {
        const sentenceEnd = findLastMatchEnd(this.#buffer, SENTENCE_BOUNDARY_RE)
        if (sentenceEnd > 0) {
          this.#emitSlice(this.#buffer.slice(0, sentenceEnd), emitted, now)
          this.#buffer = this.#buffer.slice(sentenceEnd)
        }
      }
    }

    if (this.#buffer.length >= this.#maxChunkSize) {
      this.#buffer = sliceToMaxChunkSize(this.#buffer, this.#maxChunkSize, emitted)
      this.#lastFlushTime = now
    }

    return emitted
  }

  /**
   * Drain any remaining buffered non-whitespace text (respecting `maxChunkSize`)
   * and reset the interval clock.
   */
  flush (): string | undefined {
    const trimmed = this.#buffer.trim()
    this.#buffer = ''
    this.#lastFlushTime = this.#now()
    return trimmed.length > 0 ? trimmed : undefined
  }

  #emitCompletedSegments (
    prefix: string,
    delimiter: RegExp,
    emitted: string[],
    now: number,
  ): void {
    for (const part of prefix.split(delimiter)) {
      this.#emitSlice(part, emitted, now)
    }
  }

  #emitSlice (
    raw: string,
    emitted: string[],
    now: number,
  ): void {
    const trimmed = raw.trim()
    if (trimmed.length === 0) {
      return
    }
    if (trimmed.length >= this.#maxChunkSize) {
      const tail = sliceToMaxChunkSize(trimmed, this.#maxChunkSize, emitted)
      if (tail.length > 0) {
        emitted.push(tail)
      }
    } else {
      emitted.push(trimmed)
    }
    this.#lastFlushTime = now
  }
}

/**
 * Web-standard `TransformStream` that coalesces high-frequency LLM text tokens
 * into cohesive sentence, paragraph, or adaptive chunks (ADR-29).
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
