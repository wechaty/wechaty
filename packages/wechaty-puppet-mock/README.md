# PUPPET-MOCK

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-mock.svg)](https://badge.fury.io/js/wechaty-puppet-mock)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![Linux/Mac Build Status](https://travis-ci.com/Chatie/wechaty-puppet-mock.svg?branch=master)](https://travis-ci.com/Chatie/wechaty-puppet-mock)

![chatie puppet](https://chatie.io/wechaty-puppet-mock/images/mock.png)

> Picture Credit: <https://softwareautotools.com/2017/03/01/mocking-explained-in-python/>

Puppet Mocker & Starter for Wechaty

## USAGE

```ts
import PuppetMock from 'wechaty-puppet-mock'

const wechaty = new Wechaty()

const puppet = new PuppetMock({
  profile,
  wechaty,
})
```

## HELPER UTILITIES

### StateSwitch

```ts
this.state.on('pending')
this.state.on(true)
this.state.off('pending')
this.state.off(true)

await this.state.ready('on')
await this.state.ready('off')

```

### Watchdog

```ts
```

### Profile

```ts
await this.profile.set('config', { id: 1, key: 'xxx' })
const config = await this.profile.get('config')
console.log(config)
// Output: { id: 1, key: 'xxx' }
```
