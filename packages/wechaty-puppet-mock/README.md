# PUPPET-MOCK

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-mock.svg)](https://badge.fury.io/js/wechaty-puppet-mock)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-puppet-mock/next.svg)](https://www.npmjs.com/package/wechaty-puppet-mock?activeTab=versions)
[![NPM](https://github.com/wechaty/wechaty-puppet-mock/workflows/NPM/badge.svg)](https://github.com/wechaty/wechaty-puppet-mock/actions?query=workflow%3ANPM)

![chatie puppet](https://wechaty.github.io/wechaty-puppet-mock/images/mock.png)

> Picture Credit: <https://softwareautotools.com/2017/03/01/mocking-explained-in-python/>

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/wechaty/wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)

Puppet Mocker & Starter Template for Wechaty, it is very useful when you:

1. Want to test the Wechaty framework with a mock puppet, or
1. You want to write your own Puppet implenmentation.

Then `PuppetMock` will helps you a lot.

## USAGE

### Puppet Mock

```ts
import { Wechaty }   from 'wechaty'
import { PuppetMock } from 'wechaty-puppet-mock'

const puppet  = new PuppetMock()
const wechaty = new Wechaty({ puppet })

wechaty.start()
```

### Mocker & Environment

```ts
import {
  PuppetMock,
  Mocker,
  SimpleEnvironment,
}                     from 'wechaty-puppet-mock'

const mocker = new Mocker()
mocker.use(SimpleEnvironment())

const puppet = new PuppetMock({ mocker })
const wechaty = new Wechaty({ puppet })

wechaty.start()

// The Mocker will start perform the SimpleEnvironment...
```

See: [SimpleEnvironment](src/mocker/environment.ts)

## API Reference

### Mocker

```ts
import { Wechaty }  from 'wechaty'
import { PuppetMock, mock }   from 'wechaty-puppet-mock'

const mocker = new mock.Mocker()
const puppet = new PuppetMock({ mocker })
const bot = new Wechaty({ puppet })

await bot.start()

mocker.scan('https://github.com/wechaty', 1)

const user = mocker.createContact()
mocker.login(user)

const contact = mocker.createContact()
const room = mocker.createRoom()

user.say('Hello').to(contact)
contact.say('World').to(user)
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

### MemoryCard

```ts
await memory.set('config', { id: 1, key: 'xxx' })
const config = await memory.get('config')
console.log(config)
// Output: { id: 1, key: 'xxx' }
```

## HISTORY

### master

### v0.25 (July 13, 2020)

1. Rename `MockXXX` to `XXXMock` for keep the consistent naming style with `PuppetMock`.
1. Export `mock` namespace and move all related modules under it.

### v0.22 (June 4, 2020)

`Mocker` Released. `Mocker` is a manager for controlling the behavior of the Puppet activities.

1. Add `MockContact`, `MockRoom`, and `MockMessage` for `Mockers`
1. Add `MockEnvironment` for mocking the server behaviors.
1. Support `Wechaty#Contact.find()` from the `mocker.createContacts()`
1. Support `Wechaty#Room.find()` from the `mocker.createRooms()`
1. Support `message` event for `talker`, `listener`, and `room` of `MockMessage`

### v0.0.1 (Jun 27, 2018)

Initial version.

`PuppetMock` is a skelton Puppet without do anything, it will make testing easy when developing Wechaty

## AUTHOR

[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

* Code & Docs © 2018 Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
