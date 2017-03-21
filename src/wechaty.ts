import { EventEmitter } from 'events'
import * as fs          from 'fs'
import * as path        from 'path'
import * as request     from 'request'
import * as bl          from 'bl'
import * as mime        from 'mime'

import {
  Config,
  HeadName,
  PuppetName,
  Sayable,
  log,
}                         from './config'

import { Contact }        from './contact'
import { FriendRequest }  from './friend-request'
import { Message }        from './message'
import { Puppet }         from './puppet'
import { PuppetWeb }      from './puppet-web/'
import { Room }           from './room'
import { StateMonitor }   from './state-monitor'
import { UtilLib }        from './util-lib'

export type PuppetSetting = {
  head?:    HeadName,
  puppet?:  PuppetName,
  profile?: string,
}

export type WechatyEventName = 'error'
                              | 'friend'
                              | 'heartbeat'
                              | 'login'
                              | 'logout'
                              | 'message'
                              | 'room-join'
                              | 'room-leave'
                              | 'room-topic'
                              | 'scan'
                              | 'EVENT_PARAM_ERROR'

/**
 *
 * Wechaty: Wechat for ChatBots.
 * Connect ChatBots
 *
 * Class Wechaty
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 *
 * **Example**
 *
 * ```ts
 * // The World's Shortest ChatBot Code: 6 lines of JavaScript
 * const { Wechaty } = require('wechaty')
 *
 * Wechaty.instance() // Singleton
 * .on('scan', (url, code) => console.log(`Scan QR Code to login: ${code}\n${url}`))
 * .on('login',       user => console.log(`User ${user} logined`))
 * .on('message',  message => console.log(`Message: ${message}`))
 * .init()
 * ```
 * @see The <a href="https://github.com/lijiarui/wechaty-getting-started">Wechaty Starter Project</a>
 */
export class Wechaty extends EventEmitter implements Sayable {
  /**
   * singleton _instance
   * @private
   */
  private static _instance: Wechaty

  /**
   * the puppet
   * @private
   */
  public puppet: Puppet | null

  /**
   * the state
   * @private
   */
  private state = new StateMonitor<'standby', 'ready'>('Wechaty', 'standby')
  /**
   * the npmVersion
   * @private
   */
  private npmVersion: string = require('../package.json').version
  /**
   * the uuid
   * @private
   */
  public uuid:        string

  /**
   * get the singleton instance of Wechaty
   */
  public static instance(setting?: PuppetSetting) {
    if (setting && this._instance) {
      throw new Error('there has already a instance. no params will be allowed any more')
    }
    if (!this._instance) {
      this._instance = new Wechaty(setting)
    }
    return this._instance
  }

  /**
   * @private
   */
  private constructor(private setting: PuppetSetting = {}) {
    super()
    log.verbose('Wechaty', 'contructor()')

    setting.head    = setting.head    || Config.head
    setting.puppet  = setting.puppet  || Config.puppet
    setting.profile = setting.profile || Config.profile

    // setting.port    = setting.port    || Config.port

    if (setting.profile) {
      setting.profile  = /\.wechaty\.json$/i.test(setting.profile)
                        ? setting.profile
                        : setting.profile + '.wechaty.json'
    }

    this.uuid = UtilLib.guid()
  }

  /**
   * @private
   */
  public toString() { return 'Class Wechaty(' + this.setting.puppet + ')'}

  /**
   * Return version of Wechaty
   *
   * @param {boolean} [forceNpm=false]  - if set to true, will only return the version in package.json.
   *                                      otherwise will return git commit hash if .git exists.
   * @returns {string}                  - the version number
   * @example
   *  console.log(Wechaty.instance().version())
   *  // '#git[af39df]'
   *  console.log(Wechaty.instance().version(true))
   *  // '0.7.9'
   */
  public version(forceNpm = false): string {
    // TODO: use  git rev-parse HEAD  ?
    const dotGitPath  = path.join(__dirname, '..', '.git') // only for ts-node, not for dist
    const gitLogCmd   = 'git'
    const gitLogArgs  = ['log', '--oneline', '-1']

    if (!forceNpm) {
      try {
        fs.statSync(dotGitPath).isDirectory()

        const ss = require('child_process')
                    .spawnSync(gitLogCmd, gitLogArgs, { cwd:  __dirname })

        if (ss.status !== 0) {
          throw new Error(ss.error)
        }

        const revision = ss.stdout
                          .toString()
                          .trim()
        return `#git[${revision}]`

      } catch (e) { /* fall safe */
        /**
         *  1. .git not exist
         *  2. git log fail
         */
        log.silly('Wechaty', 'version() form development environment is not availble: %s', e.message)
      }
    }

    return this.npmVersion
  }

