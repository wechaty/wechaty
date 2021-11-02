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
import { Contact } from './contact.js'

import {
  VideoPostPayload,
  log,
}                   from 'wechaty-puppet'

class VideoPost {

  /**
   *
   * Create
   *
   */
  public static async create (): Promise<VideoPost> {
    log.verbose('VideoPost', 'create()')

    const payload: VideoPostPayload = {
      authorId: 'todo',
      coverageUrl: 'todo',
      title: 'todo',
      videoUrl: 'todo',
    }

    return new VideoPost(payload)
  }

  /*
   * @hideconstructor
   */
  constructor (
    public readonly payload: VideoPostPayload,
  ) {
    log.verbose('VideoPost', 'constructor()')
  }

  public async author (): Promise<Contact> {
    const author = Contact.load(this.payload.authorId)
    await author.sync()
    return author
  }

  public coverageUrl (): string {
    return this.payload.coverageUrl
  }

  public videoUrl (): string {
    return this.payload.videoUrl
  }

  public title (): string {
    return this.payload.title
  }

}

function wechatifyVideoPost (_: any): typeof VideoPost {

  return VideoPost

}

export {
  VideoPost,
  wechatifyVideoPost,
}
