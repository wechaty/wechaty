const Wechaty   = require('./src/wechaty')
const Config    = require('./src/config')

const Message   = require('./src/message')
const Contact   = require('./src/contact')
const Room      = require('./src/room')

const Puppet    = require('./src/puppet')
const PuppetWeb = require('./src/puppet-web')

const IoClient  = require('./src/io-client')

const log       = require('./src/brolog-env')

const UtilLib   = require('./src/util-lib')

Object.assign(Wechaty, {
  default: Wechaty
  , Wechaty
  , Config
  
  , Message
  , Contact
  , Room

  , Puppet
  , PuppetWeb
  
  , IoClient
  , UtilLib

  , version: require('./package.json').version
  , log // for convenionce use npmlog with environment variable LEVEL
  
})

module.exports = Wechaty