  /**
   * @todo document me
   * @returns {Contact}
   * @deprecated
   */
  public user(): Contact {
    log.warn('Wechaty', 'user() DEPRECATED. use self() instead.')

    if (!this.puppet || !this.puppet.user) {
      throw new Error('no user')
    }
    return this.puppet.user
  }

  /**
   * @private
   */
  public async reset(reason?: string): Promise<void> {
    log.verbose('Wechaty', 'reset() because %s', reason)
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.reset(reason)
    return
  }

  /**
   * @todo document me
   */
  public async init(): Promise<void> {
    log.info('Wechaty', 'v%s initializing...' , this.version())
    log.verbose('Wechaty', 'puppet: %s'       , this.setting.puppet)
    log.verbose('Wechaty', 'head: %s'         , this.setting.head)
    log.verbose('Wechaty', 'profile: %s'      , this.setting.profile)
    log.verbose('Wechaty', 'uuid: %s'         , this.uuid)

    if (this.state.current() === 'ready') {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return
    }

    this.state.target('ready')
    this.state.current('ready', false)

    try {
      await this.initPuppet()
    } catch (e) {
      log.error('Wechaty', 'init() exception: %s', e && e.message)
      throw e
    }

    this.state.current('ready')
    return
  }

  // public on(event: WechatyEventName, listener: Function): this
  /**
   * @listens Wechaty#error
   * @param   {string}    [event='error'] - the `error` event name
   * @param   {Function}  listener        - (error) => void callback function
   * @return  {Wechaty}                   - this for chain
   */
  public on(event: 'error'      , listener: (this: Wechaty, error: Error) => void): this
  /**
   * @todo document me
   */
  public on(event: 'friend'     , listener: (this: Wechaty, friend: Contact, request?: FriendRequest) => void): this
  /**
   * @todo document me
   */
  public on(event: 'heartbeat'  , listener: (this: Wechaty, data: any) => void): this
  /**
   * @todo document me
   */
  public on(event: 'logout'     , listener: (this: Wechaty, user: Contact) => void): this
  /**
   * @todo document me
   */
  public on(event: 'login'      , listener: (this: Wechaty, user: Contact) => void): this
  /**
   * @todo document me
   */
  public on(event: 'message'    , listener: (this: Wechaty, message: Message) => void): this
  /**
   * @todo document me
   */
  public on(event: 'room-join'  , listener: (this: Wechaty, room: Room, inviteeList: Contact[],  inviter: Contact) => void): this
  /**
   * @todo document me
   */
  public on(event: 'room-leave' , listener: (this: Wechaty, room: Room, leaverList: Contact[]) => void): this
  /**
   * @todo document me
   */
  public on(event: 'room-topic' , listener: (this: Wechaty, room: Room, topic: string, oldTopic: string, changer: Contact) => void): this
  /**
   * @todo document me
   */
  public on(event: 'scan'       , listener: (this: Wechaty, url: string, code: number) => void): this
  /**
   * @todo document me
   */
  public on(event: 'EVENT_PARAM_ERROR', listener: () => void): this
  /**
   * @todo document me
   */

  public on(event: WechatyEventName, listener: Function): this {
    log.verbose('Wechaty', 'addListener(%s, %s)', event, typeof listener)

    // const thisWithSay: Sayable = {
    //   say: (content: string) => {
    //     return Config.puppetInstance()
    //                   .say(content)
    //   }
    // }

    super.on(event, listener) // `this: Wechaty` is Sayable

    // (...args) => {
    //
    //   return listener.apply(this, args)
    // })

    return this
  }

  /**
   * @todo document me
   * @private
   */
  public async initPuppet(): Promise<Puppet> {
    let puppet: Puppet

    if (!this.setting.head) {
      throw new Error('no head')
    }

    switch (this.setting.puppet) {
      case 'web':
        puppet = new PuppetWeb({
          head:     this.setting.head,
          profile:  this.setting.profile,
        })
        break

      default:
        throw new Error('Puppet unsupport(yet?): ' + this.setting.puppet)
    }

    const eventList: WechatyEventName[] = [
      'error',
      'friend',
      'heartbeat',
      'login',
      'logout',
      'message',
      'room-join',
      'room-leave',
      'room-topic',
      'scan',
    ]

    eventList.map(e => {
      // https://strongloop.com/strongblog/an-introduction-to-javascript-es6-arrow-functions/
      // We’ve lost () around the argument list when there’s just one argument (rest arguments are an exception, eg (...args) => ...)
      puppet.on(e, (...args: any[]) => {
        // this.emit(e, data)
        this.emit.apply(this, [e, ...args])
      })
    })

    // set puppet before init, because we need this.puppet if we quit() before init() finish
    this.puppet = <Puppet>puppet // force to use base class Puppet interface for better encapsolation

    // set puppet instance to Wechaty Static variable, for using by Contact/Room/Message/FriendRequest etc.
    Config.puppetInstance(puppet)

    await puppet.init()
    return puppet
  }

