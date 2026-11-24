import {
  log,
}                 from 'wechaty-puppet'
import {
  PuppetService,
}                 from './client/puppet-service.js'
import {
  VERSION,
}                 from './config.js'
import {
  PuppetServer,
  PuppetServerOptions,
}                         from './server/puppet-server.js'

export {
  log,
  PuppetServer,
  PuppetService,
  VERSION,
}
export type {
  PuppetServerOptions,
}

export default PuppetService
