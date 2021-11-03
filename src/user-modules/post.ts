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
  PostTapType,
}                       from './post-puppet-api.js'
import type {
  PaginationRequest,
  PaginationResponse,
  PostTapListPayload,
}                       from './post-puppet-api.js'
import type { SayablePayload } from './post-payload-list.js'
import { ContactImpl } from './contact.js'
import type { Contact } from './contact.js'

interface PostTap {
  contact: Contact
  type: PostTapType,
  date: Date
}

interface PostListOptions {
  contact?: Contact,
  tapType?: PostTapType,
}

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

    const newPayload = await this.wechaty.puppet.postPayload(this.id)
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

  async * children (
    options: PostListOptions = {},
  ): AsyncIterableIterator<Post> {
    log.verbose('Post', '*children(%s)', Object.keys(options).length ? JSON.stringify(options) : '')

    const pagination: PaginationRequest = {}

    let [postList, nextPageToken] = await this.childList(
      options,
      pagination,
    )

    while (true) {
      while (postList.length) {
        const post = postList.shift()
        if (post) {
          yield post
        }
      }

      if (!nextPageToken) {
        break
      }

      [postList, nextPageToken] = await this.childList(
        options,
        { ...pagination, pageToken: nextPageToken },
      )
    }
  }

  async * descendants (
    options: PostListOptions = {},
  ): AsyncIterableIterator<Post> {
    log.verbose('Post', '*descendants(%s)', Object.keys(options).length ? JSON.stringify(options) : '')

    const pagination: PaginationRequest = {}

    let [postList, nextPageToken] = await this.descendantList(
      options,
      pagination,
    )

    while (true) {
      while (postList.length) {
        const post = postList.shift()
        if (post) {
          yield post
        }
      }

      if (!nextPageToken) {
        break
      }

      [postList, nextPageToken] = await this.descendantList(
        options,
        { ...pagination, pageToken: nextPageToken },
      )
    }
  }

  async * likes (
    options: PostListOptions = {},
  ): AsyncIterableIterator<PostTap> {
    log.verbose('Post', '*likes(%s)', Object.keys(options).length ? JSON.stringify(options) : '')
    return this.taps({
      ...options,
      tapType: PostTapType.Like,
    })
  }

  async * taps (
    options: PostListOptions = {},
  ): AsyncIterableIterator<PostTap> {
    log.verbose('Post', '*taps(%s)', Object.keys(options).length ? JSON.stringify(options) : '')

    const pagination: PaginationRequest = {}

    let [tapList, nextPageToken] = await this.tapList(
      options,
      pagination,
    )

    while (true) {
      while (tapList.length) {
        const tap = tapList.shift()
        if (tap) {
          yield tap
        }
      }

      if (!nextPageToken) {
        break
      }

      [tapList, nextPageToken] = await this.tapList(
        options,
        { ...pagination, pageToken: nextPageToken },
      )
    }
  }

  async like (status: boolean) : Promise<void>
  async like ()                : Promise<undefined | Date>

  async like (status?: boolean): Promise<void | undefined | Date> {
    log.verbose('Post', 'like(%s)', typeof status === 'undefined' ? '' : status)

    if (typeof status === 'undefined') {
      return this.tap(
        PostTapType.Like,
      )
    } else {
      return this.tap(
        PostTapType.Like,
        status,
      )
    }
  }

  async tap (type: PostTapType)                  : Promise<undefined | Date>
  async tap (type: PostTapType, status: boolean) : Promise<void>

  async tap (
    type: PostTapType,
    status?: boolean,
  ): Promise<void | undefined | Date> {
    log.verbose('Post', 'tap(%s%s)',
      PostTapType[type],
      typeof status === 'undefined'
        ? ''
        : ', ' + status,
    )

    if (!this.id) {
      throw new Error('can not tap for post without id')
    }

    if (typeof status === 'undefined') {
      try {
        const [list] = await this.tapList({
          contact: this.wechaty.currentUser(),
          tapType: type,
        })

        return list[0]?.date

      } catch (e) {
        this.wechaty.emitError(e)
        return undefined
      }
    }

    await this.wechaty.puppet.postTap(this.id, type, status)
  }

  async tapList (
    options    : PostListOptions = {},
    pagination : PaginationRequest = {},
  ): Promise<[
    tapList        : PostTap[],
    nextPageToken? : string,
  ]> {
    log.verbose('Post', 'tapList()')

    if (!this.id) {
      throw new Error('can not get tapList for client created post')
    }

    const ret = await this.wechaty.puppet.postTapList(
      this.id,
      options.contact?.id,
      options.tapType || PostTapType.Any,
      pagination,
    )

    const nextPageToken = ret.nextPageToken
    const response = ret.response

    const tapList: PostTap[] = []
    for (const [type, list] of Object.entries(response)) {
      for (const [i, contactId] of list.contactId.entries()) {
        const timestamp = list.timestamp[i]

        const contact = await this.wechaty.Contact.find({ id: contactId })
        if (!contact) {
          log.warn('Post', 'tapList() contact not found for id: %s', contactId)
          continue
        }

        const date = timestamp ? new Date(timestamp) : new Date()
        tapList.push({
          contact,
          date,
          type: Number(type),
        })
      }
    }

    return [tapList, nextPageToken]
  }

  async childList (
    options    : PostListOptions,
    pagination : PaginationRequest = {},
  ): Promise<[
    postList       : Post[],
    nextPageToken? : string,
  ]> {
    log.verbose('Post', 'childList(%s%s)',
      JSON.stringify(options),
      Object.keys(pagination).length ? ', ' + JSON.stringify(pagination) : '',
    )

    if (!this.id) {
      throw new Error('can not get tapList for client created post')
    }

    const ret = await this.wechaty.puppet.postParentList(
      this.id,
      options.contact?.id,
      pagination,
    )

    const nextPageToken = ret.nextPageToken
    const response = ret.response

    const postList: Post[] = []
    for (const postId of response) {
      const post = this.wechaty.Post.load(postId)
      try {
        await post.ready()
      } catch (e) {
        log.warn('Post', 'childList() post.ready() rejection: %s', (e as Error).message)
        continue
      }
      postList.push(post)
    }

    return [postList, nextPageToken]
  }

  async descendantList (
    options    : PostListOptions,
    pagination : PaginationRequest = {},
  ): Promise<[
    postList       : Post[],
    nextPageToken? : string,
  ]> {
    log.verbose('Post', 'descendantList(%s%s)',
      JSON.stringify(options),
      Object.keys(pagination).length ? ', ' + JSON.stringify(pagination) : '',
    )

    if (!this.id) {
      throw new Error('can not get tapList for client created post')
    }

    const ret = await this.wechaty.puppet.postRootList(
      this.id,
      options.contact?.id,
      pagination,
    )

    const nextPageToken = ret.nextPageToken
    const response = ret.response

    const postList: Post[] = []
    for (const postId of response) {
      const post = this.wechaty.Post.load(postId)
      try {
        await post.ready()
      } catch (e) {
        log.warn('Post', 'descendantList() post.ready() rejection: %s', (e as Error).message)
        continue
      }
      postList.push(post)
    }

    return [postList, nextPageToken]
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
