/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  createServer,
  Socket,
}                   from 'net'
import { spawnSync as spawn } from 'child_process'

import {
  log,
}                   from 'wechaty-puppet'

export class Doctor {

  constructor () {
    log.verbose('Doctor', 'constructor()')
  }

  public chromedriverVersion (): string {
    let version: string
    try {
      const cmd = spawn('chromedriver', ['--version'])
      version = String(cmd.error) || cmd.stdout.toString() || cmd.stderr.toString()
    } catch (e) {
      version = (e as Error).message
    }
    return version
  }

  /**
   * https://gist.github.com/tedmiston/5935757
   */
  public testTcp (): Promise<boolean> {
    log.verbose('Doctor', 'testTcp()')

    return new Promise<boolean>((resolve, reject) => {
      /**
       * Server
       */
      const server = createServer(socket => socket.pipe(socket))
      /**
       * Promise Reject
       */
      server.on('error', reject)
      server.on('close', () => log.silly('Doctor', 'testTcp() server closed'))

      server.listen(8788, 'localhost', () => {
        /**
         * Client
         */
        const client = new Socket()
        client.connect(8788, 'localhost', () => {
          log.silly('Doctor', 'testTcp() client connected')
          client.write('ding')
        })

        client.on('data', () => {
          /**
           * Promise Resolve
           */
          resolve(true)

          client.destroy() // kill client after server's response
        })
        /**
         * Promise Reject
         */
        client.on('error', reject)

        client.on('close', () => server.close())
      })
    })
  }

}
