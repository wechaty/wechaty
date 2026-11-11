import type { WechatyInterface } from './wechaty/mod.ts'

export type WechatyPluginUninstaller = () => void

export type WechatyPluginReturn = void | WechatyPluginUninstaller

export interface WechatyPlugin {
  (bot: WechatyInterface): WechatyPluginReturn
}

function isWechatyPluginUninstaller (
  pluginReturn: WechatyPluginReturn,
): pluginReturn is WechatyPluginUninstaller {
  return typeof pluginReturn === 'function'
}

export {
  isWechatyPluginUninstaller,
}
