#!/usr/bin/env node

const { Wechaty } = require('wechaty')

async function main() {
  const bot = Wechaty.instance()
  try {
    await bot.init()
    console.log(`Wechaty v${bot.version()} smoking test passed.`)
  } catch (e) {
    console.error(e)
    // Error!
    return 1
  } finally {
    await bot.quit()
  }
  return 0
}

main()
.then(process.exit)
.catch(e => {
  console.error(e)
  process.exit(1)
})
