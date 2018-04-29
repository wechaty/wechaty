export {
  config,
  log,
  VERSION,
}                     from './config'

/**
 * We need to put `Wechaty` at the beginning of this file for import
 * because we have circluar dependencies between `Puppet` & `Wechaty`
 */
import {
  Wechaty,
}                     from './wechaty'

export {
  Contact,
  FriendRequest,
  Message,
  Room,
}                     from './puppet/'

export {
  MediaMessage,
}                     from './deprecated'

export { IoClient }   from './io-client'
export { Misc }       from './misc'
export { Profile }    from './profile'

export {
  PuppetPuppeteer,
}                     from './puppet-puppeteer/'

export {
  Wechaty,
}
export default Wechaty
