import { log }              from 'wechaty-puppet'
import { instanceToClass }  from 'clone-class'

import type {
  WechatyPlugin,
  WechatyPluginUninstaller,
}                             from '../plugin.js'
import {
  isWechatyPluginUninstaller,
}                             from '../plugin.js'

import {
  WechatyImpl,
  WechatySkeleton,
}                       from '../wechaty/mod.js'

import type { GErrorMixin } from './gerror-mixin.js'

interface Plugable {
  use (
    ...plugins: (
      | WechatyPlugin
      | WechatyPlugin[]
    )[]
  ): Plugable
}

const pluginMixin = <MixinBase extends typeof WechatySkeleton & GErrorMixin> (mixinBase: MixinBase) => {
  log.verbose('WechatyPluginMixin', 'pluginMixin(%s)', mixinBase.name)

  abstract class PluginMixin extends mixinBase {

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

      return this
    }

    override async start (): Promise<void> {
      log.verbose('WechatyPluginMixin', 'start()')
      await super.start()

      const pluginList = [
        ...instanceToClass(this, WechatyImpl).__pluginList,
        ...this.__pluginList,
      ]

      log.verbose('WechatyPluginMixin', 'start() installing plugins(global/%d, instance/%d) ...',
        instanceToClass(this, WechatyImpl).__pluginList.length,
        this.__pluginList.length,
      )

      const uninstallerList = pluginList
        .map(plugin => plugin(this as any)) // <- Huan(202110): TODO: remove any
        .filter(isWechatyPluginUninstaller)

      this.__pluginUninstallerList.push(
        ...uninstallerList,
      )

      log.verbose('WechatyPluginMixin', 'start() installing plugins(global/%d, instance/%d) ... done',
        instanceToClass(this, WechatyImpl).__pluginList.length,
        this.__pluginList.length,
      )
    }

    override async stop (): Promise<void> {
      log.verbose('WechatyPluginMixin', 'stop() uninstall %d plugins ...', this.__pluginUninstallerList.length)

      this.__pluginUninstallerList.forEach(setImmediate)
      this.__pluginUninstallerList.length = 0

      log.verbose('WechatyPluginMixin', 'stop() uninstall %d plugins ... done', this.__pluginUninstallerList.length)

      await super.stop()
    }

  }

  return PluginMixin
}

type PluginMixin = ReturnType<typeof pluginMixin>

type ProtectedPropertyPluginMixin =
  | '__pluginList'
  | '__pluginUninstallerList'

export {
  type Plugable,
  type PluginMixin,
  type ProtectedPropertyPluginMixin,
  pluginMixin,
}
