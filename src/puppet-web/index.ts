/**
 *
 * wechaty: Wechat for Bot. and for human who talk to bot/robot
 *
 * Class PuppetWeb Exportor
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
import Bridge     from './bridge'
import Browser    from './browser'
import Event      from './event'
import PuppetWeb  from './puppet-web'
import Server     from './server'
import Watchdog   from './watchdog'

// Object.assign(PuppetWeb, {
//   default: PuppetWeb
//   , PuppetWeb
//   , Server
//   , Browser
//   , Bridge
//   , Event
//   , Watchdog
// })

// module.exports = PuppetWeb
export default PuppetWeb
export {
  Bridge
  , Browser
  , Event
  , PuppetWeb
  , Server
  , Watchdog
}
