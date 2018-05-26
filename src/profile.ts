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
import * as fs    from 'fs'
import * as path  from 'path'

import {
  config,
  log,
}           from './config'

export interface ProfileSchema {
  // cookies?      : any
  [idx: string] : any
}

export type ProfileSection = keyof ProfileSchema

export class Profile {
  private payload : ProfileSchema
  private file?   : string

  constructor(
    public name = config.profile,
  ) {
    log.verbose('Profile', 'constructor(%s)', name)

    if (!name) {
      this.file = undefined
    } else {
      this.file = path.isAbsolute(name)
        ? name
        : path.resolve(
            process.cwd(),
            name,
          )
      if (!/\.wechaty\.json$/.test(this.file)) {
        this.file +=  '.wechaty.json'
      }
    }

    this.payload = {}
  }

  public toString() {
    return `Profile<${this.name}>`
  }

  public async load(): Promise<void> {
    log.verbose('Profile', 'load() file: %s', this.file)
    this.payload = {}

    if (!this.file) {
      log.verbose('Profile', 'load() no file, NOOP')
      return
    }

    if (!fs.existsSync(this.file)) {
      log.verbose('Profile', 'load() file not exist, NOOP')
      return
    }

    const text = fs.readFileSync(this.file).toString()
    try {
      this.payload = JSON.parse(text)
    } catch (e) {
      log.error('Profile', 'load() exception: %s', e)
    }
  }

  public async save(): Promise<void> {
    log.verbose('Profile', 'save() file: %s', this.file)
    if (!this.file) {
      log.verbose('Profile', 'save() no file, NOOP')
      return
    }
    if (!this.payload) {
      log.verbose('Profile', 'save() no obj, NOOP')
      return
    }

    try {
      const text = JSON.stringify(this.payload)
      fs.writeFileSync(this.file, text)
    } catch (e) {
      log.error('Profile', 'save() exception: %s', e)
      throw e
    }
  }

  public async get<T = any>(section: ProfileSection): Promise<null | T> {
    log.verbose('Profile', 'get(%s)', section)
    if (!this.payload) {
      return null
    }
    return this.payload[section] as any as T
  }

  public async set<T = any>(section: ProfileSection, data: T): Promise<void> {
    log.verbose('Profile', 'set(%s, %s)', section, data)
    if (!this.payload) {
      this.payload = {}
    }
    this.payload[section] = data
  }

  public async destroy(): Promise<void> {
    log.verbose('Profile', 'destroy() file: %s', this.file)
    this.payload = {}
    if (this.file && fs.existsSync(this.file)) {
      fs.unlinkSync(this.file)
      this.file = undefined
    }
  }
}

export default Profile
