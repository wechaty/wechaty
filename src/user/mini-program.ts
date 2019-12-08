import {
  MiniProgramPayload,
}                   from 'wechaty-puppet'

import {
  log,
}               from '../config'

export class MiniProgram {

  /**
   *
   * Create
   *
   */
  public static async create (): Promise<MiniProgram> {
    log.verbose('MiniProgram', 'create()')

    // TODO: get appid and username from wechat
    const payload: MiniProgramPayload = {
      appid              : 'todo',
      description        : 'todo',
      pagePath           : 'todo',
      thumbKey           : 'todo',
      thumbUrl           : 'todo',
      title              : 'todo',
      username           : 'todo',
    }

    return new MiniProgram(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: MiniProgramPayload,
  ) {
    log.verbose('MiniProgram', 'constructor()')
  }

  public appid (): undefined | string {
    return this.payload.appid
  }

  public title (): undefined | string {
    return this.payload.title
  }

  public pagePath (): undefined | string {
    return this.payload.pagePath
  }

  public username (): undefined | string {
    return this.payload.username
  }

  public description (): undefined | string {
    return this.payload.description
  }

  public thumbUrl (): undefined | string {
    return this.payload.thumbUrl
  }

  public thumbKey (): undefined | string {
    return this.payload.thumbKey
  }

}
