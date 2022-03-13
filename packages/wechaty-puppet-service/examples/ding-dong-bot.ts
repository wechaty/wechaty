import * as PUPPET  from 'wechaty-puppet'
import { FileBox } from 'file-box'

import { PuppetService } from '../src/mod.js'

/**
 *
 * 1. Declare your Bot!
 *
 */
const puppet = new PuppetService()

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
function onScan (payload: PUPPET.payloads.EventScan) {
  if (payload.qrcode) {
    const qrcodeImageUrl = [
      'https://wechaty.js.org/qrcode/',
      encodeURIComponent(payload.qrcode),
    ].join('')

    console.info(`[${payload.status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  } else {
    console.info(`[${payload.status}] `, PUPPET.types.ScanStatus[payload.status])
  }
}

async function onLogin (payload: PUPPET.payloads.EventLogin) {
  console.info(`${payload.contactId} login`)

  const contactPayload = await puppet.contactPayload(payload.contactId)
  console.info(`contact payload: ${JSON.stringify(contactPayload)}`)

  puppet.messageSendText(payload.contactId, 'Wechaty login').catch(console.error)
}

function onLogout (payload: PUPPET.payloads.EventLogout) {
  console.info(`${payload.contactId} logouted`)
}

function onError (payload: PUPPET.payloads.EventError) {
  console.error('Bot error:', payload.data)
  /*
  if (bot.isLoggedIn) {
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
async function onMessage (payload: PUPPET.payloads.EventMessage) {
  console.info(`onMessage(${payload.messageId})`)

  // const DEBUG: boolean = true
  // if (DEBUG) {
  //   return
  // }

  const messagePayload = await puppet.messagePayload(payload.messageId)
  console.info('messagePayload:', JSON.stringify(messagePayload))

  if (messagePayload.talkerId) {
    const contactPayload = await puppet.contactPayload(messagePayload.talkerId)
    console.info(`contactPayload(talkerId:${messagePayload.talkerId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.roomId) {
    const roomPayload = await puppet.roomPayload(messagePayload.roomId)
    console.info('roomPayload:', JSON.stringify(roomPayload))
  }

  if (messagePayload.listenerId) {
    const contactPayload = await puppet.contactPayload(messagePayload.listenerId)
    console.info(`contactPayload(listenerId:${messagePayload.listenerId}):`, JSON.stringify(contactPayload))
  }

  if (messagePayload.talkerId === puppet.currentUserId) {
    console.info('skip self message')
    return
  }

  if (messagePayload.type === PUPPET.types.Message.Text
      && /^ding$/i.test(messagePayload.text || '')
  ) {
    const conversationId = messagePayload.roomId || messagePayload.talkerId

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
