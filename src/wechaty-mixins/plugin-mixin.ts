import { log }              from 'wechaty-puppet'
import { instanceToClass }  from 'clone-class'

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
import type { MiscMixin } from './misc-mixin.js'

interface Plugable {
  use (
    ...plugins: (
      | WechatyPlugin
      | WechatyPlugin[]
    )[]
  ): Plugable
}

const pluginMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin & MiscMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPluginMixin', 'pluginMixin(%s)', mixinBase.name)

  abstract class PluginMixin extends mixinBase implements Plugable {

    static __pluginList: WechatyPlugin[] = []
    __pluginList:        WechatyPlugin[] = []

    __pluginUninstallerList: WechatyPluginUninstaller[] = []

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
    ): Plugable {
      const pluginList = plugins.flat()
      this.__pluginList.push(...pluginList)

      // Huan(202110): TODO: remove any
      return this as any
    }

    constructor (...args: any[]) {
      super(...args)
    }

    /**
     * @param {WechatyPlugin[]}Interfacehaty.use().
     *
     */
    use (
      ...plugins: (
        WechatyPlugin | WechatyPlugin[]
      )[]
    ): Plugable {
      const pluginList = plugins.flat()
      log.verbose('WechatyPluginMixin', 'use() total %d plugins', pluginList.length)

      this.__pluginList.push(...pluginList)

      /**
       * If the wechaty has already been started
       *
       * @deprecated: we do not support add plugin to a started wechaty any more
       *  because it will require the state checking which is complicated.
       */
      // if (this.state.active()) {
      //   if (this.state.pending()) {
      //     log.warn('WechatyPluginMixin', 'use() called during bot is starting: the plugins might not be able to activate correctly.')
      //     /**
      //      * We do not active plugin when starting to prevent install one plugin twice
      //      *  because the plugin might be installed inside the start() method too.
      //      */
      //   } else {
      //     this.__activePlugin(pluginList)
      //   }
      // }

      return this
    }

    /**
     * @protected active the plugins
     */
    __activePlugin (pluginList: WechatyPlugin[]): void {
      log.verbose('WechatyPluginMixin', '__activePlugin(%d plugins)', pluginList.length)

      for (const plugin of pluginList) {
        log.verbose('WechatyPluginMixin', '__activePlugin() installing Plugin %s on Wechaty %s ...', plugin.name, this.name())

        const uninstaller = plugin(this as any) // <- Huan(202110): TODO: remove any
        if (isWechatyPluginUninstaller(uninstaller)) {
          log.verbose('WechatyPluginMixin', '__activePlugin() saving uninstaller for Plugin %s on Wechat %s ...', plugin.name, this.name())
          this.__pluginUninstallerList.push(uninstaller)
        }
      }

    }

    override async start (): Promise<void> {
      log.verbose('WechatyPluginMixin', 'start()')
      await super.start()

      const pluginList = [
        ...instanceToClass(this, PluginMixin).__pluginList,
        ...this.__pluginList,
      ]

      log.verbose('WechatyPluginMixin', 'start() installing plugins(global/%d, instance/%d) ...',
        instanceToClass(this, PluginMixin).__pluginList.length,
        this.__pluginList.length,
      )

      this.__activePlugin(pluginList)

      log.verbose('WechatyPluginMixin', 'start() installing plugins(global/%d, instance/%d) ... done',
        instanceToClass(this, PluginMixin).__pluginList.length,
        this.__pluginList.length,
      )
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyPluginMixin', 'stop() uninstall plugins (total: %d) ...', this.__pluginUninstallerList.length)

      this.__pluginUninstallerList.forEach(setImmediate)
      this.__pluginUninstallerList.length = 0

      log.verbose('WechatyPluginMixin', 'stop() uninstall plugins ... done', this.__pluginUninstallerList.length)

      await super.stop()
    }

  }

  return PluginMixin
}

type PluginMixin = ReturnType<typeof pluginMixin>

type ProtectedPropertyPluginMixin =
  | '__activePlugin'
  | '__pluginList'
  | '__pluginUninstallerList'

export {
  type Plugable,
  type PluginMixin,
  type ProtectedPropertyPluginMixin,
  pluginMixin,
}
