/* eslint-disable sort-keys */
import { PuppetMock } from 'wechaty-puppet-mock'
import type { SayablePayload } from './post-sayable-payload-list.js'

/**
 * There have three types of a Post:
 *
 *  1. Original (原创)
 *  2. Reply (评论, comment)
 *  3. RePost (转发, retweet)
 *
 *  | Type     | Root ID  | Parent ID  |
 *  | ---------| -------- | ---------- |
 *  | Original | n/a      | n/a        |
 *  | Reply    | `rootId` | `parentId` |
 *  | Repost   | n/a      | `parentId` |
 *
 */
interface PostPayloadBase {
  parentId? : string  // `undefined` means it's original
  rootId?   : string  // `undefined` means it's not a reply (original or repost)
}

interface PostPayloadClient extends PostPayloadBase {
  id?        : undefined
  sayableList: SayablePayload[]
}

interface PostPayloadServer extends PostPayloadBase {
  id         : string
  sayableList: string[]  // The message id(s) for this post.

  contactId: string
  timestamp: number

  descendantNum : number
  tapNum        : number

  // The tap(i.e., liker) information need to be fetched from another API
}

type PostPayload =
  | PostPayloadClient
  | PostPayloadServer

const isPostPayloadClient = (payload: PostPayload): payload is PostPayloadClient =>
  payload instanceof Object
    && !payload.id
    && Array.isArray(payload.sayableList)
    && payload.sayableList.length > 0
    && payload.sayableList[0] instanceof Object
    && typeof payload.sayableList[0].type !== 'undefined'

const isPostPayloadServer = (payload: PostPayload): payload is PostPayloadServer =>
  payload instanceof Object
    && !!payload.id
    && Array.isArray(payload.sayableList)
    && payload.sayableList.length > 0
    && typeof payload.sayableList[0] === 'string'

/**
 * Huan(202201): This enum type value MUST be keep unchanged across versions
 *  because the puppet service client/server might has different versions of the puppet
 */
enum PostTapType {
  Unspecified = 0,
  Like        = 1,
}

type PostTapListPayload = {
  [key in PostTapType]?: {
    contactId: string[]
    timestamp: number[]
  }
}

/**
 * Google Cloud APIs - Common design patterns  - List Pagination
 * @see https://cloud.google.com/apis/design/design_patterns#list_pagination
 */
interface PaginationRequest {
  pageSize?      : number
  pageToken?     : string
}

interface PaginationResponse<T> {
  nextPageToken? : string
  response: T
}

class PuppetPost extends PuppetMock {

  async postTap (postId: string, type: PostTapType): Promise<boolean>
  async postTap (postId: string, type: PostTapType, tap: boolean): Promise<void>

  async postTap (
    postId : string,
    type   : PostTapType,
    tap?   : boolean,
  ): Promise<void | boolean> {
    void postId
    void type
    void tap
    return true
  }

  async postPayload (
    id: string,
  ): Promise<PostPayloadServer> {
    return {
      id,
      parentId : undefined,
      rootId   : undefined,

      contactId: 'string_contact_id',
      timestamp: 3412343214,

      descendantNum : 0,
      tapNum        : 0,
      // The liker information need to be fetched from another API

      sayableList: [
        'fsdaf',
      ],
    }
  }

  async postTapList (
    postId     : string,
    contactId? : string,
    type?      : PostTapType,
    pagination?: PaginationRequest,
  ): Promise<PaginationResponse<PostTapListPayload>> {
    void postId
    void type
    void contactId
    void pagination
    return {
      nextPageToken: '',
      response: {
        [PostTapType.Like]: {
          contactId: ['id_contact_xxx'],
          timestamp: [12341431],
        },
      },
    }
  }

  async postRootList (
    rootId      : string,
    contactId?  : string,
    pagination? : PaginationRequest,
  ): Promise<PaginationResponse<string[]>> {
    void rootId
    void contactId
    void pagination
    return {
      nextPageToken: '',
      response: [
        'id_post_xxx',
        'id_post_yyy',
      ],
    }
  }

  async postParentList (
    parentId    : string,
    contactId?  : string,
    pagination? : PaginationRequest,
  ): Promise<PaginationResponse<string[]>> {
    void parentId
    void contactId
    void pagination
    return {
      nextPageToken: '',
      response: [
        'id_post_xxx',
        'id_post_yyy',
      ],
    }
  }

  async postSend (payload: PostPayload): Promise<void | string> {
    void payload
  }

}

export type {
  PostPayload,
  PostPayloadClient,
  PostPayloadServer,
  PaginationRequest,
  PaginationResponse,
  PostTapListPayload,
}
export {
  PuppetPost,
  PostTapType,
  isPostPayloadClient,
  isPostPayloadServer,
}
