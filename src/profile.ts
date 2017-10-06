import * as fs    from 'fs'
import * as path  from 'path'

import {
  config,
  log,
}           from './config'

export type ProfileSection = 'cookies'

export interface ProfileSchema {
  cookies?:   any[]
}

export class Profile {
  private obj:  ProfileSchema
  private file: string

  constructor(
    public name: string = config.profile,
  ) {
    this.file = path.isAbsolute(name)
      ? name
      : path.join(
          process.cwd(),
          name,
          '.wechaty.json',
        )
  }

  public load() {
    const text = fs.readFileSync(this.file).toString()
    try {
      this.obj = JSON.parse(text)
    } catch (e) {
      log.error('Profile', 'load() exception: %s', e)
      throw e
    }
  }

  public save() {
    try {
      const text = JSON.stringify(this.obj)
      fs.writeFileSync(this.file, text)
    } catch (e) {
      log.error('Profile', 'save() exception: %s', e)
      throw e
    }
  }

  public get(section: ProfileSection): any {
    return this.obj[section]
  }

  public set(section: ProfileSection, data: any): void {
    this.obj[section] = data
  }

  public destroy(): void {
    fs.unlinkSync(this.file)
  }
}

export default Profile
