export {
  FileBox,
}           from 'file-box'

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

// export * from './puppet/'

export {
  Contact,
}                         from './contact'
export {
  FriendRequest,
}                         from './friend-request'
export {
  Message,
}                         from './message'
export {
  Room,
}                         from './room'

export {
  MediaMessage,
}                     from './deprecated'

export { IoClient }   from './io-client'
export { Misc }       from './misc'

export {
  PuppetPuppeteer,
}                     from './puppet-puppeteer/'

export {
  Wechaty,
}
export default Wechaty
