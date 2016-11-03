#!/usr/bin/env node

import { Wechaty } from '../'

const w = Wechaty.instance()
console.log(w.version())
