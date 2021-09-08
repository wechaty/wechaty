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
  Message
}                   from './message.js'

import type {
  Wechaty,
}                   from '../wechaty.js'

import {
  CommentPayload,
  ListOption,
  log,
}                   from 'wechaty-puppet'

class Comment {
  static get wechaty  (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }
  get wechaty        (): Wechaty { throw new Error('This class can not be used directly. See: https://github.com/wechaty/wechaty/issues/2027') }

  /**
   *
   * Create
   *
   */
  public static async create (): Promise<CommentPayload> {
    log.verbose('Comment', 'create()')

    const payload: CommentPayload = {
      id: 'todo',
      content: 'todo',
      creatorId: 'todo',
      messageId: 'todo',
      replyId: 'todo',
    }

    return new Comment(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: CommentPayload,
  ) {
    log.verbose('Comment', 'constructor()')
  }

  public async comment (message: Message, content: string): Promise<Comment> {
    return this.wechaty.puppet.comment(message.id, content)
  }

  public async reply (comment: Comment, content: string): Promise<Comment> {
    return this.wechaty.puppet.replyComment(comment.payload.id, content)
  }

  public async revoke (comment: Comment): Promise<boolean> {
    return this.wechaty.puppet.revokeComment(comment.payload.id)
  }

  public async list (message: Message, option: ListOption): Promise<boolean> {
    return this.wechaty.puppet.listComments(message.id, option)
  }

}

function wechatifyComment (_: any): typeof Comment {

  return Comment

}

export {
  Comment,
  wechatifyComment,
}
