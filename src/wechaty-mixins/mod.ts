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
  ProtectedPropertyPuppetMixin,
  PuppetMixin,
}                                   from './puppet-mixin.js'
import {
  puppetMixin,
}                                   from './puppet-mixin.js'

import type {
  ProtectedPropertyWechatifyUserModuleMixin,
  WechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.js'
import {
  wechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.js'

import type {
  ProtectedPropertyIoMixin,
  IoMixin,
}                                   from './io-mixin.js'
import {
  ioMixin,
}                                   from './io-mixin.js'

import type {
  ProtectedPropertyMiscMixin,
  MiscMixin,
}                                   from './misc-mixin.js'
import {
  miscMixin,
}                                   from './misc-mixin.js'

import type {
  ProtectedPropertyLoginMixin,
  LoginMixin,
}                                   from './login-mixin.js'
import {
  loginMixin,
}                                   from './login-mixin.js'

type WechatyMixinProtectedProperty =
  | ProtectedPropertyGErrorMixin
  | ProtectedPropertyIoMixin
  | ProtectedPropertyLoginMixin
  | ProtectedPropertyMiscMixin
  | ProtectedPropertyPluginMixin
  | ProtectedPropertyPuppetMixin
  | ProtectedPropertyWechatifyUserModuleMixin

export type {
  GErrorMixin,
  IoMixin,
  LoginMixin,
  MiscMixin,
  PluginMixin,
  PuppetMixin,
  WechatifyUserModuleMixin,
  WechatyMixinProtectedProperty,
}
export {
  gErrorMixin,
  ioMixin,
  loginMixin,
  miscMixin,
  pluginMixin,
  puppetMixin,
  wechatifyUserModuleMixin,
}
