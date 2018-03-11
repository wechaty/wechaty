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

/**
 *   This is an example to show how a simple bot runs under
 *   both Telegram and WeChat and shares the same code.
 *
 *   For more information: https://github.com/hczhcz/wechaty-telegram
 */

const TelegramBot = require('node-telegram-bot-api')
const WechatyTelegramBot = require('wechaty-telegram')

const initBot = (ChatBot, token) => {
  const bot = new ChatBot(token, {
    // the "polling" option applies for a Telegram bot
    // for WeChat bot, "polling" and "webhook" works in the same way
    polling: true,
    // options for Wechaty and Wechaty Telegram Bot Adaptor
    wechaty: {
      // if you do not want your bot to add a friend automatically
      autoFriend: false
    }
  })

  let roger = 'roger'

  bot.on('message', msg => {
    bot.sendMessage(msg.chat.id, roger) // send roger
  })

  // use regular expressions to detect commands
  bot.onText(/^\/setroger (.*)$/, (msg, match) => {
    roger = match[1] // set roger message from user's input
  })
}

initBot(TelegramBot, '123456:TOKEN') // you may obtain a Telegram bot token
initBot(WechatyTelegramBot, 'mybot') // you can use your bot's name as a token here
