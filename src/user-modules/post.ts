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

import { ContactImpl } from './contact.js'

import { log }  from 'wechaty-puppet'
import * as PUPPET from 'wechaty-puppet'
import { FileBox } from 'file-box'

import type { Contact } from './contact.js'
import type { Constructor } from '../deprecated/clone-class.js'
import { validationMixin } from '../user-mixins/validation.js'

import {
  EmptyBase,
  wechatifyMixin,
}                       from '../user-mixins/wechatify.js'
import type { Sayable } from '../interface/sayable.js'

import type {
  PostPayload,
  PostPayloadClient,
  PostPayloadServer,
}                       from './post-puppet-api.js'
import {
  isPostPayloadClient,
  isPostPayloadServer,
}                       from './post-puppet-api.js'
import type { PostContentPayload } from './post-payload-list.js'
import { DelayImpl } from './delay.js'
import { LocationImpl } from './location.js'
import { MessageImpl } from './message.js'
import { MiniProgramImpl } from './mini-program.js'
import { UrlLinkImpl } from './url-link.js'

const MixinBase = wechatifyMixin(
  EmptyBase,
)

function sayableToPostContentPayload (sayable: Sayable): undefined | PostContentPayload | PostContentPayload[] {
  // | Contact
  // | Delay
  // | FileBoxInterface
  // | Location
  // | Message
  // | MiniProgram
  // | number
  // | Post
  // | string
  // | UrlLink
  if (typeof sayable === 'string') {
    return {
      payload: sayable,
      type: PUPPET.type.Message.Text,
    }
  } else if (typeof sayable === 'number') {
    return {
      payload: String(sayable),
      type: PUPPET.type.Message.Text,
    }
  } else if (ContactImpl.validInstance(sayable)) {
    return {
      payload: sayable.id,
      type: PUPPET.type.Message.Contact,
    }
  } else if (DelayImpl.validInstance(sayable)) {
    // Delay is a local sayable
    return undefined
  } else if (FileBox.valid(sayable)) {
    return {
      payload: sayable,
      type: PUPPET.type.Message.Attachment,
    }
  } else if (LocationImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.Location,
    }
  } else if (MessageImpl.validInstance(sayable)) {
    // const unwrappedSayable = await sayable.toSayable()
    // if (!unwrappedSayable) {
    //   return undefined
    // }
    // return sayableToPostContentPayload(unwrappedSayable)
    console.error('Post:sayableToPostContentPayload() not support Message yet')
    return undefined
  } else if (MiniProgramImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.MiniProgram,
    }
  } else if (PostImpl.validInstance(sayable)) {
    // const unwrappedSayableList = [...sayable]
    // if (!unwrappedSayableList) {
    //   return undefined
    // }
    // return unwrappedSayableList.map(sayableToPostContentPayload)
    console.error('not support add Post to Post yet.')
    return undefined
  } else if (UrlLinkImpl.validInstance(sayable)) {
    return {
      payload: sayable.payload,
      type: PUPPET.type.Message.Url,
    }
  } else {
    console.error(`sayableToPostContentPayload(): unsupported sayable: ${sayable}`)
    return undefined
  }
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

  link (post: Post) {
    this.rootId   = post.root().id
    this.parentId = post.id
    return this
  }

  async build () {
    const contentPayloadList = this.sayableList
      .map(sayableToPostContentPayload)
      .flat()
      .filter(Boolean) as PostContentPayload[]

    return PostImpl.create({
      contentList: contentPayloadList,
      parentId: this.parentId,
      rootId: this.rootId,
      timestamp: Date.now(),
    })
  }

}

class PostMixin extends MixinBase {

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

    return new this({
      ...payload,
      contactId: this.wechaty.puppet.currentUserId,
    })
  }

  static load (id: string): PostImplInterface {
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

  /*
   * @hideconstructor
   */
  constructor (
    protected readonly payload: PUPPET.payload.Post,
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
