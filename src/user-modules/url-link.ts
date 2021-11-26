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
import Url from 'url'

import type * as PUPPET     from 'wechaty-puppet'
import type { Constructor } from 'clone-class'

import { openGraph }          from '../helper-functions/open-graph.js'
import { validationMixin }    from '../user-mixins/validation.js'
import { wechatifyMixinBase } from '../user-mixins/wechatify.js'
import { log } from '../config.js'

class UrlLinkMixin extends wechatifyMixinBase() {

  /**
   *
   * Create from URL
   *
   */
  static async create (
    url: string,
    fallback?: Partial<
      Omit<
        PUPPET.payloads.UrlLink,
        'url'
      >
    >,
  ): Promise<UrlLinkInterface> {
    log.verbose('UrlLink', 'create(%s)', url)

    const meta = await openGraph(url)

    let description  : undefined | string
    let thumbnailUrl : undefined | string
    let title        : string

    if (meta.image) {
      if (typeof meta.image === 'string') {
        thumbnailUrl = meta.image
      } else if (Array.isArray(meta.image)) {
        thumbnailUrl = meta.image[0]
      } else {
        if (Array.isArray(meta.image.url)) {
          thumbnailUrl = meta.image.url[0]
        } else if (meta.image.url) {
          thumbnailUrl = meta.image.url
        }
      }
    }

    if (Array.isArray(meta.title)) {
      title = meta.title[0]!
    } else {
      title = meta.title
    }

    if (Array.isArray(meta.description)) {
      description = meta.description[0]
    } else if (meta.description) {
      description = meta.description
    } else {
      description = title
    }

    if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
      const resolvedUrl = new Url.URL(thumbnailUrl, url)
      thumbnailUrl = resolvedUrl.toString()
    }

    const payload: PUPPET.payloads.UrlLink = {
      description  : description  || fallback?.description  || '',
      thumbnailUrl : thumbnailUrl || fallback?.thumbnailUrl || '',
      title        : title        || fallback?.title        || '',
      url,
    }

    return new this(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: PUPPET.payloads.UrlLink,
  ) {
    super()
    log.verbose('UrlLink', 'constructor()')
    // Huan(202110): it is ok to create a raw one without wechaty instance
    // guardWechatifyClass.call(this, UrlLink)
  }

  override toString (): string {
    return `UrlLink<${this.payload.url}>`
  }

  url (): string {
    return this.payload.url
  }

  title (): string {
    return this.payload.title
  }

  thumbnailUrl (): undefined | string {
    return this.payload.thumbnailUrl
  }

  description (): undefined | string {
    return this.payload.description
  }

}

class UrlLinkImpl extends validationMixin(UrlLinkMixin)<UrlLinkInterface>() {}
interface UrlLinkInterface extends UrlLinkImpl {}

type UrlLinkConstructor = Constructor<
  UrlLinkInterface,
  typeof UrlLinkImpl
>

export type {
  UrlLinkConstructor,
  UrlLinkInterface,
}
export {
  UrlLinkImpl,
}
