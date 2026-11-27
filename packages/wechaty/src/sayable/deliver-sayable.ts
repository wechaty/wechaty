import type * as PUPPET from 'wechaty-puppet'
import { FileBox } from 'file-box'

import {
  ContactImpl,
  MessageImpl,
  DelayImpl,
  UrlLinkImpl,
  MiniProgramImpl,
  PostImpl,
  LocationImpl,
}                     from '../user-modules/mod.ts'

import type { Sayable, SayableStream, SayableStreamOptions } from './types.ts'
import { TokenCoalescer } from './token-coalescer.ts'

/**
 * Type guard for `ReadableStream<string>` and `AsyncIterable<string>`.
 * Excludes `Post` instances (which implement `[Symbol.asyncIterator]`) so they
 * continue to be delivered as `Post` payloads.
 */
function isSayableStream (value: unknown): value is SayableStream {
  if (value === null || typeof value !== 'object') {
    return false
  }
  if (PostImpl.validInstance(value)) {
    return false
  }
  return value instanceof ReadableStream
    || typeof (value as AsyncIterable<unknown>)[Symbol.asyncIterator] === 'function'
}

/**
 * Combine two optional `AbortSignal`s into a single signal that aborts when
 * either input aborts.
 */
function combineAbortSignals (a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (a && b) {
    return AbortSignal.any([a, b])
  }
  return a ?? b
}

/**
 * Race an upstream stream read/next promise against an optional `AbortSignal`.
 * When `signal` is already aborted, attaches a no-op rejection handler to
 * `promise` so an in-flight producer error never becomes an unhandled rejection.
 */
function raceWithAbort<T> (promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise
  }
  if (signal.aborted) {
    promise.catch(() => {})
    return Promise.reject(signal.reason)
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      reject(signal.reason)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      val => {
        signal.removeEventListener('abort', onAbort)
        resolve(val)
      },
      err => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

/**
 * Normalize `ReadableStream<string>` and `AsyncIterable<string>` into a
 * single cancellable async generator.
 *
 * Trade-off on abort: when `signal.aborted` is already true, `reader.cancel()`
 * and `iterator.return?.()` are triggered without awaiting completion so
 * `say()` and `bot.stop()` cannot hang indefinitely on an unresponsive upstream
 * LLM/HTTP stream.
 */
async function * iterateSayableStream (
  stream: SayableStream,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  if (stream instanceof ReadableStream) {
    const reader = stream.getReader()
    let completed = false
    try {
      while (true) {
        signal?.throwIfAborted()
        const { done, value } = await raceWithAbort(reader.read(), signal)
        if (done) {
          completed = true
          break
        }
        yield value
      }
    } finally {
      if (!completed) {
        const cancelPromise = reader.cancel(signal?.reason).catch(() => {})
        if (signal?.aborted) {
          void cancelPromise.finally(() => {
            try {
              reader.releaseLock()
            } catch {}
          })
        } else {
          await cancelPromise
          reader.releaseLock()
        }
      } else {
        reader.releaseLock()
      }
    }
    return
  }

  const iterator = stream[Symbol.asyncIterator]()
  let completed = false
  try {
    while (true) {
      signal?.throwIfAborted()
      const { done, value } = await raceWithAbort(iterator.next(), signal)
      if (done) {
        completed = true
        break
      }
      yield value
    }
  } finally {
    if (!completed) {
      const returnPromise = iterator.return?.().catch(() => {})
      if (!signal?.aborted) {
        await returnPromise
      }
    }
  }
}

/**
 * TODO: add unit test to ensure the interface validation code works
 */
const deliverSayableConversationPuppet = (puppet: PUPPET.Puppet) => (conversationId: string) => async (sayable: Sayable) => {
  // if we don't do this, we'll get a TS2454 error:
  // src/sayable/deliver-sayable.ts:102:10 - error TS2454: Variable 'msgId' is used before being assigned.
  /* eslint-disable no-undef-init */
  let msgId: string | void = undefined

  if (typeof sayable === 'number') {
    sayable = String(sayable)
  }

  if (typeof sayable === 'string') {
    return puppet.messageSendText(
      conversationId,
      sayable,
    )
  }

  /**
   * Huan(202110): Checking `looseInstanceOf` is enough for the following types:
   *  so we do not check `interfaceOfClass` anymore because it will consume more resources.
   */
  if (FileBox.valid(sayable)) {
    /**
     * 1. File
     */
    msgId = await puppet.messageSendFile(
      conversationId,
      sayable,
    )
  } else if (MessageImpl.validInstance(sayable)) {
    /**
     * 2. Message
     */
    msgId = await puppet.messageForward(
      conversationId,
      sayable.id,
    )
  } else if (ContactImpl.validInstance(sayable)) {
    /**
     * 3. Contact
     */
    msgId = await puppet.messageSendContact(
      conversationId,
      sayable.id,
    )
  } else if (UrlLinkImpl.validInstance(sayable)) {
    /**
     * 4. Link Message
     */
    msgId = await puppet.messageSendUrl(
      conversationId,
      sayable.payload,
    )
  } else if (MiniProgramImpl.validInstance(sayable)) {
    /**
     * 5. Mini Program
     */
    msgId = await puppet.messageSendMiniProgram(
      conversationId,
      sayable.payload,
    )
  } else if (LocationImpl.validInstance(sayable)) {
    /**
     * 6. Location
     */
    msgId = await puppet.messageSendLocation(
      conversationId,
      sayable.payload,
    )
  } else if (DelayImpl.validInstance(sayable)) {
    /**
     * 7. Delay for a while
     */
    await sayable.wait()
  } else if (PostImpl.validInstance(sayable)) {
    /**
     * 8. Post
     */
    msgId = await puppet.messageSendPost(
      conversationId,
      sayable.payload,
    )
  } else {
    throw new Error('unsupported arg: ' + sayable)
  }

  return msgId
}

/**
 * Consume a `ReadableStream<string>` or `AsyncIterable<string>`, coalescing
 * streaming LLM text tokens (ADR-29) via `TokenCoalescer` before delivering
 * each chunk via `puppet.messageSendText()`.
 */
const deliverSayableStreamConversationPuppet = (puppet: PUPPET.Puppet) => (conversationId: string) => async (
  stream: SayableStream,
  options?: SayableStreamOptions,
): Promise<string | void> => {
  const signal = options?.signal
  const coalescer = new TokenCoalescer(options)
  let lastMsgId: string | void = undefined

  const sendText = async (text: string) => {
    signal?.throwIfAborted()
    const msgId = await puppet.messageSendText(conversationId, text)
    if (msgId) {
      lastMsgId = msgId
    }
  }

  for await (const chunk of iterateSayableStream(stream, signal)) {
    if (typeof chunk !== 'string') {
      throw new TypeError(`SayableStream chunks must be strings, got ${typeof chunk}`)
    }
    for (const text of coalescer.push(chunk)) {
      await sendText(text)
    }
  }

  const remaining = coalescer.flush()
  if (remaining !== undefined) {
    await sendText(remaining)
  }
  return lastMsgId
}

export {
  combineAbortSignals,
  deliverSayableConversationPuppet,
  deliverSayableStreamConversationPuppet,
  isSayableStream,
}
