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
import type {
  FileBoxInterface,
}                       from 'file-box'

import type {
  Contact,
  Delay,
  Location,
  Message,
  MiniProgram,
  Post,
  Room,
  UrlLink,
}                           from '../user-modules/mod.ts'

import type {
  Wechaty,
}                           from '../wechaty/mod.ts'

type Sayable =
  | Contact
  | Delay
  | FileBoxInterface
  | Location
  | Message
  | MiniProgram
  | number
  | Post
  | string
  | UrlLink

type SayableStream =
  | ReadableStream<string>
  | AsyncIterable<string>

type SayableStreamMode =
  | 'sentence'
  | 'paragraph'
  | 'adaptive'

interface SayableStreamOptions {
  /**
   * Coalescing strategy for text/number tokens (default: `'sentence'`):
   * - `'sentence'`: flush completed sentences once `flushIntervalMs` elapses.
   * - `'paragraph'`: flush on `\n\n` paragraph breaks.
   * - `'adaptive'`: flush immediately on paragraph breaks, on sentence boundaries
   *   after `flushIntervalMs`, or at whitespace when `flushIntervalMs` elapses
   *   above half of `maxChunkSize`.
   */
  mode?: SayableStreamMode
  /**
   * Minimum interval in ms between flushed sentence/adaptive chunks (default: `1200`).
   * Evaluated when tokens arrive (token-driven); trailing text flushes on stream end.
   */
  flushIntervalMs?: number
  /** Maximum buffered characters before forcing a split/flush (default: `250`). */
  maxChunkSize?: number
  /** Optional AbortSignal to cancel stream consumption early. */
  signal?: AbortSignal
}

interface WechatySayStreamOptions extends SayableStreamOptions {
  /** Target Contact, Room, or conversation ID. Defaults to `bot.currentUser`. */
  to?: Contact | Room | string
}

interface SayableSayer {
  id      : string,
  wechaty : Wechaty,
  say (
    sayable  : Sayable,
    replyTo? : Contact | Contact[],
  ): Promise<void | Message>
  say (
    stream   : SayableStream,
    options? : SayableStreamOptions,
  ): Promise<void | Message>
}

export type {
  SayableSayer,
  Sayable,
  SayableStream,
  SayableStreamMode,
  SayableStreamOptions,
  WechatySayStreamOptions,
}
