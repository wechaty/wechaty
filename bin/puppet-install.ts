#!/usr/bin/env ts-node

import { PuppetManager } from '../src/puppet-manager'

PuppetManager.installAll()
.catch(console.error)
