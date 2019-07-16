import {
  MiniProgramPayload,
}                   from 'wechaty-puppet'

import {
  log,
}               from '../config'

export class MiniProgram {

  /**
   *
   * Create from URL
   *
   */
  public static async create (url: string): Promise<MiniProgram> {
    log.verbose('MiniProgram', 'create(%s)', url)

    // TODO: get title/description/thumbnailUrl from url automatically
    const payload: MiniProgramPayload = {
      description  : 'todo',
      thumbnailUrl : 'todo',
      title        : 'todo',
      url,
    }

    return new MiniProgram(payload)
  }

  constructor (
    public readonly payload: MiniProgramPayload,
  ) {
    log.verbose('MiniProgram', 'constructor()')
  }

  public toString (): string {
    return `MiniProgram<${this.payload.url}>`
  }

  public url (): string {
    return this.payload.url
  }

  public title (): string {
    return this.payload.title
  }

  public thumbnailUrl (): undefined | string {
    return this.payload.thumbnailUrl
  }

  public description (): undefined | string {
    return this.payload.description
  }

}
