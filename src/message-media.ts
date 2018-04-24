import {
  Readable,
}                 from 'stream'

import Contact  from './contact'
import Message  from './message'
import Room     from './room'

/**
 * Meidia Type Message
 *
 */
export abstract class MediaMessage extends Message {
  /**
   * @private
   */
  public toString() {
    return `MediaMessage<${this.filename()}>`
  }

  /**
   * Get the MediaMessage file extension, etc: `jpg`, `gif`, `pdf`, `word` ..
   *
   * @returns {string}
   * @example
   * bot.on('message', async function (m) {
   *   if (m instanceof MediaMessage) {
   *     console.log('media message file name extention is: ' + m.ext())
   *   }
   * })
   */
  public abstract ext(): string

  /**
   * return the MIME Type of this MediaMessage
   *
   */
  public abstract  mimeType(): string | null

  /**
   * Get the MediaMessage filename, etc: `how to build a chatbot.pdf`..
   *
   * @returns {string}
   * @example
   * bot.on('message', async function (m) {
   *   if (m instanceof MediaMessage) {
   *     console.log('media message file name is: ' + m.filename())
   *   }
   * })
   */
  public abstract filename(): string

  /**
   * Get the read stream for attachment file
   */
  public abstract async readyStream(): Promise<Readable>

  public abstract async forward(to: Room | Contact): Promise<void>
}

export default MediaMessage
