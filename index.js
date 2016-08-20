const Wechaty = require('./src/wechaty')

const Message = require('./src/message')
const Contact = require('./src/contact')
const Room    = require('./src/room')

const Puppet  = require('./src/puppet')
const PuppetWeb = require('./src/puppet-web')

const IoBot   = require('./src/io-bot')

const log = require('./src/npmlog-env')
const config = require('./src/config')

Object.assign(Wechaty, {
  Message
  , Contact
  , Room

  , Puppet
  , PuppetWeb
  
  , IoBot

  , version: require('./package.json').version
  , log // for convenionce use npmlog with environment variable LEVEL
  , config
})

module.exports = Wechaty
