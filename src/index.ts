export {
  config,
  log,
  VERSION,
}                     from './config'

export {
  Contact,
  FriendRequest,
  Message,
  Room,
}                     from './abstract-puppet/'

export {
  MediaMessage,
}                     from './deprecated'

export { IoClient }   from './io-client'
export { Profile }    from './profile'
export { Misc }       from './misc'

export {
  PuppetPuppeteer,
}                     from './puppet-puppeteer/'

import {
  Wechaty,
}                     from './wechaty'
export {
  Wechaty,
}
export default Wechaty
