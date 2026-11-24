/**
 * The standard gRPC health service for a served puppet. Status follows the
 * puppet's `heartbeat` events: unknown before the first one, serving within
 * 60 seconds of the last one, not serving after that. `watch` polls every 5
 * seconds and yields changes.
 */
import { create } from '@bufbuild/protobuf'
import {
  HealthCheckResponseSchema,
  ServingStatus,
  type HealthCheckRequest,
  type HealthCheckResponse,
} from 'wechaty-grpc'
import {
  log,
  type Puppet,
} from 'wechaty-puppet'

const HEARTBEAT_TIMEOUT_SECONDS = 60

function healthImplementation (
  puppet: Puppet,
) {
  let lastHeartbeatTimestamp = -1

  const getStatus = (): ServingStatus => {
    if (lastHeartbeatTimestamp < 0 || lastHeartbeatTimestamp > Date.now()) {
      return ServingStatus.UNKNOWN
    } else if (Date.now() - lastHeartbeatTimestamp < HEARTBEAT_TIMEOUT_SECONDS * 1000) {
      return ServingStatus.SERVING
    } else {
      return ServingStatus.NOT_SERVING
    }
  }

  puppet.on('heartbeat', () => {
    lastHeartbeatTimestamp = Date.now()
  })

  return {
    check: async (req: HealthCheckRequest): Promise<HealthCheckResponse> => {
      log.verbose('HealthServiceImpl', 'check() service="%s"', req.service)
      return create(HealthCheckResponseSchema, { status: getStatus() })
    },

    watch: async function* (_req: HealthCheckRequest, ctx?: { signal?: AbortSignal }): AsyncIterable<HealthCheckResponse> {
      log.verbose('HealthServiceImpl', 'watch()')
      let currentStatus = getStatus()
      yield create(HealthCheckResponseSchema, { status: currentStatus })

      while (!ctx?.signal?.aborted) {
        await new Promise<void>(resolve => {
          let timer: ReturnType<typeof setTimeout>
          const onAbort = () => {
            clearTimeout(timer)
            resolve()
          }
          timer = setTimeout(() => {
            ctx?.signal?.removeEventListener('abort', onAbort)
            resolve()
          }, 5000)
          ctx?.signal?.addEventListener('abort', onAbort, { once: true })
        })
        if (ctx?.signal?.aborted) {
          break
        }
        const nextStatus = getStatus()
        if (nextStatus !== currentStatus) {
          currentStatus = nextStatus
          yield create(HealthCheckResponseSchema, { status: currentStatus })
        }
      }
    },
  }
}

export { healthImplementation }
