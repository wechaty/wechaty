#!/usr/bin/env ts-node
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
import { spawn } from 'child_process'

const MAX_RETRY_NUM = 3

async function main (): Promise<number> {
  console.info('Safe Test: starting...')

  let round = 0
  let succ = false
  do {
    console.info(`Safe Test: running for round #${round}`)
    succ = await unitTest()
    if (succ) { // success!
      console.info(`Safe Test: successed at round #${round}!`)
      return 0
    }
  } while (round++ < MAX_RETRY_NUM)
  return 1  // fail finally :(
}

async function unitTest () {
  const child = spawn(
    'npm',
    [
      'run',
      'test:unit',
    ],
    {
      shell: true,  // https://stackoverflow.com/a/39682805/1123955
      stdio: 'inherit',
    },
  )
  return new Promise<boolean>((resolve, reject) => {
    child.once('exit', code =>
      code === 0 ? resolve(true) : resolve(false),
    )
    child.once('error', reject)
  })
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
