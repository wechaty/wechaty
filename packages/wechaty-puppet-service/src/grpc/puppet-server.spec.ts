#!/usr/bin/env ts-node

import { test }  from 'tstest'

import { PuppetHostieGrpcServer, PuppetHostieGrpcServerOptions } from './puppet-server'
import { Puppet } from 'wechaty-puppet'

test('version()', async (t) => {
  const options: PuppetHostieGrpcServerOptions = {
    endpoint : '127.0.0.1:8788',
    puppet   : {} as Puppet,
    token    : 'secret',
  }

  const puppet = new PuppetHostieGrpcServer(options)
  t.ok(puppet.version())
})
