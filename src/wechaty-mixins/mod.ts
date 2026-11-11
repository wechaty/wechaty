import type {
  ProtectedPropertyGErrorMixin,
  GErrorMixin,
}                                   from './gerror-mixin.ts'
import {
  gErrorMixin,
}                                   from './gerror-mixin.ts'

import type {
  ProtectedPropertyPluginMixin,
  PluginMixin,
}                                   from './plugin-mixin.ts'
import {
  pluginMixin,
}                                   from './plugin-mixin.ts'

import type {
  ProtectedPropertyPuppetMixin,
  PuppetMixin,
}                                   from './puppet-mixin.ts'
import {
  puppetMixin,
}                                   from './puppet-mixin.ts'

import type {
  ProtectedPropertyWechatifyUserModuleMixin,
  WechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.ts'
import {
  wechatifyUserModuleMixin,
}                                   from './wechatify-user-module-mixin.ts'

import type {
  ProtectedPropertyIoMixin,
  IoMixin,
}                                   from './io-mixin.ts'
import {
  ioMixin,
}                                   from './io-mixin.ts'

import type {
  ProtectedPropertyMiscMixin,
  MiscMixin,
}                                   from './misc-mixin.ts'
import {
  miscMixin,
}                                   from './misc-mixin.ts'

import type {
  ProtectedPropertyLoginMixin,
  LoginMixin,
}                                   from './login-mixin.ts'
import {
  loginMixin,
}                                   from './login-mixin.ts'

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
