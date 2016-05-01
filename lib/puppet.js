const EventEmitter = require('events')
const PuppetWeb    = require('puppet-web')

class Puppet extends EventEmitter {
  constructor() {
    super()
  }

  currentUser() {
    return 'zixia'
  }
}

module.exports = Puppet
