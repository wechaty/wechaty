import net     from 'net'

const DEFAULT_PORT = 38788

/**
 *
 * @param port is just a suggestion.
 * there's no grantuee for the number
 *
 * The IANA suggested ephemeral port range.
 * @see http://en.wikipedia.org/wiki/Ephemeral_ports
 *
 * const DEFAULT_IANA_RANGE = {min: 49152, max: 65535}
 *
 */
export function getPort (port = DEFAULT_PORT): Promise<number> {
  let tryPort = nextPort(port)

  return new Promise(resolve => {
    // https://gist.github.com/mikeal/1840641
    function _getPort (cb: (port: number) => void) {
      const server = net.createServer()
      server.on('error', (err) => {
        if (err) {/* fail safe */ }
        tryPort = nextPort(port)
        _getPort(cb)
      })
      server.listen(tryPort, (err: any) => {
        if (err) {/* fail safe */}
        server.once('close', () => {
          cb(tryPort)
        })
        server.close()
      })
    }
    _getPort(okPort => {
      // put to the end of the event loop
      // make sure that all tasks had been done, esp. server.close()
      setImmediate(() => resolve(okPort))
    })
  })

  function nextPort (currentPort: number): number {
    const RANGE = 1733
    // do not use Math.random() here, because AVA will fork, then here will get the same random number, cause a race condition for socket listen
    const n = Math.floor(Math.random() * RANGE)

    /**
     * nano seconds from node: http://stackoverflow.com/a/18197438/1123955
     */
    // const [, nanoSeed] = process.hrtime()
    // const n = 1 + nanoSeed % RANGE // +1 to prevent same port

    if (currentPort + n > 65000) {
      return currentPort + n - RANGE
    }
    return currentPort + n
  }
}
