/**
 *
 * wechaty: Wechat for ChatBots.
 *
 * Class Wechaty
 *
 * Licenst: ISC
 * https://github.com/zixia/wechaty
 *
 */
const EventEmitter  = require('events')
const co            = require('co')
const fs            = require('fs')
const path          = require('path')

const log           = require('./brolog-env')
const UtilLib       = require('./util-lib')

const PuppetWeb     = require('./puppet-web')

const Config = require('./config')

class Wechaty extends EventEmitter {

  constructor({
    type        = Config.puppet
    , head      = Config.head
    , port      = Config.port
    , endpoint  = Config.endpoint
    , token     = Config.token    // token for wechaty.io auth. will connect to wechaty.io cloud management if token is set
    , profile   = Config.profile  // no profile, no session save/restore
  } = {}) {
    log.verbose('Wechaty', 'contructor()')

    super()
    this.type     = type
    this.head     = head
    this.port     = port
    this.token    = token
    this.endpoint = endpoint

    this.profile  = /\.wechaty\.json$/i.test(profile)
                    ? profile
                    : profile + '.wechaty.json'

    this.npmVersion = require('../package.json').version

    this.uuid = UtilLib.guid()
    
    this.inited = false
  }

  toString() { return 'Class Wechaty(' + this.type + ')'}

  version(forceNpm) {
    const dotGitPath  = path.join(__dirname, '..', '.git')
    const gitLogCmd   = 'git'
    const gitLogArgs  = ['log', '--oneline', '-1']

    if (!forceNpm) {
      try {
        // Synchronous version of fs.access(). This throws if any accessibility checks fail, and does nothing otherwise.
        fs.accessSync(dotGitPath, fs.F_OK)

        const ss = require('child_process')
                    .spawnSync(gitLogCmd, gitLogArgs, { cwd:  __dirname })
        if (ss.status !== 0) {
          throw new Error(ss.error)
        }

        const revision = ss.stdout
                          .toString()
                          .trim()
        return `#git[${revision}]`
      } catch (e) { /* fall safe */ 
        /**
         *  1. .git not exist
         *  2. git log fail
         */
        log.silly('Wechaty', 'version() test %s', e.message)
      }
    }

    return this.npmVersion
  } 

  user() { return this.puppet && this.puppet.user }
  
  reset(reason) {
    log.verbose('Wechaty', 'reset() because %s', reason)
    if (this.puppet && this.puppet.browser) {
      this.puppet.browser.dead('restart required by wechaty reset()')
    } else {
      log.warn('Wechaty', 'reset() without browser')
    }
  }
  
  init() {

    log.info('Wechaty', 'v%s initializing...', this.version())
    log.verbose('Wechaty', 'puppet: %s' , this.type)
    log.verbose('Wechaty', 'head: %s'   , this.head)
    log.verbose('Wechaty', 'profile: %s', this.profile)
    log.verbose('Wechaty', 'uuid: %s'   , this.uuid)

    if (this.inited) {
      log.error('Wechaty', 'init() already inited. return and do nothing.')
      return Promise.resolve(this)
    }

    return co.call(this, function* () {
      this.io = yield this.initIo()
      .catch(e => { // fail safe
        log.error('Wechaty', 'initIo failed: %s', e.message)
        this.emit('error', e)
      })

      this.puppet = yield this.initPuppet()

      this.inited = true
      return this // for chaining
    })
    .catch(e => {
      log.error('Wechaty', 'init() exception: %s', e.message)
      throw e
    })
  }

  initIo() {
    if (!this.token) {
      log.verbose('Wechaty', 'initIo() skiped for no token set')
      return Promise.resolve('no token')
    } else {
      log.verbose('Wechaty', 'initIo(%s)', this.token)
    }

    const Io = require('./io')
    const io = new Io({
      wechaty: this
      , token: this.token
      , endpoint: this.endpoint
    })

    return io.init()
    .catch(e => {
      log.verbose('Wechaty', 'Wechaty.IO init fail: %s', e.message)
      throw e
    })
  }

  initPuppet() {
    let puppet
    switch (this.type) {
      case 'web':
        puppet = new PuppetWeb( {
          head:       this.head
          , profile:  this.profile
        })
        break
      default:
        throw new Error('Puppet unsupport(yet): ' + this.type)
    }

    ;[
      'scan'
      , 'message'
      , 'login'
      , 'logout'
      , 'error'
      , 'heartbeat'
    ].map(e => {
      puppet.on(e, data => {
        this.emit(e, data)
      })
    })
    /**
     * TODO: support more events:
     * 2. send
     * 3. reply
     * 4. quit
     * 5. ...
     */

    return puppet.init()
  }

  quit() {
    log.verbose('Wechaty', 'quit()')
    const puppetBeforeDie = this.puppet
    this.puppet = null
    this.inited = false

    if (!puppetBeforeDie) {
      return Promise.resolve()
    }

    return puppetBeforeDie.quit()
    .catch(e => {
      log.error('Wechaty', 'quit() exception: %s', e.message)
      throw e
    })
  }

  logout()  {
    return this.puppet.logout()
    .catch(e => {
      log.error('Wechaty', 'logout() exception: %s', e.message)
      throw e
    })
  }

  self(message) {
    return this.puppet.self(message)
  }

  send(message) {
    return this.puppet.send(message)
    .catch(e => {
      log.error('Wechaty', 'send() exception: %s', e.message)
      throw e
    })
  }

  reply(message, reply) {
    return this.puppet.reply(message, reply)
    .catch(e => {
      log.error('Wechaty', 'reply() exception: %s', e.message)
      throw e
    })
  }

  ding(data) {
    if (!this.puppet) {
      return Promise.reject(new Error('wechaty cant ding coz no puppet'))
    }

    return this.puppet.ding(data)
    .catch(e => {
      log.error('Wechaty', 'ding() exception: %s', e.message)
      throw e
    })
  }
}

/**
 * Expose `Wechaty`.
 */
module.exports = Wechaty.default = Wechaty.Wechaty = Wechaty

