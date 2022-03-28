import {
  type FileBoxInterface,
  FileBox,
}                     from 'file-box'

import {
  log,
}                       from '../config.js'

import type {
  ImageType,
}                                 from '../schemas/image.js'
import type {
  MessagePayload,
  MessagePayloadFilterFunction,
  MessageQueryFilter,
  MessageType,
}                                 from '../schemas/message.js'
import type {
  UrlLinkPayload,
}                                 from '../schemas/url-link.js'
import type {
  MiniProgramPayload,
}                                 from '../schemas/mini-program.js'
import type {
  LocationPayload,
}                                 from '../schemas/location.js'
import type {
  PostPayload,
}                                 from '../schemas/post.js'

import type { PuppetSkeleton }    from '../puppet/puppet-skeleton.js'
import { DirtyType }              from '../schemas/dirty.js'

import type { CacheMixin }        from './cache-mixin.js'
import {
  type SayablePayload,
  sayableTypes,
}                                 from '../schemas/sayable.js'

const filebox = (filebox: string | FileBoxInterface) => typeof filebox === 'string' ? FileBox.fromJSON(filebox) : filebox

const messageMixin = <MinxinBase extends typeof PuppetSkeleton & CacheMixin>(baseMixin: MinxinBase) => {

  abstract class MessageMixin extends baseMixin {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetMessageMixin', 'constructor()')
    }

    /**
     *
     * Conversation
     *
     */
    abstract conversationReadMark (conversationId: string, hasRead?: boolean) : Promise<void | boolean>

    /**
    *
    * Message
    *
    */
    abstract messageContact      (messageId: string)                       : Promise<string>
    abstract messageFile         (messageId: string)                       : Promise<FileBoxInterface>
    abstract messageImage        (messageId: string, imageType: ImageType) : Promise<FileBoxInterface>
    abstract messageMiniProgram  (messageId: string)                       : Promise<MiniProgramPayload>
    abstract messageUrl          (messageId: string)                       : Promise<UrlLinkPayload>
    abstract messageLocation     (messageId: string)                       : Promise<LocationPayload>

    abstract messageForward         (conversationId: string, messageId: string,)                     : Promise<void | string>
    abstract messageSendContact     (conversationId: string, contactId: string)                      : Promise<void | string>
    abstract messageSendFile        (conversationId: string, file: FileBoxInterface)                 : Promise<void | string>
    abstract messageSendLocation    (conversationId: string, locationPayload: LocationPayload)       : Promise<void | string>
    abstract messageSendMiniProgram (conversationId: string, miniProgramPayload: MiniProgramPayload) : Promise<void | string>
    abstract messageSendPost        (conversationId: string, postPayload: PostPayload)               : Promise<void | string>
    abstract messageSendText        (conversationId: string, text: string, mentionIdList?: string[]) : Promise<void | string>
    abstract messageSendUrl         (conversationId: string, urlLinkPayload: UrlLinkPayload)         : Promise<void | string>

    abstract messageRecall (messageId: string) : Promise<boolean>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract messageRawPayload (messageId: string)     : Promise<any>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    abstract messageRawPayloadParser (rawPayload: any) : Promise<MessagePayload>

    /**
     * Issue #155 - https://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    messagePayloadCache (messageId: string): undefined | MessagePayload {
      // log.silly('PuppetMessageMixin', 'messagePayloadCache(id=%s) @ %s', messageId, this)
      if (!messageId) {
        throw new Error('no id')
      }
      const cachedPayload = this.cache.message.get(messageId)
      if (cachedPayload) {
        // log.silly('PuppetMessageMixin', 'messagePayloadCache(%s) cache HIT', messageId)
      } else {
        log.silly('PuppetMessageMixin', 'messagePayloadCache(%s) cache MISS', messageId)
      }

      return cachedPayload
    }

    async messagePayload (
      messageId: string,
    ): Promise<MessagePayload> {
      log.verbose('PuppetMessageMixin', 'messagePayload(%s)', messageId)

      if (!messageId) {
        throw new Error('no id')
      }

      /**
      * 1. Try to get from cache first
      */
      const cachedPayload = this.messagePayloadCache(messageId)
      if (cachedPayload) {
        return cachedPayload
      }

      /**
      * 2. Cache not found
      */
      const rawPayload = await this.messageRawPayload(messageId)
      const payload    = await this.messageRawPayloadParser(rawPayload)

      this.cache.message.set(messageId, payload)
      log.silly('PuppetMessageMixin', 'messagePayload(%s) cache SET', messageId)

      return payload
    }

    messageList (): string[] {
      log.verbose('PuppetMessageMixin', 'messageList()')
      return [...this.cache.message.keys()]
    }

    async messageSearch (
      query?: MessageQueryFilter,
    ): Promise<string[] /* Message Id List */> {
      log.verbose('PuppetMessageMixin', 'messageSearch(%s)', JSON.stringify(query))

      /**
       * Huan(202110): optimize for search id
       */
      if (query?.id) {
        try {
          // make sure the room id has valid payload
          await this.messagePayload(query.id)
          return [query.id]
        } catch (e) {
          log.verbose('PuppetMessageMixin', 'messageSearch() payload not found for id "%s"', query.id)
          return []
        }
      }

      /**
       * Deal with non-id queries
       */
      const allMessageIdList: string[] = this.messageList()
      log.silly('PuppetMessageMixin', 'messageSearch() allMessageIdList.length=%d', allMessageIdList.length)

      if (!query || Object.keys(query).length <= 0) {
        return allMessageIdList
      }

      const messagePayloadList: MessagePayload[] = await Promise.all(
        allMessageIdList.map(
          id => this.messagePayload(id),
        ),
      )

      const filterFunction = this.messageQueryFilterFactory(query)

      const messageIdList = messagePayloadList
        .filter(filterFunction)
        .map(payload => payload.id)

      log.silly('PuppetMessageMixin', 'messageSearch() messageIdList filtered. result length=%d', messageIdList.length)

      return messageIdList
    }

    /**
     * Issue #155 - Mixin: Property 'messageRawPayload' of exported class expression may not be private or protected.ts(4094)
     *  @seehttps://github.com/wechaty/puppet/issues/155
     *
     * @protected
     */
    messageQueryFilterFactory (
      query: MessageQueryFilter,
    ): MessagePayloadFilterFunction {
      log.verbose('PuppetMessageMixin', 'messageQueryFilterFactory(%s)',
        JSON.stringify(query),
      )

      if (Object.keys(query).length <= 0) {
        throw new Error('query empty')
      }

      const filterFunctionList: MessagePayloadFilterFunction[] = []

      const filterKeyList = Object.keys(query) as Array<keyof MessageQueryFilter>

      for (const filterKey of filterKeyList) {
        // TypeScript bug: have to set `undefined | string | RegExp` at here, or the later code type check will get error
        const filterValue: undefined | string | MessageType | RegExp = query[filterKey]
        if (!filterValue) {
          throw new Error('filterValue not found for filterKey: ' + filterKey)
        }

        let filterFunction: MessagePayloadFilterFunction

        if (filterValue instanceof RegExp) {
          filterFunction = (payload: MessagePayload) => filterValue.test(payload[filterKey] as string)
        } else { // if (typeof filterValue === 'string') {
          filterFunction = (payload: MessagePayload) => filterValue === payload[filterKey]
        }

        filterFunctionList.push(filterFunction)
      }

      const allFilterFunction: MessagePayloadFilterFunction = payload => filterFunctionList.every(func => func(payload))

      return allFilterFunction
    }

    async messagePayloadDirty (
      id: string,
    ): Promise<void> {
      log.verbose('PuppetMessageMixin', 'messagePayloadDirty(%s)', id)

      await this.__dirtyPayloadAwait(
        DirtyType.Message,
        id,
      )
    }

    /**
     * send a sayable payload for event driven API and convenience
     *
     * @param conversationId
     * @param sayable
     * @returns
     */
    messageSend (
      conversationId: string,
      sayable: SayablePayload,
    ): Promise<void | string> {
      log.verbose('PuppetMessageMixin', 'messageSend(%s, {type:%s})', conversationId, sayable.type)

      switch (sayable.type) {
        case sayableTypes.Attachment:
        case sayableTypes.Audio:
        case sayableTypes.Emoticon:
        case sayableTypes.Image:
        case sayableTypes.Video:
          return this.messageSendFile(conversationId, filebox(sayable.payload.filebox))
        case sayableTypes.Contact:
          return this.messageSendContact(conversationId, sayable.payload.contactId)
        case sayableTypes.Location:
          return this.messageSendLocation(conversationId, sayable.payload)
        case sayableTypes.MiniProgram:
          return this.messageSendMiniProgram(conversationId, sayable.payload)
        case sayableTypes.Url:
          return this.messageSendUrl(conversationId, sayable.payload)
        case sayableTypes.Text:
          return this.messageSendText(conversationId, sayable.payload.text, sayable.payload.mentions)
        case sayableTypes.Post:
          return this.messageSendPost(conversationId, sayable.payload)
        default:
          throw new Error('unsupported sayable payload: ' + JSON.stringify(sayable))
      }
    }

  }

  return MessageMixin
}

type MessageMixin = ReturnType<typeof messageMixin>

type ProtectedPropertyMessageMixin =
  | 'messagePayloadCache'
  | 'messageQueryFilterFactory'
  | 'messageRawPayload'
  | 'messageRawPayloadParser'

export type {
  MessageMixin,
  ProtectedPropertyMessageMixin,
}
export { messageMixin }
