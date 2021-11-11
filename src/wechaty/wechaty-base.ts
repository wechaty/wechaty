/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
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
import {
  serviceCtlMixin,
}                       from 'state-switch'
import { function as FP } from 'fp-ts'

import {
  config,
  log,
  VERSION,
}                       from '../config.js'

import type {
  SayableSayer,
  Sayable,
}                             from '../sayable/mod.js'
import {
  gErrorMixin,
  ioMixin,
  loginMixin,
  miscMixin,
  pluginMixin,
  puppetMixin,
  wechatifyUserModuleMixin,
}                             from '../wechaty-mixins/mod.js'

import {
  WechatySkeleton,
}                             from './wechaty-skeleton.js'
import type {
  WechatyInterface,
}                             from './wechaty-impl.js'
import type {
  WechatyOptions,
}                             from './schema.js'

/**
 * Huan(2022111) `pluginMixin` is not compatible with `pipe`: will get `unknown`
 *  because it import-ed the `WechatyInterface` which is depended on the WechatyImpl
 *  caused circle dependency.
 *
 * TODO: put `pluginMixin` back into the `pipe()` argument list
 */
const mixinBase = pluginMixin(
  FP.pipe(
    WechatySkeleton,
    gErrorMixin,
    wechatifyUserModuleMixin,
    puppetMixin,
    loginMixin,
    miscMixin,
    ioMixin,
    serviceCtlMixin('Wechaty', { log }),
    // TODO: move it back to here -> pluginMixin,
  ),
)

/**
 * Huan(2021211): Keep the below call back hell
 *  because it's easy for testing
 *  especially when there's some typing mismatch and we need to figure it out.
 */
// const mixinTest = serviceCtlMixin('Wechaty', { log })(
//   pluginMixin(
//     puppetMixin(
//       wechatifyUserModuleMixin(
//         gErrorMixin(
//           WechatySkeleton,
//         ),
//       ),
//     ),
//   ),
// )

/**
 * Main bot class.
 *
 * A `Bot` is a WeChat client depends on which puppet you use.
 * It may equals
 * - web-WeChat, when you use: [puppet-puppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer)/[puppet-wechat4u](https://github.com/wechaty/wechaty-puppet-wechat4u)
 * - ipad-WeChat, when you use: [puppet-padchat](https://github.com/wechaty/wechaty-puppet-padchat)
 * - ios-WeChat, when you use: puppet-ioscat
 *
 * See more:
 * - [What is a Puppet in Wechaty](https://github.com/wechaty/wechaty-getting-started/wiki/FAQ-EN#31-what-is-a-puppet-in-wechaty)
 *
 * > If you want to know how to send message, see [Message](#Message) <br>
 * > If you want to know how to get contact, see [Contact](#Contact)
 *
 * @example <caption>The World's Shortest ChatBot Code: 6 lines of JavaScript</caption>
 * import { WechatyBuilder } from 'wechaty'
 * const bot = WechatyBuilder.build()
 * bot.on('scan',    (qrCode, status) => console.log('https://wechaty.js.org/qrcode/' + encodeURIComponent(qrcode)))
 * bot.on('login',   user => console.log(`User ${user} logged in`))
 * bot.on('message', message => console.log(`Message: ${message}`))
 * bot.start()
 */
class WechatyBase extends mixinBase implements SayableSayer {

  static   override readonly VERSION = VERSION
  readonly wechaty : WechatyInterface

  readonly _cleanCallbackList: Function[] = []

  /**
   * The term [Puppet](https://github.com/wechaty/wechaty/wiki/Puppet) in Wechaty is an Abstract Class for implementing protocol plugins.
   * The plugins are the component that helps Wechaty to control the WeChat(that's the reason we call it puppet).
   * The plugins are named XXXPuppet, for example:
   * - [PuppetPuppeteer](https://github.com/wechaty/wechaty-puppet-puppeteer):
   * - [PuppetPadchat](https://github.com/wechaty/wechaty-puppet-padchat)
   *
   * @typedef    PuppetModuleName
   * @property   {string}  PUPPET_DEFAULT
   * The default puppet.
   * @property   {string}  wechaty-puppet-wechat4u
   * The default puppet, using the [wechat4u](https://github.com/nodeWechat/wechat4u) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  wechaty-puppet-padchat
   * - Using the WebSocket protocol to connect with a Protocol Server for controlling the iPad WeChat program.
   * @property   {string}  wechaty-puppet-puppeteer
   * - Using the [google puppeteer](https://github.com/GoogleChrome/puppeteer) to control the [WeChat Web API](https://wx.qq.com/) via a chrome browser.
   * @property   {string}  wechaty-puppet-mock
   * - Using the mock data to mock wechat operation, just for test.
   */

