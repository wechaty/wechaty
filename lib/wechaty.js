'use strict'
/* jshint node:true, unused:true */

const EventEmitter = require('events');
const Util = require('util');

var Puppet  = require('./puppet')
var Contact = require('./contact')
var Group   = require('./group')
var Message = require('./message')

class Wechaty extends EventEmitter {
  // cookie，Uin, Sid，SKey
  constructor(opts) {
    super()
    this.puppet   = new Puppet(opts)
    this.contact  = new Contact(this.puppet)
    this.group    = new Group(this.puppet)
    this.message  = new Message(this.puppet)

    this.puppet.on('message', (e) => {
      this.emit('message', e)
    })
    this.puppet.on('login', (e) => {
      this.emit('login', e)
    })
    this.puppet.on('logout', (e) => {
      this.emit('logout', e)
    })
  }

  currentUser() {
    return this.puppet.currentUser()
  }

  test1() {
    console.log('inst echo...')
  }

  static test() {
    console.log('stat echo...')
  }
}

  /*
header cookie

BaseRequest
Uin
Sid
Skey
DeviceId
*/

module.exports = Wechaty
