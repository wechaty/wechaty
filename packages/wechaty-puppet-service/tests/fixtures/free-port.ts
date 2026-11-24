/**
 * Test helper that finds a free TCP port for a test's gRPC server, which
 * binds `0.0.0.0:<port>`.
 *
 * It replaces `get-port`, which lists every network interface and probes
 * each address: under Deno that needs `--allow-sys=networkInterfaces` and
 * net access to every host address. This helper probes only `0.0.0.0`, the
 * address the servers bind, so the Deno run keeps its narrow permissions.
 * The port is released before it is returned, so another process could take
 * it first; that race is acceptable for tests.
 */
import net from 'node:net'

/** Resolves to a port that was free on `0.0.0.0` when it was probed. */
export async function freePort (): Promise<number> {
  const server = net.createServer()
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '0.0.0.0', resolve)
  })
  const { port } = server.address() as net.AddressInfo
  await new Promise<void>(resolve => server.close(() => resolve()))
  return port
}
