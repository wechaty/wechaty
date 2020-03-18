import {
  EventErrorPayload,
  EventLoginPayload,
  EventLogoutPayload,
  EventMessagePayload,
  EventScanPayload,
  MessageType,
  ScanStatus,
  FileBox,
}                     from 'wechaty-puppet'

import { PuppetHostie } from '../src/'

/**
 *
 * 1. Declare your Bot!
 *
 */
const puppet = new PuppetHostie()

/**
 *
 * 2. Register event handlers for Bot
 *
 */
puppet
  .on('logout', onLogout)
  .on('login',  onLogin)
  .on('scan',   onScan)
  .on('error',  onError)
  .on('message', onMessage)

/**
 *
 * 3. Start the bot!
 *
 */
puppet.start()
  .catch(async e => {
    console.error('Bot start() fail:', e)
    await puppet.stop()
    process.exit(-1)
  })

/**
 *
 * 4. You are all set. ;-]
 *
 */

/**
 *
 * 5. Define Event Handler Functions for:
 *  `scan`, `login`, `logout`, `error`, and `message`
 *
 */
function onScan (payload: EventScanPayload) {
  if (payload.qrcode) {
    // Generate a QR Code online via
    // http://goqr.me/api/doc/create-qr-code/
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(payload.qrcode),
    ].join('')

    console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  } else {
    console.info(`[${payload.status}] `, ScanStatus[payload.status])
  }
}

async function onLogin (payload: EventLoginPayload) {
  console.info(`${payload.contactId} login`)

  const contactPayload = await puppet.contactPayload(payload.contactId)
  console.info(`contact payload: ${JSON.stringify(contactPayload)}`)

  puppet.messageSendText(payload.contactId, 'Wechaty login').catch(console.error)
}

function onLogout (payload: EventLogoutPayload) {
  console.info(`${payload.contactId} logouted`)
}

function onError (payload: EventErrorPayload) {
  console.error('Bot error:', payload.data)
  /*
  if (bot.logonoff()) {
      bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  */
}

/**
 *
 * 6. The most important handler is for:
 *    dealing with Messages.
 *
 */
async function onMessage (payload: EventMessagePayload) {
  console.info(`onMessage(${payload.messageId})`)

  // const DEBUG: boolean = true
  // if (DEBUG) {
  //   return
  // }

  const messagePayload = await puppet.messagePayload(payload.messageId)
  console.info('messagePayload:', JSON.stringify(messagePayload))

  if (messagePayload.fromId) {
    const contactPayload = await puppet.contactPayload(messagePayload.fromId)
    console.info(`contactPayload(fromId:${messagePayload.fromId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.roomId) {
    const roomPayload = await puppet.roomPayload(messagePayload.roomId)
    console.info('roomPayload:', JSON.stringify(roomPayload))
  }

  if (messagePayload.toId) {
    const contactPayload = await puppet.contactPayload(messagePayload.toId)
    console.info(`contactPayload(toId:${messagePayload.toId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.fromId === puppet.selfId()) {
    console.info('skip self message')
    return
  }

  if (messagePayload.type === MessageType.Text
      && /^ding$/i.test(messagePayload.text || '')
  ) {
    let conversationId = messagePayload.roomId || messagePayload.fromId

    if (!conversationId) {
      throw new Error('no conversation id')
    }
    await puppet.messageSendText(conversationId, 'dong')

    const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
    await puppet.messageSendFile(conversationId, fileBox)
  }
}

/**
 *
 * 7. Output the Welcome Message
 *
 */
const welcome = `
Puppet Version: ${puppet}@${puppet.version()}

Please wait... I'm trying to login in...

`
console.info(welcome)

// async function loop () {
//   while (true) {
//     await new Promise(resolve => setTimeout(resolve, 1000))
//   }
// }

// loop()
