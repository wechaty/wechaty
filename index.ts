import {
    Config
  , Sayable
}                     from './src/config'
import Contact        from './src/contact'
import FriendRequest  from './src/friend-request'
import IoClient       from './src/io-client'
import Message        from './src/message'
import Puppet         from './src/puppet'
import PuppetWeb      from './src/puppet-web/'
import Room           from './src/room'
import UtilLib        from './src/util-lib'
import Wechaty        from './src/wechaty'

import log            from './src/brolog-env'

const VERSION = require('./package.json').version

export default Wechaty
export {
    Config
  , Contact
  , FriendRequest
  , IoClient
  , Message
  , Puppet
  , PuppetWeb
  , Room
  , Sayable
  , UtilLib
  , Wechaty
  , log // for convenionce use npmlog with environment variable LEVEL
  , VERSION
}

Object.assign(Wechaty, {
    Config
  , Contact
  , FriendRequest
  , IoClient
  , Message
  , Puppet
  , PuppetWeb
  , Room
  , UtilLib
  , Wechaty
  , default: Wechaty
  , log // for convenionce use npmlog with environment variable LEVEL
  , VERSION
})
exports = Wechaty
