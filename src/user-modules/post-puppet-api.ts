/* eslint-disable sort-keys */
import { PuppetMock } from 'wechaty-puppet-mock'
import { MessageType } from 'wechaty-puppet/dist/esm/src/schemas/message'
import type { Sayable } from '../interface/sayable.js'
import type { PostContentPayload } from './post-payload-list.js'

/**
 * There have three types of a Post:
 *
 *  1. Original (原创)
 *  2. Comment (评论)
 *  3. ReTweet / RePost (转发)
 *
 *  | Type             | Root ID  | Parent ID  |
 *  | ---------------- | -------- | ---------- |
 *  | Original         | n/a      | n/a        |
 *  | Comment          | `rootId` | `parentId` |
 *  | Repost / ReTweet | n/a      | `parentId` |
 *
 */
interface PostPayloadBase {
  parentId? : string  // `undefined` means it's not a retweet/repost
  rootId?   : string  // `undefined` means itself is ROOT

  contactId: string
  timestamp: number

  childCounter? : number
  tapCounter?   : number

  // The liker information need to be fetched from another API

}

interface PostPayloadClient extends PostPayloadBase {
  id?        : undefined
  contentList: PostContentPayload[]
}

interface PostPayloadServer extends PostPayloadBase {
  id        : string
  contentList: string[]  // The message id(s) for this post.
}

type PostPayload =
  | PostPayloadClient
  | PostPayloadServer

const isPostPayloadClient = (payload: PostPayload): payload is PostPayloadClient =>
  payload instanceof Object
    && !payload.id
    && Array.isArray(payload.contentList)
    && payload.contentList.length > 0
    && payload.contentList[0] instanceof Object

const isPostPayloadServer = (payload: PostPayload): payload is PostPayloadServer =>
  payload instanceof Object
    && !!payload.id
    && Array.isArray(payload.contentList)
    && payload.contentList.length > 0
    && typeof payload.contentList[0] === 'string'

enum PostTapType {
  Unspecified = 0,
  Like,
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
  ): Promise<PostPayload> {
    return {
      id,
      // parentId? : string  // `undefined` means it's not a retweet/repost
      // rootId?   : string  // `undefined` means itself is ROOT

      contactId: 'string',
      timestamp: 3412343214,

      // descendantCounter? : 0
      // tapCounter?        : number

      // The liker information need to be fetched from another API

      messageIdList: [
        'fsdaf',
      ],
    }
  }

  async postTapList (
    postId: string,
    type?: PostTapType,  // undefined means any Tap type
    pagination?: PaginationRequest,
  ): Promise<PaginationResponse<PostTapListPayload>> {
    void postId
    void type
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
    rootId: string,
    pagination?: PaginationRequest,
  ): Promise<PaginationResponse<string[]>> {
    void rootId
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
    parentId: string,
    pagination?: PaginationRequest,
  ): Promise<PaginationResponse<string[]>> {
    void parentId
    void pagination
    return {
      nextPageToken: '',
      response: [
        'id_post_xxx',
        'id_post_yyy',
      ],
    }
  }

}

export type {
  PostPayload,
  PostPayloadClient,
  PostPayloadServer,
}
export {
  PuppetPost,
  PostTapType,
  isPostPayloadClient,
  isPostPayloadServer,
}
