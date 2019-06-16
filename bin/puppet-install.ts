#!/usr/bin/env ts-node

import { PuppetManager } from '../src/puppet-manager'

PuppetManager.installAll()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
