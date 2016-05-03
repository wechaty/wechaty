const EventEmitter = require('events')

class Puppet extends EventEmitter {
  constructor() {
    super()
  }

  currentUser() {
    return 'zixia'
  }

  attach(soul) {
    if (this.soul)      throw new Error('already a soul inside, detach it first!')
    if (!soul.alive())  throw new Error('soul is not alive!')

    this.soul = soul
    this.soul.on('message', data => { this.emit('message', data) })
  }
  
  detach() {
    if (!this.soul) throw new Error('there is no soul inside to detach!')
    this.soul.destroy()
    delete this.soul
  }

}

Puppet.Soul = {
  Web: require('./puppet-web')
}

module.exports = Puppet

