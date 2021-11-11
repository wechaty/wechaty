import { log }        from 'wechaty-puppet'
import { instanceToClass } from 'clone-class'

import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'
import {
  isWechatyPluginUninstaller,
}                             from '../plugin.js'

import type {
  WechatyInterface,
  WechatyConstructor,
}                       from '../wechaty/mod.js'
import {
  WechatyImpl,
  WechatySkeleton,
}                       from '../wechaty/mod.js'
import type { GErrorMixin } from './gerror-mixin.js'

const pluginMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin> (mixinBase: MixinBase) => {
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
     * @param   {WechatyPlugin[]}Interfacehaty.use().
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

    override async stop (): Promise<void> {
      log.verbose('WechatyPluginMixin', 'stop()')

      try {
        /**
         * Uninstall Plugins
         *  no matter the state is `ON` or `OFF`.
         */

        // Huan(202111): it seems that once the plugin has been install,
        //  we should not remove it inside the stop()?
        //  FIXME: to be confirmed

        // while (this._pluginUninstallerList.length > 0) {
        //   const uninstaller = this._pluginUninstallerList.pop()
        //   log.verbose('WechatyPluginMixin', 'stop() uninstalling plugin #%s ...', this._pluginUninstallerList.length)
        //   if (uninstaller) uninstaller()
        //   log.verbose('WechatyPluginMixin', 'stop() uninstalling plugin #%s ... done', this._pluginUninstallerList.length)
        // }
      } catch (e) {
        this.emitError(e)
      }

      await super.stop()
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
