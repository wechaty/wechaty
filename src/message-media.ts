/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import {
    Config
  , log
}                     from './config'
import { Message }    from './message'
import { UtilLib }    from './util-lib'
import { PuppetWeb }  from './puppet-web/puppet-web'
import { Bridge }     from './puppet-web/bridge'

export class MediaMessage extends Message {
  private bridge: Bridge

  constructor(rawObj) {
    super(rawObj)
    // FIXME: decoupling needed
    this.bridge = (Config.puppetInstance() as PuppetWeb)
                        .bridge
  }

  public async ready(): Promise<void> {
    log.silly('MediaMessage', 'ready()')

    try {
      await super.ready()

      let url: string
      switch (this.type()) {
        case Message.TYPE['EMOTICON']:
          url = await this.bridge.getMsgEmoticon(this.id)
          break
        case Message.TYPE['IMAGE']:
          url = await this.bridge.getMsgImg(this.id)
          break
        case Message.TYPE['VIDEO']:
        case Message.TYPE['MICROVIDEO']:
          url = await this.bridge.getMsgVideo(this.id)
          break
        case Message.TYPE['VOICE']:
          url = await this.bridge.getMsgVoice(this.id)
          break
        default:
          throw new Error('not support message type for MediaMessage')
      }
      this.obj.url = url

      // return this // IMPORTANT!

    } catch (e) {
      log.warn('MediaMessage', 'ready() exception: %s', e.message)
      throw e
    }
  }

  public ext(): string {
    switch (this.type()) {
      case Message.TYPE['EMOTICON']:
        return '.gif'

      case Message.TYPE['IMAGE']:
        return '.jpg'

      case Message.TYPE['VIDEO']:
      case Message.TYPE['MICROVIDEO']:
        return '.mp4'

      case Message.TYPE['VOICE']:
        return '.mp3'

      default:
        throw new Error('not support type: ' + this.type())
    }
  }

  // private getMsgImg(id: string): Promise<string> {
  //   return this.bridge.getMsgImg(id)
  //   .catch(e => {
  //     log.warn('MediaMessage', 'getMsgImg(%d) exception: %s', id, e.message)
  //     throw e
  //   })
  // }

  public readyStream(): Promise<NodeJS.ReadableStream> {
    return this.ready()
    .then(() => {
      // FIXME: decoupling needed
      return (Config.puppetInstance() as PuppetWeb)
                    .browser.readCookie()
    })
    .then(cookies => {
      if (!this.obj.url) {
        throw new Error('no url')
      }
      return UtilLib.downloadStream(this.obj.url, cookies)
    })
    .catch(e => {
      log.warn('MediaMessage', 'stream() exception: %s', e.message)
      throw e
    })
  }
}
