import type {
  ProtectedPropertyWechatySkelton,
}                                   from './wechaty-skelton.js'
import {
  WechatySkelton,
}                                   from './wechaty-skelton.js'

import type {
  ProtectedPropertyGErrorMixin,
  GErrorMixin,
}                                   from './gerror-mixin.js'
import {
  gErrorMixin,
}                                   from './gerror-mixin.js'

import type {
  ProtectedPropertyPluginMixin,
  PluginMixin,
}                                   from './plugin-mixin.js'
import {
  pluginMixin,
}                                   from './plugin-mixin.js'

import type {
  ProtectedPropertyPuppetEventBridgeMixin,
  PuppetEventBridgeMixin,
}                                   from './puppet-event-bridge-mixin.js'
import {
  puppetEventBridgeMixin,
}                                   from './puppet-event-bridge-mixin.js'

import type {
  ProtectedPropertyWechatifyUserModuleMixin,
  WechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.js'
import {
  wechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.js'

type WechatyMixinProtectedProperty =
  | ProtectedPropertyWechatySkelton
  | ProtectedPropertyGErrorMixin
  | ProtectedPropertyPluginMixin
  | ProtectedPropertyPuppetEventBridgeMixin
  | ProtectedPropertyWechatifyUserModuleMixin

export type {
  GErrorMixin,
  PluginMixin,
  PuppetEventBridgeMixin,
  WechatifyUserModuleMixin,
  WechatyMixinProtectedProperty,
}
export {
  gErrorMixin,
  pluginMixin,
  puppetEventBridgeMixin,
  wechatifyUserModuleMixin,
  WechatySkelton,
}
