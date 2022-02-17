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
import * as PUPPET      from 'wechaty-puppet'
import { log }          from 'wechaty-puppet'

import type {
  Constructor,
}                     from 'clone-class'

import {
  validationMixin,
  wechatifyMixinBase,
}                       from '../user-mixins/mod.js'

import type { Sayable } from '../sayable/mod.js'
import {
  sayableToPayload,
  payloadToSayableWechaty,
}                       from '../sayable/mod.js'

import { ContactImpl } from './contact.js'
import type { ContactInterface } from './contact.js'
import { concurrencyExecuter } from 'rx-queue'

interface Tap {
  contact: ContactInterface
  type: PUPPET.types.Tap,
  date: Date
}

class PostBuilder {

  payload: PUPPET.payloads.PostClient

  /**
   * Wechaty Sayable List
   */
  sayableList: Sayable[] = []

  /**
   * Huan(202201): why use Impl as a parameter?
   */
  static new (Impl: typeof PostMixin) { return new this(Impl) }
  protected constructor (
    protected Impl: typeof PostMixin,
  ) {
    this.payload = {
      sayableList: [],  // Puppet Sayable Payload List
      type: PUPPET.types.Post.Unspecified,
    }
  }

  add (sayable: Sayable): this {
    this.sayableList.push(sayable)
    return this
  }

  type (type: PUPPET.types.Post): this {
    this.payload.type = type
    return this
  }

  reply (post: PostInterface): this {
    if (!post.id) {
      throw new Error('can not link to a post without id: ' + JSON.stringify(post))
    }

    this.payload.parentId = post.payload.id
    this.payload.rootId   = post.payload.rootId

    return this
  }

  async build (): Promise<PostInterface> {
    const sayablePayloadListNested = await Promise.all(
      this.sayableList.map(sayableToPayload),
    )
    this.payload.sayableList = sayablePayloadListNested.filter(Boolean) as PUPPET.payloads.Sayable[]

    return this.Impl.create(this.payload)
  }

}

class PostMixin extends wechatifyMixinBase() {

  static builder (): PostBuilder { return PostBuilder.new(this) }

  /**
   *
   * Create
   *
   */
  static create (
    payload: PUPPET.payloads.PostClient,
  ): PostInterface {
    log.verbose('Post', 'create()')

    return new this(payload)
  }

