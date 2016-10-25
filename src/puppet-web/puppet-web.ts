/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb
 *
 * use to control wechat in web browser.
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 *
 * Class PuppetWeb
 *
 */
import {
    // Config
    ScanInfo
  , WatchdogFood
}                     from '../config'

import Contact        from '../contact'
// import FriendRequest  from '../friend-request'
import Message        from '../message'
import Puppet         from '../puppet'
import Room           from '../room'
import UtilLib        from '../util-lib'
import log            from '../brolog-env'

import Bridge         from './bridge'
import Browser        from './browser'
import Event          from './event'
import Server         from './server'
import Watchdog       from './watchdog'

export type PuppetWebSetting = {
  head?:    string
  profile?: string
}
const DEFAULT_PUPPET_PORT = 18788 // // W(87) X(88), ascii char code ;-]

export class PuppetWeb extends Puppet {

  public browser: Browser
  public bridge:  Bridge
  public server:  Server

  public scan: ScanInfo | null
  private port: number

  public lastScanEventTime: number
  public watchDogLastSaveSession: number
  public watchDogTimer: number
  public watchDogTimerTime: number

  constructor(public setting: PuppetWebSetting = {}) {
    super()

    this.on('watchdog', Watchdog.onFeed.bind(this))
  }

  public toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  public async init(): Promise<this> {
    log.verbose('PuppetWeb', `init() with head:${this.setting.head}, profile:${this.setting.profile}`)

    // this.targetState('live')
    // this.currentState('birthing')
    this.state.target('live')
    this.state.current('live', false)

    try {

      this.port = await UtilLib.getPort(DEFAULT_PUPPET_PORT)
      log.verbose('PuppetWeb', 'init() getPort %d', this.port)

      // @deprecated 20161004
      // yield this.initAttach(this)
      // log.verbose('PuppetWeb', 'initAttach() done')

      await this.initServer()
      log.verbose('PuppetWeb', 'initServer() done')

      await this.initBrowser()
      log.verbose('PuppetWeb', 'initBrowser() done')

      await this.initBridge()
      log.verbose('PuppetWeb', 'initBridge() done')

      const food: WatchdogFood = {
        data: 'inited'
        , timeout: 120000 // 2 mins for first login
      }
      this.emit('watchdog', food)

      log.verbose('PuppetWeb', 'init() done')
      // this.currentState('live')
      this.state.current('live')
      return this   // for Chaining

    } catch (e) {
      log.error('PuppetWeb', 'init() exception: %s', e.stack)
      await this.quit()
      throw e
    }
  }

  public async quit(): Promise<any> {
    log.verbose('PuppetWeb', 'quit()')
    // this.targetState('dead')

    // XXX should we set `target` to `dead` in `quit()`?
    this.state.target('dead')

    // if (this.currentState() === 'killing') {
    if (this.state.current() === 'dead' && this.state.inprocess()) {
      // log.warn('PuppetWeb', 'quit() is called but readyState is `disconnecting`?')
      log.warn('PuppetWeb', 'quit() is called but currentState is `killing`?')
      throw new Error('do not call quit again when quiting')
    }

    // POISON must feed before readyState set to "disconnecting"
    this.emit('watchdog', {
      data: 'PuppetWeb.quit()',
      type: 'POISON'
    })

    // this.currentState('killing')
    this.state.current('dead', false)

    // return co.call(this, function* () {
    try {

      if (this.bridge)  { // TODO use StateMonitor
        await this.bridge.quit()
                        .catch(e => { // fail safe
                          log.warn('PuppetWeb', 'quit() bridge.quit() exception: %s', e.message)
                        })
        log.verbose('PuppetWeb', 'quit() bridge.quit() this.bridge = null')
        // this.bridge = null
      } else { log.warn('PuppetWeb', 'quit() without a bridge') }

      if (this.server) { // TODO use StateMonitor
        await this.server.quit()
        // this.server = null
        log.verbose('PuppetWeb', 'quit() server.quit() this.server = null')
      } else { log.verbose('PuppetWeb', 'quit() without a server') }

      if (this.browser) { // TODO use StateMonitor
        await this.browser.quit()
                  .catch(e => { // fail safe
                    log.warn('PuppetWeb', 'quit() browser.quit() exception: %s', e.message)
                  })
        log.verbose('PuppetWeb', 'quit() server.quit() this.browser = null')
        // this.browser = null
      } else { log.warn('PuppetWeb', 'quit() without a browser') }

      // @deprecated 20161004
      // log.verbose('PuppetWeb', 'quit() server.quit() this.initAttach(null)')
      // await this.initAttach(null)

      // this.currentState('dead')
      this.state.current('dead')
    // }).catch(e => { // Reject
    } catch (e) {
      log.error('PuppetWeb', 'quit() exception: %s', e.message)
      // this.currentState('dead')
      this.state.current('dead')
      throw e
    }

    // .then(() => { // Finally, Fail Safe
      log.verbose('PuppetWeb', 'quit() done')
      // this.currentState('dead')
      this.state.current('dead')
      return this   // for Chaining
    // })
  }

