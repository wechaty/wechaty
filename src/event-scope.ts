/**
 *
 * Wechaty: Wechat for ChatBots.
 *
 * Class WechatyEvent
 *
 * Licenst: ISC
 * https://github.com/wechaty/wechaty
 *
 * Events Function Wrapper
 *
 */
import Config  from './config'
import Contact from './contact'
import Message from './message'
import Room    from './room'
import Wechaty from './wechaty'

import log     from './brolog-env'

type WechatyEventScope = {
  say: (content: string, replyTo?: Contact|Contact[]) => void
}

type WechatyEventType =   'error'     | 'heartbeat'
                        | 'login'     | 'logout'
                        | 'message'   | 'scan'        | 'friend'
                        | 'room-join' | 'room-leave'  | 'room-topic'

const EVENT_CONFIG = {
  error:          wrapFilehelper
  , friend:       wrapContact
  , heartbeat:    wrapFilehelper
  , login:        wrapFilehelper
  , logout:       null  // NULL
  , message:      wrapMessage
  , 'room-join':  wrapRoom
  , 'room-leave': wrapRoom
  , 'room-topic': wrapRoom
  , scan:         null  // NULL
}

class EventScope {
  public static list() {
    return Object.keys(EVENT_CONFIG)
  }

  public static wrap(this: Wechaty|Room, event: WechatyEventType, listener: Function): Function {
    log.verbose('WechatyEvent', 'wrap(%s, %s)', event, typeof listener)

    if (typeof listener !== 'function') {
      throw new Error('`listener` should be function')
    }

    if (!(event in EVENT_CONFIG)) {
      throw new Error('event not support: ' + event)
    }
    const wrapper = EVENT_CONFIG[event]

    /**
     * We assign a empty object to each event listener,
     * to carry the indenpendent scope
     */
    if (wrapper) {
      return wrapper(listener)
    } else {
      return listener
    }
  }
}

function isContact(contact) {
  if (contact.map && contact[0] instanceof Contact) {
    return true
  } else if (contact instanceof Contact) {
    return true
  }
  return false
}

function isRoom(room) {
  /**
   * here not use `instanceof Room` is because circular dependence problem...
   */
  if (!room || !room.constructor
      || room.constructor.name !== 'Room') {
    return false
  }
  return true
}

function wrapContact(listener) {
  log.verbose('WechatyEvent', 'wrapContact()')

  return (...argList) => {
    log.silly('WechatyEvent', 'wrapContact() listener')

    if (!isContact(argList[0])) {
      throw new Error('contact not found in argList')
    }

    const contact = argList[0]

    const eventScope = <WechatyEventScope>{}
    eventScope.say = (content) => {
      const msg = new Message()
      msg.to(contact)
      msg.content(content)
      return Config.puppetInstance()
                    .send(msg)
    }

    return listener.apply(eventScope, argList)
  }
}

function wrapRoom(listener) {
  log.verbose('WechatyEvent', 'wrapRoom()')

  return (room: Room, ...argList) => {
    log.silly('WechatyEvent', 'wrapRoom(%s, %s, %s, %s) listener', room.topic(), argList[0], argList[1], argList[2])

    let contact
    for (let arg of argList) {
      if (!contact && isContact(arg)) {
        contact = arg
      }
    }

    if (!room || !isRoom(room) || !contact) {
      throw new Error('room or contact not found')
    }

    const eventScope = <WechatyEventScope>{}
    eventScope.say = (content: string, replyTo?: Contact) => {
      if (!replyTo) {
        replyTo = contact
      } else if (!isContact(replyTo)) {
        throw new Error('replyTo is not Contact instance(s)')
      }
      return room.say(content, replyTo)
    }

    return listener.apply(eventScope, [room, ...argList])
  }
}

function wrapMessage(listener) {
  log.verbose('WechatyEvent', 'wrapMessage()')

  return (...argList) => {
    log.silly('WechatyEvent', 'wrapMessage() listener')

    // console.log('############### wrapped on message listener')
    // console.log(typeof Message)
    // console.log(argList)
    if (!(argList[0] instanceof Message)) {
      throw new Error('Message instance not found')
    }

    const msg       = argList[0]

    const sender    = msg.from()
    // const receiver  = msg.to()
    const room      = msg.room()

    const eventScope = <WechatyEventScope>{}
    eventScope.say = (content, replyTo) => {
      log.silly('WechatyEvent', 'wrapMessage() say("%s", "%s")', content, replyTo)

      if (room) {
        return room.say(content, replyTo)
      }

      const m = new Message()
      m.to(sender)
      m.content(content)

      return Config.puppetInstance()
                    .send(m)
    }

    return listener.apply(eventScope, argList)
  }
}

function wrapFilehelper(listener) {
  log.verbose('WechatyEvent', 'wrapFilehelper()')

  return (...argList) => {
    log.silly('WechatyEvent', 'wrapFilehelper() listener')
    const eventScope = <WechatyEventScope>{}
    eventScope.say = (content) => {
      log.silly('WechatyEvent', 'wrapFilehelper() say(%s)', content)
      const msg = new Message()
      msg.to('filehelper')
      msg.content(content)
      return Config.puppetInstance()
                    .send(msg)
    }

    return listener.apply(eventScope, argList)
  }
}

// module.exports = WechatyEvent.default = WechatyEvent
export default EventScope
