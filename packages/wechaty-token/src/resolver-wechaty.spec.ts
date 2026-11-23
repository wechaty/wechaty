#!/usr/bin/env -S node --no-warnings --loader ts-node/esm

import {
  test,
  sinon,
}             from 'tstest'

import {
  ServiceConfig,
  StatusObject,
  TcpSubchannelAddress,
  parseUri,
  resolverManager,
}                           from './grpc-js.js'

import { WechatyToken } from './wechaty-token.js'
import {
  WechatyResolver,
}                   from './resolver-wechaty.js'

test('wechaty resolver smoke testing', async t  => {
  const TOKEN = '__token__'
  const HOST = '10.1.2.3'
  const PORT = 1024

  const sandbox = sinon.createSandbox()

  const discoverStub = sandbox.stub(WechatyToken.prototype, 'discover')
  discoverStub.resolves({
    host: HOST,
    port: PORT,
  })

  WechatyResolver.setup()
  const target = resolverManager.mapUriDefaultScheme(
    parseUri(`wechaty:///${TOKEN}`)!,
  )!

  t.equal(target.authority, '',         'should get empty authority')
  t.equal(target.scheme,    'wechaty',  'should get schema')
  t.equal(target.path,      TOKEN,      'should get token')

  const rr = {} as any
  const future = new Promise<TcpSubchannelAddress[]>((resolve, reject) => {
    rr.resolve = resolve
    rr.reject = reject
  })

  const listener: resolverManager.ResolverListener = {
    onError: (error: StatusObject) => {
      rr.reject(new Error(`Failed with status ${error.details}`))
    },
    onSuccessfulResolution: (
      addressList         : TcpSubchannelAddress[],
      _serviceConfig      : ServiceConfig | null,
      _serviceConfigError : StatusObject | null,
    ) => {
      // Only handle the first resolution result
      listener.onSuccessfulResolution = () => {}
      rr.resolve(addressList)
    },
  }
  const resolver = resolverManager.createResolver(target, listener, {})
  resolver.updateResolution()

  const result = await future

  t.same(result[0]!.host, HOST, 'should get puppet server host')
  t.same(result[0]!.port, PORT, 'should get puppet server port')

  sandbox.restore()
})

test('wechaty resolver with custom authority', async t  => {
  const AUTHORITY = 'custom.authority.com'

  const rr = {} as any
  const future = new Promise<TcpSubchannelAddress[]>((resolve, reject) => {
    rr.resolve = resolve
    rr.reject = reject
  })

  const sandbox = sinon.createSandbox()
  sandbox.stub(WechatyToken.prototype, 'discover')
    .callsFake(
      function (
        this: WechatyToken,
      ) {
        rr.resolve(this.authority)
        return Promise.resolve({
          host: '1.1.1.1',
          port: 10,
        })
      },
    )

  WechatyResolver.setup()
  const target = resolverManager.mapUriDefaultScheme(
    parseUri(`wechaty://${AUTHORITY}/token`)!,
  )!

  const listener: resolverManager.ResolverListener = {
    onError: () => {},
    onSuccessfulResolution: () => {},
  }
  const resolver = resolverManager.createResolver(target, listener, {})
  resolver.updateResolution()

  const result = await future

  t.equal(result, AUTHORITY, 'should pass authority down to WechatyToken')

  sandbox.restore()
})
