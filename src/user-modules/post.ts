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
 * Issue #2245 - New Wechaty User Module (WUM):
 *  `Post` for supporting Moments, Channel, Tweet, Weibo, Facebook feeds, etc.
 *
 *  @see https://github.com/wechaty/wechaty/issues/2245#issuecomment-914886835
 */

import type * as PUPPET from 'wechaty-puppet'
import { log }          from 'wechaty-puppet'

import { instanceToClass }  from 'clone-class'

import type { Constructor } from '../deprecated/clone-class.js'

import {
  validationMixin,
  wechatifyMixinBase,
}                       from '../user-mixins/mod.js'

import type { Sayable } from '../sayable/mod.js'
import {
  sayableToPayload,
  payloadToSayableWechaty,
}                       from '../sayable/mod.js'

import {
  isPostPayloadServer,
  PostPayload,
  PostPayloadClient,
}                       from './post-puppet-api.js'
import type { SayablePayload } from './post-payload-list.js'
import { ContactImpl } from './contact.js'
import type { Contact } from './contact.js'

class PostBuilder {

  rootId?: string
  parentId?: string

  sayableList: Sayable[] = []

  static new () { return new this() }
  protected constructor () {}

  add (sayable: Sayable) {
    this.sayableList.push(sayable)
    return this
  }

  link (post: Post): this {
    if (!post.id) {
      throw new Error('can not link to a post without id: ' + JSON.stringify(post))
    }

    this.parentId = post.payload.id
    this.rootId   = post.payload.rootId

    return this
  }

  async build () {
    const sayablePayloadList = this.sayableList
      .map(sayableToPayload)
      .flat()
      .filter(Boolean) as SayablePayload[]

    return PostImpl.create({
      parentId    : this.parentId,
      rootId      : this.rootId,
      sayableList : sayablePayloadList,
      timestamp   : Date.now(),
    })
  }

}

class PostMixin extends wechatifyMixinBase() {

  static builder (): PostBuilder { return PostBuilder.new() }

  /**
   *
   * Create
   *
   */
  static create (
    payload: Omit<PostPayloadClient, 'contactId'>,
  ): Post {
    log.verbose('Post', 'create()')

    const post = new this()
    post._payload = {
      ...payload,
      contactId: this.wechaty.puppet.currentUserId,
    }

    return post
  }

  static load (id: string): Post {
    log.verbose('Post', 'static load(%s)', id)

    /**
     * Must NOT use `Post` at here
     * MUST use `this` at here
     *
     * because the class will be `cloneClass`-ed
     */
    const post = new this(id)

    return post
  }

  protected _payload?: PostPayload
  get payload (): PostPayload {
    if (!this._payload) {
      throw new Error('no payload')
    }
    return this._payload
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly id?: string,
  ) {
    super()
    log.verbose('Post', 'constructor(%s)', id ?? '')
  }

  async author (): Promise<Contact> {
    log.silly('Post', 'author()')

    const author = await ContactImpl.find(this.payload.contactId)
    if (!author) {
      throw new Error('no author for id: ' + this.payload.contactId)
    }
    return author
  }

  async root (): Promise<undefined | Post> {
    log.silly('Post', 'root()')

    if (!this.payload.rootId) {
      return undefined
    }

    const post = instanceToClass(this, PostImpl).load(this.payload.rootId)
    await post.ready()
    return post
  }

  async parent (): Promise<undefined | Post> {
    log.silly('Post', 'parent()')
    if (!this.payload.parentId) {
      return undefined
    }

    const post = instanceToClass(this, PostImpl).load(this.payload.parentId)
    await post.ready()
    return post
  }

  async sync (): Promise<void> {
    log.silly('Post', 'sync()')

    if (!this.id) {
      throw new Error('no post id found')
    }

    const newPayload = await this.wechaty.puppet.postPayoad(this.id)
    this._payload = newPayload
  }

  async ready (): Promise<void> {
    log.silly('Post', 'ready()')

    if (!this.id) {
      throw new Error('no post id found')
    }

    if (this._payload) {
      return
    }

    await this.sync()
  }

  async * [Symbol.asyncIterator] (): AsyncIterableIterator<Sayable> {
    log.verbose('Post', '[Symbol.asyncIterator]()')

    if (isPostPayloadServer(this.payload)) {
      for (const messageId of this.payload.sayableList) {
        const message = await this.wechaty.Message.find({ id: messageId })
        if (message) {
          const sayable = await message.toSayable()
          if (sayable) {
            yield sayable
          }
        }
      }

    } else {  // client
      const payloadToSayable = payloadToSayableWechaty(this.wechaty)
      for (const sayablePayload of this.payload.sayableList) {
        const sayable = await payloadToSayable(sayablePayload)
        if (sayable) {
          yield sayable
        }
      }

    }
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
