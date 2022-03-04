#!/usr/bin/env node
import { OFFICIAL_PUPPET_DEPENDENCIES } from '../src/puppet-config.js'

async function main () {
  const puppetNameList = Object.keys(OFFICIAL_PUPPET_DEPENDENCIES)
  const publicNameList = puppetNameList.filter(name => /^[^@]/.test(name))
  const urlPath = publicNameList.join('-vs-')
  const url = 'https://www.npmtrends.com/' + urlPath
  console.info(url)
}

main()
  .catch(console.error)
