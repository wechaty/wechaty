import type { Wechaty } from './wechaty.js'

export type WechatyPluginUninstaller = () => void

export type WechatyPluginReturn = void | WechatyPluginUninstaller

export interface WechatyPlugin {
  (bot: Wechaty): WechatyPluginReturn
}

function isWechatyPluginUninstaller (
  pluginReturn: WechatyPluginReturn,
): pluginReturn is WechatyPluginUninstaller {
  return !!pluginReturn
}

export {
  isWechatyPluginUninstaller,
}
