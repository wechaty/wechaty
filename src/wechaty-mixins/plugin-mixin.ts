import { log }              from 'wechaty-puppet'

import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'
import {
  isWechatyPluginUninstaller,
}                             from '../plugin.js'

import type {
  WechatySkeleton,
}                       from '../wechaty/mod.js'

import type { GErrorMixin } from './gerror-mixin.js'
import type { MiscMixin }   from './misc-mixin.js'

interface Plugable {
  use (
    ...plugins: (
      | WechatyPlugin
      | WechatyPlugin[]
    )[]
  ): WechatyPluginUninstaller
}

const pluginMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin & MiscMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPluginMixin', 'pluginMixin(%s)', mixinBase.name)

  abstract class PluginMixin extends mixinBase implements Plugable {

    constructor (...args: any[]) {
      super(...args)
    }

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
    use (
      ...plugins: (
        WechatyPlugin | WechatyPlugin[]
      )[]
    ): WechatyPluginUninstaller {
      const pluginList = plugins.flat()
      log.verbose('WechatyPluginMixin', 'use() total %d plugins', pluginList.length)

      const uninstallerList: WechatyPluginUninstaller[] = []

      for (const plugin of pluginList) {
        log.verbose('WechatyPluginMixin', 'use() installing Plugin %s on Wechaty %s ...', plugin.name, this.name())

        const uninstaller = plugin(this as any) // <- Huan(202110): TODO: remove any
        if (isWechatyPluginUninstaller(uninstaller)) {
          log.verbose('WechatyPluginMixin', 'use() saving uninstaller for Plugin %s on Wechaty %s ...', plugin.name, this.name())
          uninstallerList.push(uninstaller)
        }
      }

      /**
       * Return the function to uninstall all plugins
       */
      return () => uninstallerList.forEach(uninstaller => {
        log.verbose('WechatyPluginMixin', 'use() uninstalling Plugin %s on Wechaty %s ...', uninstaller.name, this.name())
        uninstaller()
        log.verbose('WechatyPluginMixin', 'use() uninstalling Plugin %s on Wechaty %s ... done', uninstaller.name, this.name())
      })
    }

  }

  return PluginMixin
}

type PluginMixin = ReturnType<typeof pluginMixin>

type ProtectedPropertyPluginMixin = never

export {
  type Plugable,
  type PluginMixin,
  type ProtectedPropertyPluginMixin,
  pluginMixin,
}
