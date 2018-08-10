import {
  UrlLinkPayload,
}                   from 'wechaty-puppet'

import {
  log,
}               from '../config'

export class UrlLink {

  /**
   *
   * Create from URL
   *
   */
  public static async create (url: string): Promise<UrlLink> {
    log.verbose('UrlLink', 'create(%s)', url)

    // TODO: get title/description/thumbnailUrl from url automatically
    const payload: UrlLinkPayload = {
      description  : 'todo',
      thumbnailUrl : 'todo',
      title        : 'todo',
      url,
    }

    return new UrlLink(payload)
  }

  constructor (
    public readonly payload: UrlLinkPayload,
  ) {
    log.verbose('UrlLink', 'constructor()')
  }

  public toString (): string {
    return `UrlLink<${this.payload.url}>`
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
