import Wechaty   from './src/wechaty'
import Config    from './src/config'

import Message   from './src/message'
import Contact   from './src/contact'
import Room      from './src/room'

import Puppet    from './src/puppet'
import PuppetWeb from './src/puppet-web'

import IoClient  from './src/io-client'

import log       from './src/brolog-env'

import UtilLib   from './src/util-lib'

// Object.assign(Wechaty, {
//   default: Wechaty
//   , Wechaty
//   , Config

//   , Message
//   , Contact
//   , Room

//   , Puppet
//   , PuppetWeb

//   , IoClient
//   , UtilLib

//   , version: require('./package.json').version
//   , log // for convenionce use npmlog with environment variable LEVEL

// })

// module.exports = Wechaty

const version = require('./package.json').version

export default Wechaty
export {
  Config

  , Message
  , Contact
  , Room

  , Puppet
  , PuppetWeb

  , IoClient
  , UtilLib
  , Wechaty

  , version
  , log // for convenionce use npmlog with environment variable LEVEL
}
