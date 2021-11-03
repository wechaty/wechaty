/* eslint-disable sort-keys */
import { PuppetMock } from 'wechaty-puppet-mock'
import type { Sayable } from '../interface/sayable.js'

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
interface PostPayload {
  id        : string
  parentId? : string  // `undefined` means it's not a retweet/repost
  rootId?   : string  // `undefined` means itself is ROOT

  contactId: string
  timestamp: number

  descendantCounter? : number
  tapCounter?        : number

  // The liker information need to be fetched from another API

  messageIdList: (Sayable | string)[]  // The message id for this post.
}

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
}
export {
  PuppetPost,
  PostTapType,
}
