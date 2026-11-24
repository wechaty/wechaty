/* eslint-disable sort-keys */
import {
  google as grpcGoogle,
}                         from 'wechaty-grpc'
import {
  log,
  Puppet,
}                         from 'wechaty-puppet'

const HEARTBEAT_TIMEOUT_SECONDS = 60

function healthImplementation (
  puppet: Puppet,
): grpcGoogle.IHealthServer {

  let lastHeartbeatTimestamp = -1

  const healthCheckResponse = () => {
    const response = new grpcGoogle.HealthCheckResponse()

    if (lastHeartbeatTimestamp < 0 || lastHeartbeatTimestamp > Date.now()) {
      response.setStatus(grpcGoogle.HealthCheckResponse.ServingStatus.SERVICE_UNKNOWN)

    } else if (Date.now() - lastHeartbeatTimestamp < HEARTBEAT_TIMEOUT_SECONDS * 1000) {
      response.setStatus(grpcGoogle.HealthCheckResponse.ServingStatus.SERVING)

    } else {
      response.setStatus(grpcGoogle.HealthCheckResponse.ServingStatus.NOT_SERVING)
    }

    return response
  }

  puppet.on('heartbeat', () => {
    lastHeartbeatTimestamp = Date.now()
  })

  const healthServerImpl: grpcGoogle.IHealthServer = {

    check: async (call, callback) => {
      log.verbose('HealthServiceImpl', 'check()')

      const service = call.request.getService()
      log.verbose('HealServiceImpl', 'check() service="%s"', service)

      const response = healthCheckResponse()
      callback(null, response)
    },

    watch: async (call) => {
      log.verbose('HealthServiceImpl', 'watch()')

      const firstResponse = healthCheckResponse()
      let currentStatus   = firstResponse.getStatus()

      call.write(firstResponse)

      const timer = setInterval(() => {
        const nextResponse = healthCheckResponse()
        if (nextResponse.getStatus() !== currentStatus) {
          currentStatus = nextResponse.getStatus()
          call.write(nextResponse)
        }
      }, 5 * 1000)

      const clear = () => clearInterval(timer)

      call.on('end',    clear)
      call.on('error',  clear)
      call.on('close',  clear)
    },

  }

  return healthServerImpl
}

export { healthImplementation }