  static load (id: string): PostInterface {
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

  static async find (
    filter: PUPPET.filters.Post,
  ): Promise<undefined | PostInterface> {
    log.verbose('Post', 'find(%s)',
      JSON.stringify(filter),
    )

    if (filter.id) {
      const post = this.wechaty.Post.load(filter.id)
      await post.ready()
      return post
    }

    const [postList] = await this.findAll(filter, { pageSize: 1 })
    if (postList.length > 0) {
      return postList[0]
    }
    return undefined
  }

  static async findAll (
    filter      : PUPPET.filters.Post,
    pagination? : PUPPET.filters.PaginationRequest,
  ): Promise<[
    postList       : PostInterface[],
    nextPageToken? : string,
  ]> {
    log.verbose('Post', 'findAll(%s%s)',
      JSON.stringify(filter),
      pagination ? ', ' + JSON.stringify(pagination) : '',
    )

    const {
      nextPageToken,
      response: postIdList,
    } = await this.wechaty.puppet.postSearch(
      filter,
      pagination,
    )

    const idToPost = async (id: string) =>
      this.wechaty.Post.find({ id })
        .catch(e => this.wechaty.emitError(e))

    /**
     * we need to use concurrencyExecuter to reduce the parallel number of the requests
     */
    const CONCURRENCY = 17
    const postIterator = concurrencyExecuter(CONCURRENCY)(idToPost)(postIdList)

    const postList: PostInterface[] = []
    for await (const post of postIterator) {
      if (post) {
        postList.push(post)
      }
    }

    return [postList, nextPageToken]
  }

  protected _payload?: PUPPET.payloads.Post
  get payload (): PUPPET.payloads.Post {
    if (!this._payload) {
      throw new Error('no payload, need to call `ready()` first.')
    }
    return this._payload
  }

  readonly id?: string

  /*
   * @hideconstructor
   */
  constructor (
    idOrPayload: string | PUPPET.payloads.Post,
  ) {
    super()
    log.verbose('Post', 'constructor(%s)',
      typeof idOrPayload === 'string'
        ? idOrPayload
        : JSON.stringify(idOrPayload.id),
    )

    if (typeof idOrPayload === 'string') {
      this.id = idOrPayload
    } else {
      this._payload = idOrPayload
      this.id = idOrPayload.id
    }
  }

  counter (): PUPPET.payloads.PostServer['counter'] {
    return {
      children   : 0,
      descendant : 0,
      taps       : {},
      ...(PUPPET.payloads.isPostServer(this.payload) && this.payload.counter),
    }
  }

  async author (): Promise<ContactInterface> {
    log.silly('Post', 'author()')

    if (PUPPET.payloads.isPostClient(this.payload)) {
      return this.wechaty.currentUser
    }

    const author = await ContactImpl.find(this.payload.contactId)
    if (!author) {
      throw new Error('no author for id: ' + this.payload.contactId)
    }
    return author
  }

  async root (): Promise<undefined | PostInterface> {
    log.silly('Post', 'root()')

    if (!this.payload.rootId) {
      return undefined
    }

    const post = this.wechaty.Post.load(this.payload.rootId)
    await post.ready()
    return post
  }

  async parent (): Promise<undefined | PostInterface> {
    log.silly('Post', 'parent()')
    if (!this.payload.parentId) {
      return undefined
    }

    const post = this.wechaty.Post.load(this.payload.parentId)
    await post.ready()
    return post
  }

  async sync (): Promise<void> {
    log.silly('Post', 'sync()')

    if (!this.id) {
      throw new Error('no post id found')
    }

    this._payload = await this.wechaty.puppet.postPayload(this.id)
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

    if (PUPPET.payloads.isPostServer(this.payload)) {
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
    filter: PUPPET.filters.Post = {},
  ): AsyncIterableIterator<PostInterface> {
    log.verbose('Post', '*children(%s)', Object.keys(filter).length ? JSON.stringify(filter) : '')

    const pagination: PUPPET.filters.PaginationRequest = {
      pageSize: 100,
    }

    const parentIdFilter = {
      ...filter,
      parentId: this.id,
    }

    let [postList, nextPageToken] = await this.wechaty.Post.findAll(
      parentIdFilter,
      pagination,
    )

    while (true) {
      yield * postList
      postList.length = 0

      if (!nextPageToken) {
        break
      }

      [postList, nextPageToken] = await this.wechaty.Post.findAll(
        parentIdFilter,
        {
          ...pagination,
          pageToken: nextPageToken,
        },
      )
    }
  }

  async * descendants (
    filter: PUPPET.filters.Post = {},
  ): AsyncIterableIterator<PostInterface> {
    log.verbose('Post', '*descendants(%s)', Object.keys(filter).length ? JSON.stringify(filter) : '')

    for await (const post of this.children(filter)) {
      yield post
      yield * post.descendants(filter)
    }
  }

  async * likes (
    filter: PUPPET.filters.Post = {},
  ): AsyncIterableIterator<Tap> {
    log.verbose('Post', '*likes(%s)', Object.keys(filter).length ? JSON.stringify(filter) : '')
    return this.taps({
      ...filter,
      type: PUPPET.types.Tap.Like,
    })
  }

  async * taps (
    filter: PUPPET.filters.Tap = {},
  ): AsyncIterableIterator<Tap> {
    log.verbose('Post', '*taps(%s)', Object.keys(filter).length ? JSON.stringify(filter) : '')

    const pagination: PUPPET.filters.PaginationRequest = {}

    let [tapList, nextPageToken] = await this.tapFind(
      filter,
      pagination,
    )

    while (true) {
      yield * tapList
      tapList.length = 0

      if (!nextPageToken) {
        break
      }

      [tapList, nextPageToken] = await this.tapFind(
        filter,
        { ...pagination, pageToken: nextPageToken },
      )
    }
  }

  async reply (
    sayable:
      | Exclude<Sayable, PostInterface>
      | Exclude<Sayable, PostInterface>[],
  ): Promise<void | PostInterface> {
    log.verbose('Post', 'reply(%s)', sayable)

    if (!this.id) {
      console.error('You can only call `reply()` on received posts, but it seems that you are trying to call reply on a post created from local.')
      throw new Error('no post id found')
    }

    const builder = this.wechaty.Post.builder()

    if (Array.isArray(sayable)) {
      sayable.forEach(s => builder.add(s))
    } else {
      builder.add(sayable)
    }

    const post = await builder
      .reply(this)
      .build()

    const postId = await this.wechaty.puppet.postPublish(post.payload)

    if (postId) {
      const newPost = this.wechaty.Post.load(postId)
      await newPost.ready()
      return newPost
    }
  }

  async like (status: boolean) : Promise<void>
  async like ()                : Promise<boolean>

  async like (status?: boolean): Promise<void | boolean> {
    log.verbose('Post', 'like(%s)', typeof status === 'undefined' ? '' : status)

    if (typeof status === 'undefined') {
      return this.tap(
        PUPPET.types.Tap.Like,
      )
    } else {
      return this.tap(
        PUPPET.types.Tap.Like,
        status,
      )
    }
  }

  /**
   * Return Date if the bot has tapped the post, otherwise return undefined
   */
  async tap (type: PUPPET.types.Tap)                  : Promise<boolean>
  async tap (type: PUPPET.types.Tap, status: boolean) : Promise<void>

  async tap (
    type    : PUPPET.types.Tap,
    status? : boolean,
  ): Promise<void | boolean> {
    log.verbose('Post', 'tap(%s%s)',
      PUPPET.types.Tap[type],
      typeof status === 'undefined'
        ? ''
        : ', ' + status,
    )

    if (!this.id) {
      throw new Error('can not tap for post without id')
    }

    return this.wechaty.puppet.tap(this.id, type, status)
  }

  async tapFind (
    filter      : PUPPET.filters.Tap,
    pagination? : PUPPET.filters.PaginationRequest,
  ): Promise<[
    tapList        : Tap[],
    nextPageToken? : string,
  ]> {
    log.verbose('Post', 'tapFind()')

    if (!this.id) {
      throw new Error('can not get tapFind for client created post')
    }

    const {
      nextPageToken,
      response,
    } = await this.wechaty.puppet.tapSearch(
      this.id,
      filter,
      pagination,
    )

    const tapList: Tap[] = []
    for (const [type, data] of Object.entries(response)) {
      for (const [i, contactId] of data.contactId.entries()) {
        const contact = await this.wechaty.Contact.find({ id: contactId })
        if (!contact) {
          log.warn('Post', 'tapFind() contact not found for id: %s', contactId)
          continue
        }

        const timestamp = data.timestamp[i]
        const date = timestamp ? new Date(timestamp) : new Date()

        tapList.push({
          contact,
          date,
          type: Number(type) as PUPPET.types.Tap,
        })
      }
    }

    return [tapList, nextPageToken]
  }

}

class PostImpl extends validationMixin(PostMixin)<PostInterface>() {}
interface PostInterface extends PostImpl {}

type PostConstructor = Constructor<
  PostInterface,
  typeof PostImpl
>

export type {
  PostConstructor,
  PostInterface,
}
export {
  PostBuilder,
  PostImpl,
}
