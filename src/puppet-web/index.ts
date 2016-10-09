const PuppetWeb = require('./puppet-web')
const Event = require('./event')
const Server = require('./server')
const Browser = require('./browser')
const Bridge = require('./bridge')
const Watchdog = require('./watchdog')

Object.assign(PuppetWeb, {
  default: PuppetWeb
  , PuppetWeb
  , Server
  , Browser
  , Bridge
  , Event
  , Watchdog
})

module.exports = PuppetWeb
