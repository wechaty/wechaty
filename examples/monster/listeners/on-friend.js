////////////////////////////////////////////////////////////////////////////
// Program: monster
// Purpose: monster all-in-one demo of Wechaty hot
// Authors: Tong Sun (c) 2018, All rights reserved
//          Huan LI  (c) 2018, All rights reserved
//          xinbenlv (c) 2017, All rights reserved
////////////////////////////////////////////////////////////////////////////

/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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

const { hotImport } = require('hot-import')

export default async function onFriend (contact, request) {
  const config = await hotImport('config.js')
  if (!config.friendEnabled) return

  if (request) {
    let name = contact.name()
    // await request.accept()

    console.log(`Contact: ${name} send request ${request.hello()}`)
  }
}
