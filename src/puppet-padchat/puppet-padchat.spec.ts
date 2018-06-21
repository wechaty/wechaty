#!/usr/bin/env ts-node

// tslint:disable:no-shadowed-variable
import test  from 'blue-tape'

import { PuppetPadchat } from './puppet-padchat'
import { MemoryCard } from 'memory-card'

// class PuppetPadchatTest extends PuppetPadchat {
// }

test('PuppetPadchat() throw exception when instanciate the second instance without options.token', async t => {
  t.doesNotThrow(() => new PuppetPadchat({
    memory: new MemoryCard(),
  }), 'should instance the 1st puppet without problem')

  t.throws(() => new PuppetPadchat({
    memory: new MemoryCard(),
  }), 'should throw when instance the 2nd instance without the token option')

  t.doesNotThrow(() => new PuppetPadchat({
    memory: new MemoryCard(),
    token: 'mock-token',
  }), 'should instance the 3rd puppet with token option')
})
