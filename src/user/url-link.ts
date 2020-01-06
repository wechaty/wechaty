import Url from 'url'

import {
  UrlLinkPayload,
}                   from 'wechaty-puppet'

import {
  log,
}               from '../config'

import {
  openGraph,
}               from '../helper-functions/impure/open-graph'

export class UrlLink {

  /**
   *
   * Create from URL
   *
   */
  public static async create (url: string): Promise<UrlLink> {
    log.verbose('UrlLink', 'create(%s)', url)

    const meta = await openGraph(url)

    let description: string | undefined
    let imageUrl: string | undefined
    let title: string

    if (meta.image) {
      if (typeof meta.image === 'string') {
        imageUrl = meta.image
      } else if (Array.isArray(meta.image)) {
        imageUrl = meta.image[0]
      } else {
        if (Array.isArray(meta.image.url)) {
          imageUrl = meta.image.url[0]
        } else if (meta.image.url) {
          imageUrl = meta.image.url
        }
      }
    }

    if (Array.isArray(meta.title)) {
      title = meta.title[0]
    } else {
      title = meta.title
    }

    if (Array.isArray(meta.description)) {
      description = meta.description[0]
    } else if (meta.description) {
      description = meta.description
    } else {
      description = title
    }

    if (!imageUrl || !description) {
      throw new Error(`imageUrl(${imageUrl}) or description(${description}) not found!`)
    }

    if (!imageUrl.startsWith('http')) {
      const resolvedUrl = new Url.URL(imageUrl, url)
      imageUrl = resolvedUrl.toString()
    }

    const payload: UrlLinkPayload = {
      description,
      thumbnailUrl: imageUrl,
      title,
      url,
    }

    return new UrlLink(payload)
  }

  /*
   * @hideconstructor
   */
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
