#!/usr/bin/env ts-node
/**
 *   Wechaty Chatbot SDK - https://github.com/wechaty/wechaty
 *
 *   @copyright 2016 Huan LI (李卓桓) <https://github.com/huan>, and
 *                   Wechaty Contributors <https://github.com/wechaty>.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import * as readline from 'readline'

const contributeMap: {
  [contributor: string]: string[],
} = {}

function parseLine (line: string): string[] | null {
  // [\#264](https://github.com/wechaty/wechaty/pull/264) ([lijiarui](https://github.com/lijiarui))
  // const regex = /(\[\\#\d+\]\([^\)]+\))\s+(\(\[[^]]+\]\([^)]+\)))/i
  const regex = /(\[\\#\d+\])(\([^)]+\))\s+\((\[[^\]]+\]\([^)]+\))/
  const matches = regex.exec(line)
  if (!matches) {
    return null
  }
  // console.info('match!')
  // console.info(matches[1])  // [\#264]
  // console.info(matches[2])  // (https://github.com/wechaty/wechaty/pull/264)
  // console.info(matches[3])  // ([lijiarui](https://github.com/lijiarui)
  return matches
}

function processLine (line: string): void {
  const matches = parseLine(line)
  if (matches) {
    // console.info('match:', line)
    // console.info(matches)
    const link        = matches[1] + matches[2]
    const contributor = matches[3]
    // console.info('link:', link)
    // console.info('contributor:', contributor)
    if (!(contributor in contributeMap)) {
      contributeMap[contributor] = []
    }
    contributeMap[contributor].push(link)
    // console.info(contributiveness)
  } else {
    console.error('NO match:', line)
  }
}

function outputContributorMd () {
  const MIN_MAINTAINER_COMMIT_NUM = 2
  function isMaintainer (committer: string): boolean {
    return contributeMap[committer].length >= MIN_MAINTAINER_COMMIT_NUM
  }

  const activeContributorList = Object
    .keys(contributeMap)
    .filter(isMaintainer)
    .sort(desc)

  function desc (committerA: string, committerB: string): number {
    return contributeMap[committerB].length - contributeMap[committerA].length
  }

  console.info([
    '',
    '# CHANGELOG',
    '',
    '## WECHATY CONTRIBUTORS',
    '### Active Contributors',
    '',
  ].join('\n'))

  for (const contributor of activeContributorList) {
    console.info(`1. @${contributor}: ${contributeMap[contributor].join(' ')}`)
  }

  console.info([
    '',
    '### Contributors',
    '',
  ].join('\n'))

  const SKIP_NAME_LIST = [
    'snyk-bot',
    'gitter-badger',
  ]
  const SKIP_REGEX = new RegExp(SKIP_NAME_LIST.join('|'), 'i')
  for (const contributor of Object.keys(contributeMap).sort(desc)) {
    if (SKIP_REGEX.test(contributor)) {
      continue
    }
    if (!activeContributorList.includes(contributor)) {
      console.info(`1. @${contributor}: ${contributeMap[contributor].join(' ')}`)
    }
  }
  console.info()

}

async function main () {
  // https://stackoverflow.com/a/20087094/1123955
  const rl = readline.createInterface({
    input:    process.stdin,
    output:   process.stdout,
    terminal: false,
  })

  rl.on('line', processLine)
  await new Promise(resolve => rl.on('close', resolve))

  outputContributorMd()

  return 0
}

main()
  .then(process.exit)
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
