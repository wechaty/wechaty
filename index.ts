import Config     from './src/config'
import Contact    from './src/contact'
import IoClient   from './src/io-client'
import Message    from './src/message'
import Puppet     from './src/puppet'
import PuppetWeb  from './src/puppet-web/'
import Room       from './src/room'
import UtilLib    from './src/util-lib'
import Wechaty    from './src/wechaty'

import log       from './src/brolog-env'

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
