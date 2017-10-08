#!/usr/bin/env ts-node

const LICENSE = `/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2017 Huan LI <zixia@zixia.net>
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
 */`

import {
  createReadStream,
  createWriteStream,
  link    as linkCallback,
  unlink  as unlinkCallback,
}                             from 'fs'
import {
  Transform,
  TransformOptions,
}                             from 'stream'
import { promisify }          from 'util'

import * as globCallback      from 'glob'

class LicenseTransformer extends Transform {

  private lineBuf = ''
  private lineNum = 0

  private updating  = false
  private updated   = false

  constructor(options?: TransformOptions) {
    super(options)
  }

  public _transform(chunk, encoding, done) {
    if (this.updated) {
      this.push(chunk)
    } else {
      const updatedChunk = this.updateChunk(chunk)
      this.push(updatedChunk)
    }

    done()
  }

  private updateChunk(chunk): string {
    const buffer  = this.lineBuf + chunk.toString()
    this.lineBuf    = ''

    if (!buffer) {
      console.error('no data')
      return ''
    }

    const updatedLineList: string[] = []

    buffer
    .split(/\n/)
    .forEach(line => {
      if (this.lineNum === 0 && line.startsWith('#!')) {
        updatedLineList.push(line)
      } else if (this.updated) {
        updatedLineList.push(line)
      } else if (this.updating) {
        if (/\*\//.test(line)) {
          updatedLineList.push(line.replace(/.*\*\//, LICENSE))
          this.updating = false
          this.updated  = true
        } else {
          // drop the old comments
        }
      } else {  // not updating and not updated. searching...
        if (!line) {
          updatedLineList.push(line)
        } else if (/\s*\/\*\*/.test(line)) {  // comment start
          if (/\*\//.test(line)) {  // comment end at the same line with start
            updatedLineList.push(line.replace(/\/\*\*.*\*\//, LICENSE))
            this.updated = true
          } else {
            this.updating = true
          }
        } else {  // not a comment. INSERT here
          updatedLineList.push(LICENSE)
          updatedLineList.push(line)
          this.updated = true
        }
      }

      this.lineBuf = line
      this.lineNum++
    })

    return updatedLineList.join('\n')
  }

  public _flush(done) {
    if (this.lineBuf) {
      this.push(this.lineBuf)
      this.lineBuf = ''
    }
    done()
  }
}

async function updateLicense(file: string): Promise<void> {
  const tmpFile = file + `.${process.pid}.tmp`
  const readStream  = createReadStream(file)
  const writeStream = createWriteStream(tmpFile)
  const tranStream  = new LicenseTransformer()

  console.log(`Updating LICENSE for file ${file}...`)
  await new Promise<void>((resolve, reject) => {
    readStream
      .pipe(tranStream)
      .pipe(writeStream)
      .on('close', resolve)
  })
  await promisify(unlinkCallback)(file)
  await promisify(linkCallback)(tmpFile, file)
  await promisify(unlinkCallback)(tmpFile)
}

async function glob(pattern): Promise<string[]> {
  return promisify<string, string[]>(globCallback as any)(pattern)
}

async function main(): Promise<void> {
  const pattern = '{bin/**/*.ts,example/**/*.{js,ts},src/**/*.{ts,js},test/**/*.ts}'
  // const pattern = 't.ts'
  const srcFileList = await glob(pattern)
  const promiseList = srcFileList.map(updateLicense)
  await Promise.all(promiseList)
}

main()
