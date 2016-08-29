#!/usr/bin/env node

const { Wechaty } = require('..')

const w = new Wechaty()
console.log(w.version())
