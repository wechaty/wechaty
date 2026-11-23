import { log } from '../config.js'

import type { PuppetSkeleton }   from '../puppet/puppet-skeleton.js'

const tagMixin = <MixinBase extends typeof PuppetSkeleton>(mixinBase: MixinBase) => {

  abstract class TagMixin extends mixinBase {

    constructor (...args: any[]) {
      super(...args)
      log.verbose('PuppetTagMixin', 'constructor()')
    }

    /**
     *
     * Tag
     *  tagContactAdd - add a tag for a Contact. Create it first if it not exist.
     *  tagContactRemove - remove a tag from the Contact
     *  tagContactDelete - delete a tag from Wechat
     *  tagContactList(id) - get tags from a specific Contact
     *  tagContactList() - get tags from all Contacts
     *
     */
    abstract tagContactAdd (tagId: string, contactId: string)    : Promise<void>
    abstract tagContactDelete (tagId: string)                    : Promise<void>
    abstract tagContactList (contactId: string)                  : Promise<string[]>
    abstract tagContactList ()                                   : Promise<string[]>
    abstract tagContactRemove (tagId: string, contactId: string) : Promise<void>

  }

  return TagMixin
}

type ProtectedPropertyTagMixin = never

export type {
  ProtectedPropertyTagMixin,
}
export { tagMixin }
