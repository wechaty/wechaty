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
// const util  = require('util')
// const fs    = require('fs')
// const co    = require('co')

import Config         from '../config'
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

const DEFAULT_PUPPET_PORT = 18788 // // W(87) X(88), ascii char code ;-]

class PuppetWeb extends Puppet {

  public browser:  Browser

  private bridge:   Bridge
  private server:   Server

  private port: number

  constructor(
      private head: string    = Config.head
    , private profile: string = null  // if not set profile, then do not store session.
  ) {
    super()
    // this.head     = head
    // this.profile  = profile

    // this.userId = null  // user id
    // this.user   = null  // <Contact> of user self

    this.on('watchdog', Watchdog.onFeed.bind(this))
  }

  public toString() { return `Class PuppetWeb({browser:${this.browser},port:${this.port}})` }

  public async init(): Promise<PuppetWeb> {
    log.verbose('PuppetWeb', `init() with head:${this.head}, profile:${this.profile}`)

    // this.readyState('connecting')
    this.targetState('live')
    this.currentState('birthing')

    // return co.call(this, function* () {
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

      this.emit('watchdog', { data: 'inited' })

      // return this
    // }).catch(e => {   // Reject
    } catch (e) {
      log.error('PuppetWeb', 'init exception: %s', e.message)
      this.quit()
      throw e
    }
    // .then(() => {   // Finally
      log.verbose('PuppetWeb', 'init() done')
      // this.readyState('connected')
      this.currentState('live')
      return this   // for Chaining
    // })
  }

  public quit() {
    log.verbose('PuppetWeb', 'quit()')
    this.targetState('dead')

    // if (this.readyState() === 'disconnecting') {
    if (this.currentState() === 'killing') {
      // log.warn('PuppetWeb', 'quit() is called but readyState is `disconnecting`?')
      log.warn('PuppetWeb', 'quit() is called but currentState is `killing`?')
      throw new Error('do not call quit again when quiting')
    }

    // POISON must feed before readyState set to "disconnecting"
    this.emit('watchdog', {
      data: 'PuppetWeb.quit()',
      type: 'POISON'
    })

    // this.readyState('disconnecting')
    this.currentState('killing')

    return co.call(this, function* () {

      if (this.bridge)  {
        yield this.bridge.quit()
                        .catch(e => { // fail safe
                          log.warn('PuppetWeb', 'quit() bridge.quit() exception: %s', e.message)
                        })
        log.verbose('PuppetWeb', 'quit() bridge.quit() this.bridge = null')
        this.bridge = null
      } else { log.warn('PuppetWeb', 'quit() without a bridge') }

      if (this.server) {
        yield this.server.quit()
        this.server = null
        log.verbose('PuppetWeb', 'quit() server.quit() this.server = null')
      } else { log.verbose('PuppetWeb', 'quit() without a server') }

      if (this.browser) {
        yield this.browser.quit()
                  .catch(e => { // fail safe
                    log.warn('PuppetWeb', 'quit() browser.quit() exception: %s', e.message)
                  })
        log.verbose('PuppetWeb', 'quit() server.quit() this.browser = null')
        this.browser = null
      } else { log.warn('PuppetWeb', 'quit() without a browser') }

      // @deprecated 20161004
      // log.verbose('PuppetWeb', 'quit() server.quit() this.initAttach(null)')
      // yield this.initAttach(null)

      this.currentState('dead')
    })
    .catch(e => { // Reject
      log.error('PuppetWeb', 'quit() exception: %s', e.message)
      this.currentState('dead')
      throw e
    })
    .then(() => { // Finally, Fail Safe
      log.verbose('PuppetWeb', 'quit() done')
      // this.readyState('disconnected')
      this.currentState('dead')
      return this   // for Chaining
    })
  }

  private initBrowser() {
    log.verbose('PuppetWeb', 'initBrowser()')
    const browser = new Browser({
      head: this.head
      , sessionFile: this.profile
    })

    browser.on('dead', Event.onBrowserDead.bind(this))

    this.browser = browser

    if (this.targetState() !== 'live') {
      log.warn('PuppetWeb', 'initBrowser() found targetState != live, no init anymore')
      return Promise.resolve('skipped')
    }

    return co.call(this, function* () {
      yield browser.init()
      return browser // follow func name meaning
    }).catch(e => {
      log.error('PuppetWeb', 'initBrowser() exception: %s', e.message)
      throw e
    })
  }

  private initBridge() {
    log.verbose('PuppetWeb', 'initBridge()')
    const bridge = new Bridge({
      puppet:   this // use puppet instead of browser, is because browser might change(die) duaring run time
      , port:   this.port
    })

    this.bridge = bridge

    if (this.targetState() !== 'live') {
      log.warn('PuppetWeb', 'initBridge() found targetState != live, no init anymore')
      return Promise.resolve('skipped')
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

  private initServer() {
    log.verbose('PuppetWeb', 'initServer()')
    const server = new Server({port: this.port})

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

    if (this.targetState() !== 'live') {
      log.warn('PuppetWeb', 'initServer() found targetState != live, no init anymore')
      return Promise.resolve('skipped')
    }

    return server.init()
                .catch(e => {
                  log.error('PuppetWeb', 'initServer() exception: %s', e.message)
                  throw e
                })
  }

  public reset(reason?: string) {
    log.verbose('PuppetWeb', 'reset(%s)', reason)

    if (this.browser) {
      this.browser.dead('restart required by reset()')
    } else {
      log.warn('PuppetWeb', 'reset() without browser')
    }
  }

  public self(message?: Message): boolean | Contact {
    if (!this.userId) {
      log.verbose('PuppetWeb', 'self() got no this.userId')
      return false
    }
    if (message && message.from()) {
      return this.userId === message.get('from')
    }
    return this.user
  }

  public send(message) {
    const to      = message.get('to')
    const room    = message.get('room')

    let content     = message.get('content')

    let destination = to
    if (room) {
      destination = room
      // TODO use the right @
      // if (to && to!==room) {
      //   content = `@[${to}] ${content}`
      // }

      if (!to) {
        message.set('to', room)
      }
    }

    log.silly('PuppetWeb', `send() destination: ${destination}, content: ${content})`)
    return this.bridge.send(destination, content)
                      .catch(e => {
                        log.error('PuppetWeb', 'send() exception: %s', e.message)
                        throw e
                      })
  }

  public reply(message, replyContent) {
    if (this.self(message)) {
      return Promise.reject(new Error('will not to reply message of myself'))
    }

    const m = new Message()
    .set('content'  , replyContent)

    .set('from'     , message.obj.to)
    .set('to'       , message.obj.from)
    .set('room'     , message.obj.room)

    // log.verbose('PuppetWeb', 'reply() by message: %s', util.inspect(m))
    return this.send(m)
                .catch(e => {
                  log.error('PuppetWeb', 'reply() exception: %s', e.message)
                  throw e
                })
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
  public ding(data) {
    if (!this.bridge) {
      return Promise.reject(new Error('ding fail: no bridge(yet)!'))
    }
    return this.bridge.ding(data)
                      .catch(e => {
                        log.warn('PuppetWeb', 'ding(%s) rejected: %s', data, e.message)
                        throw e
                      })
  }

  public contactFind(filterFunction: Function): Promise<string[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('contactFind fail: no bridge(yet)!'))
    }
    return this.bridge.contactFind(filterFunction)
                      .catch(e => {
                        log.warn('PuppetWeb', 'contactFind(%s) rejected: %s', filterFunction, e.message)
                        throw e
                      })
  }

  public roomFind(filterFunction: Function): Promise<string[]> {
    if (!this.bridge) {
      return Promise.reject(new Error('findRoom fail: no bridge(yet)!'))
    }
    return this.bridge.roomFind(filterFunction)
                      .catch(e => {
                        log.warn('PuppetWeb', 'roomFind(%s) rejected: %s', filterFunction, e.message)
                        throw e
                      })
  }

  public roomDel(room: Room, contact: Contact) {
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

  public roomAdd(room: Room, contact: Contact): Promise<any> {
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

  public roomTopic(room: Room, topic: string): Promise<any> {
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

  public roomCreate(contactList: Contact[], topic: string): Promise<string> {
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
