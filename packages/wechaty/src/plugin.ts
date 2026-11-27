import type { LifecycleScope } from 'scopelet'
import type { Wechaty } from './wechaty/mod.ts'

export type WechatyPluginUninstaller = () => void

export type WechatyPluginReturn = void | WechatyPluginUninstaller

export interface WechatyPlugin {
  (bot: Wechaty): WechatyPluginReturn
}

/** A plugin bound to a {@link Wechaty} generation's {@link LifecycleScope}. */
export interface WechatyScopedPlugin {
  (bot: Wechaty, scope: LifecycleScope): WechatyPluginReturn
}

function isWechatyPluginUninstaller (
  pluginReturn: WechatyPluginReturn,
): pluginReturn is WechatyPluginUninstaller {
  return typeof pluginReturn === 'function'
}

export {
  isWechatyPluginUninstaller,
}
