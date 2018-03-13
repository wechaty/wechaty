/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
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

/**
 * Wechaty hot import bot example
 *
 * Hot import Wechaty listenser functions after change the source code without restart the program
 *
 * How to start:
 * ```shell
 * docker run -t -i --rm --name wechaty --mount type=bind,source="$(pwd)",target=/bot -m "300M" --memory-swap "1G" zixia/wechaty index.js
 * ```
 *
 * P.S. We are using the hot-import module:
 *   * Hot Module Replacement(HMR) for Node.js
 *   * https://www.npmjs.com/package/hot-import
 *
 */
const { Wechaty } = require('wechaty')

const bot = Wechaty.instance()
.on('friend',   './listeners/on-friend')
.on('login',    './listeners/on-login')
.on('message',  './listeners/on-message')
.on('scan',     './listeners/on-scan')
.start()
