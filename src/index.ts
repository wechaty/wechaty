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

// TODO: move MsgType to Message.Type ?
export {
  MsgType,
}                     from './puppet-web/schema'

export { IoClient }   from './io-client'
export { Profile }    from './profile'
export { Misc }       from './misc'

export { PuppetWeb }  from './puppet-web/'

import Wechaty from './wechaty'
export {
  Wechaty,
}
export default Wechaty
