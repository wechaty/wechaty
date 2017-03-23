/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import * as moment from 'moment'

import {
  Config,
  log,
}                     from './config'
import {
  AppMsgType,
  Message,
  MsgType,
  // MsgRawObj,
}                     from './message'
import { UtilLib }    from './util-lib'
import { PuppetWeb }  from './puppet-web/puppet-web'
import { Bridge }     from './puppet-web/bridge'

export class MediaMessage extends Message {
  private bridge: Bridge
  private filepath: string

  constructor(rawObj) {

    if (typeof rawObj === 'string') {
      super()
      this.filepath = rawObj
    } else
      super(rawObj)
    // FIXME: decoupling needed
    this.bridge = (Config.puppetInstance() as PuppetWeb)
      .bridge
  }

  public async ready(): Promise<void> {
    log.silly('MediaMessage', 'ready()')

    try {
      await super.ready()

      let url: string|null = null
      switch (this.type()) {
        case MsgType.EMOTICON:
          url = await this.bridge.getMsgEmoticon(this.id)
          break
        case MsgType.IMAGE:
          url = await this.bridge.getMsgImg(this.id)
          break
        case MsgType.VIDEO:
        case MsgType.MICROVIDEO:
          url = await this.bridge.getMsgVideo(this.id)
          break
        case MsgType.VOICE:
          url = await this.bridge.getMsgVoice(this.id)
          break

        case MsgType.APP:
          if (!this.rawObj) {
            throw new Error('no rawObj')
          }
          switch (this.typeApp()) {
            case AppMsgType.ATTACH:
              if (!this.rawObj.MMAppMsgDownloadUrl) {
                throw new Error('no MMAppMsgDownloadUrl')
              }
              // had set in Message
              // url = this.rawObj.MMAppMsgDownloadUrl
              break

            case AppMsgType.URL:
            case AppMsgType.READER_TYPE:
              if (!this.rawObj.Url) {
                throw new Error('no Url')
              }
              // had set in Message
              // url = this.rawObj.Url
              break

            default:
              const e = new Error('ready() unsupported typeApp(): ' + this.typeApp())
              log.warn('MediaMessage', e.message)
              this.dumpRaw()
              throw e
          }
          break

        case MsgType.TEXT:
          if (this.typeSub() === MsgType.LOCATION) {
            url = await this.bridge.getMsgPublicLinkImg(this.id)
          }
          break

        default:
          throw new Error('not support message type for MediaMessage')
      }

      if (!url) {
        if (!this.obj.url) {
          throw new Error('no obj.url')
        }
        url = this.obj.url
      }

      this.obj.url = url

    } catch (e) {
      log.warn('MediaMessage', 'ready() exception: %s', e.message)
      throw e
    }
  }

  private ext(): string {
    switch (this.type()) {
      case MsgType.EMOTICON:
        return 'gif'

      case MsgType.IMAGE:
        return 'jpg'

      case MsgType.VIDEO:
      case MsgType.MICROVIDEO:
        return 'mp4'

      case MsgType.VOICE:
        return 'mp3'

      case MsgType.APP:
        switch (this.typeApp()) {
          case AppMsgType.URL:
            return 'url' // XXX
        }
        break

      case MsgType.TEXT:
        if (this.typeSub() === MsgType.LOCATION) {
          return 'jpg'
        }
        break
    }
    throw new Error('not support type: ' + this.type())
  }

  public filename(): string {
    if (this.filepath)
      return this.filepath

    if (!this.rawObj) {
      throw new Error('no rawObj')
    }

    const objFileName = this.rawObj.FileName || this.rawObj.MediaId || this.rawObj.MsgId

    let filename  = moment().format('YYYY-MM-DD HH:mm:ss')
                    + ' #' + this._counter
                    + ' ' + this.getSenderString()
                    + ' ' + objFileName

    filename = filename.replace(/ /g, '_')

    const re = /\.[a-z0-9]{1,7}$/i
    if (!re.test(filename)) {
      const ext = this.rawObj.MMAppMsgFileExt || this.ext()
      filename += '.' + ext
    }
    return filename
  }

  // private getMsgImg(id: string): Promise<string> {
  //   return this.bridge.getMsgImg(id)
  //   .catch(e => {
  //     log.warn('MediaMessage', 'getMsgImg(%d) exception: %s', id, e.message)
  //     throw e
  //   })
  // }

  public async readyStream(): Promise<NodeJS.ReadableStream> {
    try {
      await this.ready()
      // FIXME: decoupling needed
      const cookies = await (Config.puppetInstance() as PuppetWeb).browser.readCookie()
      if (!this.obj.url) {
        throw new Error('no url')
      }
      return UtilLib.urlStream(this.obj.url, cookies)
    } catch (e) {
      log.warn('MediaMessage', 'stream() exception: %s', e.stack)
      throw e
    }
  }
}