  /**
   * The option parameter to create a wechaty instance
   *
   * @typedef    WechatyOptions
   * @property   {string}                 name            -Wechaty Name. </br>
   *          When you set this: </br>
   *          `new Wechaty({name: 'wechaty-name'}) ` </br>
   *          it will generate a file called `wechaty-name.memory-card.json`. </br>
   *          This file stores the login information for bot. </br>
   *          If the file is valid, the bot can auto login so you don't need to scan the qrCode to login again. </br>
   *          Also, you can set the environment variable for `WECHATY_NAME` to set this value when you start. </br>
   *          eg:  `WECHATY_NAME="your-cute-bot-name" node bot.js`
   * @property   {PuppetModuleName | Puppet}    puppet             -Puppet name or instance
   * @property   {Partial<PuppetOptions>} puppetOptions      -Puppet TOKEN
   * @property   {string}                 ioToken            -Io TOKEN
   */

  /**
   * Creates an instance of Wechaty.
   * @param {WechatyOptions} [options={}]
   *
   */
  constructor (
    override _options: WechatyOptions = {},
  ) {
    super()
    log.verbose('Wechaty', 'constructor()')

    this._memory = this._options.memory

    this._cleanCallbackList = []

    this.wechaty = this
  }

  override async onStart (): Promise<void> {
    log.verbose('Wechaty', '<%s>(%s) onStart() v%s is starting...',
      this._options.puppet || config.systemPuppetName(),
      this._options.name   || '',
      this.version(),
    )
    log.verbose('Wechaty', 'id: %s', this.id)

    const lifeTimer = setInterval(() => {
      log.silly('Wechaty', 'onStart() setInterval() this timer is to keep Wechaty running...')
    }, 1000 * 60 * 60)
    this._cleanCallbackList.push(() => clearInterval(lifeTimer))

    this.emit('start')
  }

  override async onStop (): Promise<void> {
    log.verbose('Wechaty', '<%s> onStop() v%s is stopping ...',
      this._options.puppet || config.systemPuppetName(),
      this.version(),
    )

    while (this._cleanCallbackList.length > 0) {
      const cleaner = this._cleanCallbackList.pop()
      if (cleaner) cleaner()
    }

    this.emit('stop')
  }

  /**
   * Send message to currentUser, in other words, bot send message to itself.
   * > Tips:
   * This function is depending on the Puppet Implementation, see [puppet-compatible-table](https://github.com/wechaty/wechaty/wiki/Puppet#3-puppet-compatible-table)
   *
   * @param {(string | Contact | FileBox | UrlLink | MiniProgram | Location)} sayable
   * send text, Contact, or file to bot. </br>
   * You can use {@link https://www.npmjs.com/package/file-box|FileBox} to send file
   *
   * @returns {Promise<void>}
   *
   * @example
   * const bot = new Wechaty()
   * await bot.start()
   * // after logged in
   *
   * // 1. send text to bot itself
   * await bot.say('hello!')
   *
   * // 2. send Contact to bot itself
   * const contact = await bot.Contact.find()
   * await bot.say(contact)
   *
   * // 3. send Image to bot itself from remote url
   * import { FileBox }  from 'wechaty'
   * const fileBox = FileBox.fromUrl('https://wechaty.github.io/wechaty/images/bot-qr-code.png')
   * await bot.say(fileBox)
   *
   * // 4. send Image to bot itself from local file
   * import { FileBox }  from 'wechaty'
   * const fileBox = FileBox.fromFile('/tmp/text.jpg')
   * await bot.say(fileBox)
   *
   * // 5. send Link to bot itself
   * const linkPayload = new UrlLink ({
   *   description : 'WeChat Bot SDK for Individual Account, Powered by TypeScript, Docker, and Love',
   *   thumbnailUrl: 'https://avatars0.githubusercontent.com/u/25162437?s=200&v=4',
   *   title       : 'Welcome to Wechaty',
   *   url         : 'https://github.com/wechaty/wechaty',
   * })
   * await bot.say(linkPayload)
   *
   * // 6. send MiniProgram to bot itself
   * const miniPayload = new MiniProgram ({
   *   username           : 'gh_xxxxxxx',     //get from mp.weixin.qq.com
   *   appid              : '',               //optional, get from mp.weixin.qq.com
   *   title              : '',               //optional
   *   pagepath           : '',               //optional
   *   description        : '',               //optional
   *   thumbnailurl       : '',               //optional
   * })
   * await bot.say(miniPayload)
   */

  async say (
    sayable: Sayable,
  ): Promise<void> {
    log.verbose('Wechaty', 'say(%s)', sayable)
    await this.currentUser().say(sayable)
  }

}

type WechatyBaseProtectedProperty =
  // | '_serviceCtlFsmInterpreter'  // from ServiceCtlFsm
  | '_serviceCtlLogger'             // from ServiceCtl(&Fsm)
  | '_serviceCtlResettingIndicator' // from ServiceCtl
  | 'wechaty'
  | 'onStart'
  | 'onStop'

export type {
  WechatyBaseProtectedProperty,
}
export {
  WechatyBase,
}