  public async initBrowser(): Promise<Browser> {
    log.verbose('PuppetWeb', 'initBrowser()')
    const browser = new Browser({
        head:         this.setting.head
      , sessionFile:  this.setting.profile
    })

    browser.on('dead', Event.onBrowserDead.bind(this))

    this.browser = browser

    // if (this.targetState() !== 'live') {
    if (this.state.target() !== 'live') {
      log.warn('PuppetWeb', 'initBrowser() found targetState != live, no init anymore')
      // return Promise.resolve('skipped')
      return Promise.reject('skipped')
    }

    // return co.call(this, function* () {
    try {
      await browser.init()
    // }).catch(e => {
    } catch (e) {
      log.error('PuppetWeb', 'initBrowser() exception: %s', e.message)
      throw e
    }
    return browser // follow func name meaning
  }

  public initBridge(): Promise<Bridge> {
    log.verbose('PuppetWeb', 'initBridge()')
    const bridge = new Bridge(
        this // use puppet instead of browser, is because browser might change(die) duaring run time
      , this.port
    )

    this.bridge = bridge

    // if (this.targetState() !== 'live') {
    if (this.state.target() !== 'live') {
      const errMsg = 'initBridge() found targetState != live, no init anymore'
      log.warn('PuppetWeb', errMsg)
      return Promise.reject(errMsg)
    }

    return bridge.init()
                .catch(e => {
                  if (!this.browser) {
                    log.warn('PuppetWeb', 'initBridge() without browser?')
                  } else if (this.browser.dead()) {
                    log.warn('PuppetWeb', 'initBridge() found browser dead, wait it to restore')
                  } else {
                    log.error('PuppetWeb', 'initBridge() exception: %s', e.message)
                    throw e
                  }
                })
  }

  private initServer(): Promise<Server> {
    log.verbose('PuppetWeb', 'initServer()')
    const server = new Server(this.port)

    server.on('scan'    , Event.onServerScan.bind(this))
    server.on('login'   , Event.onServerLogin.bind(this))
    server.on('logout'  , Event.onServerLogout.bind(this))
    server.on('message' , Event.onServerMessage.bind(this))

    /**
     * @depreciated 20160825 zixia
     *
     * when `unload` there should always be a `disconnect` event?
     */
    // server.on('unload'  , Event.onServerUnload.bind(this))

    server.on('connection', Event.onServerConnection.bind(this))
    server.on('disconnect', Event.onServerDisconnect.bind(this))
    server.on('log'       , Event.onServerLog.bind(this))
    server.on('ding'      , Event.onServerDing.bind(this))

    this.server = server

    // if (this.targetState() !== 'live') {
    if (this.state.target() !== 'live') {
      const errMsg = 'initServer() found targetState != live, no init anymore'
      log.warn('PuppetWeb', errMsg)
      return Promise.reject(errMsg)
    }

    return server.init()
                .catch(e => {
                  log.error('PuppetWeb', 'initServer() exception: %s', e.message)
                  throw e
                })
  }

  public reset(reason?: string): void {
    log.verbose('PuppetWeb', 'reset(%s)', reason)

    if (this.browser) {
      this.browser.dead('restart required by reset()')
    } else {
      log.warn('PuppetWeb', 'reset() without browser')
    }
  }

  /**
   * @deprecated
   * use Message.self() instead
   */
  public self(message: Message): boolean {
    log.warn('PuppetWeb', 'self() method deprecated. use Message.self() instead')

    if (!this.userId) {
      log.warn('PuppetWeb', 'self() got no this.userId')
      throw new Error('no message or from')
    }
    if (!message || !message.from()) {
      log.warn('PuppetWeb', 'self() got no message or from')
      throw new Error('no message or from')
    }
    return this.userId === message.from().id
  }

  public send(message: Message) {
    const to      = message.to()
    const room    = message.room()

    let content     = message.content()

    let destination: Contact|Room = to
    if (room) {
      destination = room
      // TODO use the right @
      // if (to && to!==room) {
      //   content = `@[${to}] ${content}`
      // }

      if (!to) {
        message.to(room)
      }
    }

    log.silly('PuppetWeb', 'send() destination: %s, content: %s)'
                          , room ? room.topic() : (to as Contact).name()
                          , content
    )
    return this.bridge.send(destination.id, content)
                      .catch(e => {
                        log.error('PuppetWeb', 'send() exception: %s', e.message)
                        throw e
                      })
  }

