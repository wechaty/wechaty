import type * as PUPPET from '@juzi/wechaty-puppet'

import type { Constructor } from 'clone-class'
import { log } from '../config.js'

import { validationMixin } from '../user-mixins/validation.js'

import {
  wechatifyMixinBase,
} from '../user-mixins/wechatify.js'

class ChannelMixin extends wechatifyMixinBase() {

  /**
   *
   * Create
   *
   */
  static async create (): Promise<ChannelInterface> {
    log.verbose('Channel', 'create()')

    // TODO: get appid and username from wechat
    const payload: PUPPET.payloads.Channel = {
      avatar: 'todo',
      coverUrl: 'todo',
      desc: 'todo',
      extras: 'todo',
      feedType: 4,
      nickname: 'todo',
      thumbUrl: 'todo',
      url: 'todo',
    }

    return new this(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: PUPPET.payloads.Channel,
  ) {
    super()
    log.verbose('Channel', 'constructor()')
  }

  avatar (): undefined | string {
    return this.payload.avatar
  }

  coverUrl (): undefined | string {
    return this.payload.coverUrl
  }

  desc (): undefined | string {
    return this.payload.desc
  }

  extras (): undefined | string {
    return this.payload.extras
  }

  feedType (): undefined | number {
    return this.payload.feedType
  }

  nickname (): undefined | string {
    return this.payload.nickname
  }

  thumbUrl (): undefined | string {
    return this.payload.thumbUrl
  }

  url (): undefined | string {
    return this.payload.url
  }

}

class ChannelImpl extends validationMixin(ChannelMixin)<ChannelInterface>() { }
interface ChannelInterface extends ChannelImpl { }

type ChannelConstructor = Constructor<
  ChannelInterface,
  typeof ChannelImpl
>

export type {
  ChannelConstructor,
  ChannelInterface,
}
export {
  ChannelImpl,
}
