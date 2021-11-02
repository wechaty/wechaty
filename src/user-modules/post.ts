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
import { ContactImpl } from './contact.js'

import { log }  from 'wechaty-puppet'
import type * as PUPPET from 'wechaty-puppet'

import type { Contact } from './contact.js'
import type { Constructor } from '../deprecated/clone-class.js'
import { validationMixin } from '../user-mixins/validation.js'

import {
  EmptyBase,
  wechatifyMixin,
}                       from '../user-mixins/wechatify.js'
import type { Sayable } from '../interface/sayable.js'

import type { PostPayload } from './post-puppet-api.js'

const MixinBase = wechatifyMixin(
  EmptyBase,
)

class PostBuilder {

  static new () { return new this() }
  protected constructor () {}

  protected payload: Partial<PostPayload> = {
    messageIdList: [],
  }

  add (sayable: Sayable) {
    this.payload.messageIdList!.push(sayable)
    return this
  }

  link (post: Post) {
    this.payload.rootId   = post.payload.rootId
    this.payload.parentId = post.payload.id
    return this
  }

  build () {
    return PostImpl.create(this.payload)
  }

}

class PostMixin extends MixinBase {

  /**
   *
   * Create
   *
   */
  static async create (payload: PostPayload): Promise<Post> {
    log.verbose('Post', 'create()')

    if (payload.id) {
      throw new Error('newly created Post must keep `id` to be `undefined`')
    }
    return new this(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: PUPPET.payload.Post,
  ) {
    super()
    log.verbose('Post', 'constructor()')
  }

  async author (): Promise<Contact> {
    const author = await ContactImpl.find(this.payload.contactId)
    if (!author) {
      throw new Error('no author for id: ' + this.payload.contactId)
    }
    return author
  }

  coverageUrl (): string {
    return this.payload.coverageUrl
  }

  videoUrl (): string {
    return this.payload.videoUrl
  }

  title (): string {
    return this.payload.title
  }

}

class PostImpl extends validationMixin(PostMixin)<Post>() {}
interface Post extends PostImpl {}

type PostConstructor = Constructor<
  Post,
  typeof PostImpl
>

export type {
  PostConstructor,
  Post,
}
export {
  PostBuilder,
  PostImpl,
}