  /**
   * Bot say...
   * send to `filehelper` for notice / log
   */
  public say(content: string) {
    const m = new Message()
    m.to('filehelper')
    m.content(content)

    return this.send(m)
  }

  // @deprecated
  public reply(message: Message, replyContent: string) {
    log.warn('PuppetWeb', 'reply() @deprecated, please use Message.say()')
    if (this.self(message)) {
      return Promise.reject(new Error('will not to reply message of myself'))
    }
    return message.say(replyContent)
  }

  /**
   * logout from browser, then server will emit `logout` event
   */
  public logout() {
    return this.bridge.logout()
                      .catch(e => {
                        log.error('PuppetWeb', 'logout() exception: %s', e.message)
                        throw e
                      })
  }

  public getContact(id: string): Promise<any> {
    if (!this.bridge) {
      throw new Error('PuppetWeb has no bridge for getContact()')
    }

    return this.bridge.getContact(id)
                      .catch(e => {
                        log.error('PuppetWeb', 'getContact(%d) exception: %s', id, e.message)
                        throw e
                      })
  }
  public logined() { return !!(this.user) }
  public ding(data?: any): Promise<string> {
    if (!this.bridge) {
      return Promise.reject(new Error('ding fail: no bridge(yet)!'))
    }
    return this.bridge.ding(data)
                      .catch(e => {
                        log.warn('PuppetWeb', 'ding(%s) rejected: %s', data, e.message)
                        throw e
                      })
  }

  public contactFind(filterFunc: string): Promise<Contact[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('contactFind fail: no bridge(yet)!'))
    }
    return this.bridge.contactFind(filterFunc)
                      .then(idList => idList.map(id => Contact.load(id)))
                      .catch(e => {
                        log.warn('PuppetWeb', 'contactFind(%s) rejected: %s', filterFunc, e.message)
                        throw e
                      })
  }

  public roomFind(filterFunc: string): Promise<Room[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('findRoom fail: no bridge(yet)!'))
    }
    return this.bridge.roomFind(filterFunc)
                      .then(idList => idList.map(id => Room.load(id)))
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomFind(%s) rejected: %s', filterFunc, e.message)
                        throw e
                      })
  }

  public roomDel(room: Room, contact: Contact): Promise<number> {
    if (!this.bridge) {
      return Promise.reject(new Error('roomDelMember fail: no bridge(yet)!'))
    }
    const roomId    = room.id
    const contactId = contact.id
    return this.bridge.roomDelMember(roomId, contactId)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomDelMember(%s, %d) rejected: %s', roomId, contactId, e.message)
                        throw e
                      })
  }

  public roomAdd(room: Room, contact: Contact): Promise<number> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }
    const roomId    = room.id
    const contactId = contact.id
    return this.bridge.roomAddMember(roomId, contactId)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomAddMember(%s) rejected: %s', contact, e.message)
                        throw e
                      })
  }

  public roomTopic(room: Room, topic: string): Promise<string> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }
    if (!room || typeof topic === 'undefined') {
      return Promise.reject(new Error('room or topic not found'))
    }

    const roomId = room.id
    return this.bridge.roomModTopic(roomId, topic)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomTopic(%s) rejected: %s', topic, e.message)
                        throw e
                      })
  }

  public roomCreate(contactList: Contact[], topic: string): Promise<Room> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contactList || ! contactList.map) {
      throw new Error('contactList not found')
    }

    const contactIdList = contactList.map(c => c.id)

// console.log('puppet roomCreate: ')
// console.log(contactIdList)
    return this.bridge.roomCreate(contactIdList, topic)
                      .then(roomId => Room.load(roomId))
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomCreate(%s, %s) rejected: %s', contactIdList.join(','), topic, e.message)
                        throw e
                      })
  }

  /**
   * FriendRequest
   */
  public friendRequestSend(contact: Contact, hello: string): Promise<any> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contact) {
      throw new Error('contact not found')
    }

    return this.bridge.verifyUserRequest(contact.id, hello)
                      .catch(e => {
                        log.warn('PuppetWeb', 'bridge.verifyUserRequest(%s, %s) rejected: %s', contact.id, hello, e.message)
                        throw e
                      })
  }

  public friendRequestAccept(contact: Contact, ticket: string): Promise<any> {
    if (!this.bridge) {
      return Promise.reject(new Error('fail: no bridge(yet)!'))
    }

    if (!contact || !ticket) {
      throw new Error('contact or ticket not found')
    }

    return this.bridge.verifyUserOk(contact.id, ticket)
                      .catch(e => {
                        log.warn('PuppetWeb', 'bridge.verifyUserOk(%s, %s) rejected: %s', contact.id, ticket, e.message)
                        throw e
                      })
  }
}

// module.exports = PuppetWeb.default = PuppetWeb.PuppetWeb = PuppetWeb
export default PuppetWeb
