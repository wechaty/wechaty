/**
 * June 2018, Huan: Learned from https://github.com/krisk/Fuse/pull/129
 */
declare module "wechat4u" {
  export = Wechat4u
  export as namespace Wechat4u

  declare class Wechat4u {
    constructor(options?: Wechat4u.FuseOptions)
    contacts: WebContactRawPayload
    search<T>(pattern: string): T[]
    search(pattern: string): any[]
  }

  declare namespace Wechat4u {
    export interface Wechat4uOptions {
      id?: string
    }
  }
}
