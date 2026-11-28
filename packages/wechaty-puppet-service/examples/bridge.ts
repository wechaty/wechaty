/**
 * Pattern 3 Sidecar Bridge example: connects to any legacy HTTP/2 binary gRPC
 * Puppet server via `PuppetService` (`protocol: 'grpc'`) and re-exposes it via
 * `PuppetServer` as a single-port ConnectRPC + OpenAPI 3.2.0 + Scalar + SSE + `/files`
 * HTTP server.
 */
import { PuppetServer, PuppetService } from '../src/mod.ts'

async function main (): Promise<void> {
  const upstreamEndpoint = process.env['LEGACY_GRPC_ENDPOINT'] || '127.0.0.1:8788'
  const upstreamToken = process.env['LEGACY_GRPC_TOKEN'] || process.env['WECHATY_PUPPET_SERVICE_TOKEN'] || ''
  const listenEndpoint = process.env['BRIDGE_LISTEN_ENDPOINT'] || '0.0.0.0:8789'
  const bridgeToken = process.env['WECHATY_PUPPET_SERVICE_TOKEN'] || upstreamToken

  const legacyPuppet = new PuppetService({
    endpoint: upstreamEndpoint,
    token: upstreamToken,
    protocol: 'grpc',
  })

  // Keep an error listener attached so transient upstream drops trigger automatic
  // reconnection instead of failing the owned lifecycle when no SSE client is connected.
  legacyPuppet.on('error', (err) => {
    console.error('Bridge upstream puppet error:', err)
  })

  const openApiServer = new PuppetServer({
    endpoint: listenEndpoint,
    puppet: legacyPuppet,
    token: bridgeToken,
  })

  await legacyPuppet.start()
  await openApiServer.start()
  console.log(`Wechaty OpenAPI 3.2.0 bridge listening on ${listenEndpoint} -> ${upstreamEndpoint}`)
}

if (import.meta.main) {
  await main()
}
