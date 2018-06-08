/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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
// import * as fs    from 'fs'
import path  from 'path'

/* tslint:disable:variable-name */
import QrcodeTerminal  from 'qrcode-terminal'
// import finis                from 'finis'
import { FileBox }          from 'file-box'

/**
 * Change `import { ... } from '../'`
 * to     `import { ... } from 'wechaty'`
 * when you are runing with Docker or NPM instead of Git Source.
 */
import {
  Wechaty,
  log,
  // Contact,
  // Room,
}               from '../src/'

const BOT_QR_CODE_IMAGE_FILE = path.resolve(
  __dirname,
  '../docs/images/bot-qr-code.png',
)

const bot = Wechaty.instance()

const welcome = `
| __        __        _           _
| \\ \\      / /__  ___| |__   __ _| |_ _   _
|  \\ \\ /\\ / / _ \\/ __| '_ \\ / _\` | __| | | |
|   \\ V  V /  __/ (__| | | | (_| | |_| |_| |
|    \\_/\\_/ \\___|\\___|_| |_|\\__,_|\\__|\\__, |
|                                     |___/

=============== Powered by Wechaty ===============
-------- https://github.com/chatie/wechaty --------
                Version: ${bot.version(true)}

I'm a bot, my superpower is talk in Wechat.

If you send me a 'ding', I will reply you a 'dong'!
__________________________________________________

Hope you like it, and you are very welcome to
upgrade me to more superpowers!

Please wait... I'm trying to login in...

`

console.log(welcome)

bot
.on('logout'	, user => log.info('Bot', `${user.name()} logouted`))
.on('login'	  , user => {
  log.info('Bot', `${user.name()} login`)
  bot.say('Wechaty login').catch(console.error)
})
.on('scan', (qrData, status, data) => {
  QrcodeTerminal.generate(qrData, { small: true }, (asciiArt: string) => {
    console.log(asciiArt)
    console.log(`[${status}] Scan QR Code above url to log in: `)
    if (data) {
      console.log(data)
    }
  })
})
.on('message', async msg => {
  if (msg.type() !== bot.Message.Type.Text) {
    return
  }

  try {
    console.log(msg.toString()) // on(message) exception: Error: no file
    const text = msg.text()
    const from = msg.from()

    const nameList: string[] = []
    // console.log('msg text:', text.substr(0, 20))

    // Room.findAll()
    if (/^testRoom$/.test(text)) {
      console.log('before findAll')
      const roomList = await bot.Room.findAll()
      await from.say('roomList: ' + (roomList && roomList.length))
      for (const room of roomList) {
        nameList.push(room.topic())
      }
      from.say(nameList.join() || 'not found')
      return
    }

    // Contact.findAll()
    if (/^testContact$/.test(text)) {
      const contactList = await bot.Contact.findAll()
      for (let i = 0; i < 5; i ++) {
        const contact = contactList[i]
        console.log(`begin to test num ${i} contact`)
        console.log(contact)
        nameList.push(contact.name())
      }
      from.say(nameList.join())
      return
    }

    if (/^fcontact$/.test(text)) {
      console.log('begin to check msg forward contact')
      // const contact = await bot.Contact.find({
      //   name: /李佳芮/,
      // })
      const contact = await bot.Contact.load('qq512436430')
      if (!contact) {
        console.error('contact not found')
        return
      }
      msg.forward(contact)
      return
    }

    if (/^froom$/.test(text)) {
      console.log('begin to check msg forward room')
      const room = bot.Room.load('6350854677@chatroom')
      msg.forward(room)
      return
    }

    if (/^geta$/.test(text)) {
      console.log('begin to check get contact alias')
      from.say(from.alias() || 'no alias')
      return
    }

    if (/^seta$/.test(text)) {
      console.log('begin to check set contact alias')
      await from.alias('wechaty-alias')
      setTimeout(() => {
        from.say(from.alias() || 'no alais')
      }, 3 * 1000)
      return
    }

    if (/^avatar$/.test(text)) {
      console.log('begin to check get contact avatar')
      const file = await from.avatar()
      from.say(file)
      return
    }

    if (/^delroom$/.test(text)) {
      console.log('begin to check roomDel')
      const room = bot.Room.load('6350854677@chatroom')
      const contact = bot.Contact.load('qq512436430')
      await room.del(contact)
      from.say('room.del: ' + room + ', ' + contact)
      return
    }

    if (/^addroom$/.test(text)) {
      console.log('begin to check roomAdd')
      const room = bot.Room.load('6350854677@chatroom')
      const contact = bot.Contact.load('qq512436430')
      await room.add(contact)
      from.say('room.add: ' + room + ', ' + contact)

      return
    }

    if (/^topicroom$/.test(text)) {
      console.log('begin to check roomTopic')
      const room = bot.Room.load('6350854677@chatroom')
      await room.topic('change-to-wechaty')
      from.say('room.topic: ' + room)

      return
    }

    if (/^quitroom$/.test(text)) {
      console.log('begin to check roomQuit')
      const room = bot.Room.load('6350854677@chatroom')
      await room.quit()

      from.say('room.quit: ' + room)

      return
    }

    if (/^(ding|ping|bing|code)$/i.test(msg.text()) /*&& !msg.self()*/) {
      /**
       * 1. reply 'dong'
       */
      log.info('Bot', 'REPLY: dong')
      msg.say('dong')

      const joinWechaty =  `Join Wechaty Developers' Community\n\n` +
                            `Wechaty is used in many ChatBot projects by hundreds of developers.\n\n` +
                            `If you want to talk with other developers, just scan the following QR Code in WeChat with secret code: wechaty,\n\n` +
                            `you can join our Wechaty Developers' Home at once`
      await msg.say(joinWechaty)

      /**
       * 2. reply qrcode image
       */
      const fileBox = FileBox.fromFile(BOT_QR_CODE_IMAGE_FILE)
      // const fileBox = FileBox.packStream(
      //   fs.createReadStream(BOT_QR_CODE_IMAGE_FILE),
      //   BOT_QR_CODE_IMAGE_FILE,
      // )

      log.info('Bot', 'REPLY: %s', fileBox)
      await msg.say(fileBox)

      /**
       * 3. reply 'scan now!'
       */
      await msg.say('Scan now, because other Wechaty developers want to talk with you too!\n\n(secret code: wechaty)')

    }
  } catch (e) {
    log.error('Bot', 'on(message) exception: %s' , e)
    console.error(e)
  }
})

