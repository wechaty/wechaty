import {
  PuppetHostieGrpc as PuppetHostie,
} from './grpc/puppet-client'

export {
  log,
  VERSION,
} from './config'

export {
  PuppetHostieGrpcServer as PuppetHostieServer,
} from './grpc/puppet-server'

export {
  PuppetHostie,
}
export default PuppetHostie