  /**
   * @todo document me
   */
  public async quit(): Promise<void> {
    log.verbose('Wechaty', 'quit()')

    if (this.state.current() !== 'ready' || this.state.inprocess()) {
      const err = new Error('quit() must run on a inited instance.')
      log.error('Wechaty', err.message)
      throw err
    }
    this.state.target('standby')
    this.state.current('standby', false)

    if (!this.puppet) {
      log.warn('Wechaty', 'quit() without this.puppet')
      return
    }

    const puppetBeforeDie = this.puppet
    this.puppet     = null
    Config.puppetInstance(null)

    await puppetBeforeDie.quit()
                        .catch(e => {
                          log.error('Wechaty', 'quit() exception: %s', e.message)
                          throw e
                        })
    this.state.current('standby')
    return
  }

  /**
   * @todo document me
   */
  public async logout(): Promise<void>  {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.logout()
                    .catch(e => {
                      log.error('Wechaty', 'logout() exception: %s', e.message)
                      throw e
                    })
    return
  }

  /**
   * get current user
   * @returns {Contact} current logined user
   */
  public self(): Contact {
    if (!this.puppet) {
      throw new Error('Wechaty.self() no puppet')
    }
    return this.puppet.self()
  }

  public async uploadMedia(stream: NodeJS.ReadableStream, filename: string, toUserName: string): Promise<string> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }

    if (!filename)
      throw new Error('no filename')

    let type = mime.lookup(filename)
    let ext = path.extname(filename)

    let mediatype
    switch (ext) {
      case 'bmp':
      case 'jpeg':
      case 'jpg':
      case 'png':
        mediatype = 'pic'
        break
      case 'mp4':
        mediatype = 'video'
        break
      default:
        mediatype = 'doc'
    }

    let buffer = <Buffer>await new Promise((resolve, reject) => {
      stream.pipe(bl((err, buf) => {
        if (err) reject(err)
        else resolve(buf)
      }))
    })

    let md5 = UtilLib.md5(buffer)

    let baseRequest = await this.puppet.getBaseRequest()
    let cookie = await (this.puppet as PuppetWeb).browser.readCookie()
    let first = cookie.find(c => c.name === 'webwx_data_ticket')
    let webwxDataTicket = first && first.value
    let size = buffer.length

    let uploadMediaRequest = {
      BaseRequest: baseRequest,
      FileMd5: md5,
      FromUserName: this.self().id,
      ToUserName: toUserName,
      UploadType: 2,
      ClientMediaId: +new Date,
      MediaType: 4,
      StartPos: 0,
      DataLen: size,
      TotalLen: size,
    }

    let formData = {
      id: 'WU_FILE_1',
      name: filename,
      type,
      lastModifiedDate: Date().toString(),
      size: size,
      mediatype,
      uploadmediarequest: JSON.stringify(uploadMediaRequest),
      webwx_data_ticket: webwxDataTicket,
      pass_ticket: '',
      filename: {
        value: buffer,
        options: {
          filename: filename,
          contentType: type,
          size: size,
        },
      },
    }

    let mediaId = await new Promise((resolve, reject) => {
      request.post({ url: 'https://file.wx2.qq.com/cgi-bin/mmwebwx-bin/webwxuploadmedia?f=json', formData }, function (err, res, body) {

        if (err) reject('err')
        else {
          let obj = JSON.parse(body)
          resolve(obj.MediaId)
        }
      })
    })

    return mediaId as string
  }

  public async sendMedia(message: Message): Promise<void> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.sendMedia(message)
      .catch(e => {
        log.error('Wechaty', 'send() exception: %s', e.message)
        throw e
      })
    return
  }

  /**
   * @todo document me
   */
  public async send(message: Message): Promise<void> {
    if (!this.puppet) {
      throw new Error('no puppet')
    }
    await this.puppet.send(message)
                      .catch(e => {
                        log.error('Wechaty', 'send() exception: %s', e.message)
                        throw e
                      })
    return
  }

  /**
   * @todo document me
   */
  public async say(content: string): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', content)

    if (!this.puppet) {
      throw new Error('no puppet')
    }
    this.puppet.say(content)
    return
  }

  /**
   * @todo document me
   * @static
   *
   */
  public static async sleep(millisecond: number): Promise<void> {
    await new Promise(resolve => {
      setTimeout(resolve, millisecond)
    })
  }

  /**
   * @todo document me
   * @private
   */
  public ding() {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding() // should return 'dong'
                      .catch(e => {
                        log.error('Wechaty', 'ding() exception: %s', e.message)
                        throw e
                      })
  }
}