bot.on('error', async e => {
  log.error('Bot', 'error: %s', e)
  if (bot.logonoff()) {
    await bot.say('Wechaty error: ' + e.message).catch(console.error)
  }
  // await bot.stop()
})

// let killChrome: NodeJS.SignalsListener

bot.start()
.then(() => {
  const listenerList = process.listeners('SIGINT')
  for (const listener of listenerList) {
    if (listener.name === 'killChrome') {
      process.removeListener('SIGINT', listener)
      // killChrome = listener
    }
  }
})
.catch(e => {
  log.error('Bot', 'start() fail: %s', e)
  bot.stop()
  process.exit(-1)
})

// let quiting = false
// finis((code, signal) => {
//   log.info('Bot', 'finis(%s, %s)', code, signal)

//   if (!bot.logonoff()) {
//     log.info('Bot', 'finis() bot had been already stopped')
//     doExit(code)
//   }

//   if (quiting) {
//     log.warn('Bot', 'finis() already quiting... return and wait...')
//     return
//   }

//   quiting = true
//   let done = false
//   // let checkNum = 0

//   const exitMsg = `Wechaty will exit ${code} because of ${signal} `

//   log.info('Bot', 'finis() broadcast quiting message for bot')
//   bot.say(exitMsg)
//       // .then(() => bot.stop())
//       .catch(e => log.error('Bot', 'finis() catch rejection: %s', e))
//       .then(() => done = true)

//   setImmediate(checkForExit)

//   function checkForExit() {
//     // if (checkNum++ % 100 === 0) {
//     log.info('Bot', 'finis() checkForExit() checking done: %s', done)
//     // }
//     if (done) {
//       log.info('Bot', 'finis() checkForExit() done!')
//       setTimeout(() => doExit(code), 1000)  // delay 1 second
//       return
//     }
//     // death loop to wait for `done`
//     // process.nextTick(checkForExit)
//     // setImmediate(checkForExit)
//     setTimeout(checkForExit, 100)
//   }
// })

// function doExit(code: number): void {
//   log.info('Bot', 'doExit(%d)', code)
//   if (killChrome) {
//     killChrome('SIGINT')
//   }
//   process.exit(code)
// }

// process.on('SIGINT', function() {
//   console.log('Nice SIGINT-handler')
//   const listeners = process.listeners('SIGINT')
//   for (let i = 0; i < listeners.length; i++) {
//       console.log(listeners[i].toString())
//   }
// })
