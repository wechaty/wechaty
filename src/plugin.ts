import type { WechatyInterface } from './wechaty/mod.js'

export type WechatyPluginUninstaller = () => void

export type WechatyPluginReturn = void | WechatyPluginUninstaller

export interface WechatyPlugin {
  (bot: WechatyInterface): WechatyPluginReturn
}

function isWechatyPluginUninstaller (
  pluginReturn: WechatyPluginReturn,
): pluginReturn is WechatyPluginUninstaller {
  return !!pluginReturn
}

export {
  isWechatyPluginUninstaller,
}
