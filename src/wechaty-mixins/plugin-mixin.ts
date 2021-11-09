import { log }        from 'wechaty-puppet'
import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'
import {
  isWechatyPluginUninstaller,
}                             from '../plugin.js'

import type { WechatySkeleton }      from './wechaty-skeleton.js'
import type {
  WechatyInterface,
  WechatyConstructor,
}                             from '../interface/wechaty-interface.js'
import { instanceToClass } from 'clone-class'
import { WechatyImpl } from '../wechaty.js'

const pluginMixin = <MixinBase extends typeof WechatySkeleton> (mixinBase: MixinBase) => {
  log.verbose('WechatyPluginMixin', 'pluginMixin(%s)', mixinBase.name)

  abstract class PluginMixin extends mixinBase {

    static _globalPluginList: WechatyPlugin[] = []
    _pluginUninstallerList: WechatyPluginUninstaller[]

    /**
     * @param   {WechatyPlugin[]} plugins      - The plugins you want to use
     *
     * @return  {WechatyInterface}                      - this for chaining,
     *
     * @desc
     * For wechaty ecosystem, allow user to define a 3rd party plugin for the all wechaty instances
     *
     * @example
     * // Report all chat message to my server.
     *
     * function WechatyReportPlugin(options: { url: string }) {
     *   return function (this: Wechaty) {
     *     this.on('message', message => http.post(options.url, { data: message }))
     *   }
     * }
     *
     * bot.use(WechatyReportPlugin({ url: 'http://somewhere.to.report.your.data.com' })
     */
    static use (
      ...plugins:  (WechatyPlugin | WechatyPlugin[])[]
    ): WechatyConstructor {
      const pluginList = plugins.flat()
      this._globalPluginList = this._globalPluginList.concat(pluginList)
      // Huan(202110): TODO: remove any
      return this as any
    }

    constructor (...args: any[]) {
      super(...args)

      this._pluginUninstallerList = []
      this._installGlobalPlugin()
    }

    /**
     * @param   {WechatyPlugin[]} plugins      - The plugins you want to use
     *
     * @return  {WechatyInterface}                      - this for chaining,
     *
     * @desc
     * For wechaty ecosystem, allow user to define a 3rd party plugin for the current wechaty instance.
     *
     * @example
     * // The same usage with Wechaty.use().
     *
     */
    use (
      ...plugins: (
        WechatyPlugin | WechatyPlugin[]
      )[]
    ): WechatyInterface {
      const pluginList = plugins.flat() as WechatyPlugin[]
      const uninstallerList = pluginList
        .map(plugin => plugin(this as any)) // <- Huan(202110): TODO: remove any
        .filter(isWechatyPluginUninstaller)

      this._pluginUninstallerList.push(
        ...uninstallerList,
      )
      // Huan(202110): TODO: remove any
      return this as any
    }

    _installGlobalPlugin () {
      const uninstallerList = instanceToClass(this, WechatyImpl)
        ._globalPluginList
        .map(plugin => plugin(this as any)) // <- Huan(202110): TODO: remove any
        .filter(isWechatyPluginUninstaller)

      this._pluginUninstallerList.push(
        ...uninstallerList,
      )
    }

  }

  return PluginMixin
}

type PluginMixin = ReturnType<typeof pluginMixin>

type ProtectedPropertyPluginMixin =
  | '_installGlobalPlugin'
  | '_pluginUninstallerList'

export type {
  PluginMixin,
  ProtectedPropertyPluginMixin,
}
export {
  pluginMixin,
}
