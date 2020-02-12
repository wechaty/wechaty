# wechaty-puppet-hostie

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-hostie.svg)](https://www.npmjs.com/package/wechaty-puppet-hostie)
![NPM](https://github.com/Chatie/grpc/workflows/NPM/badge.svg)
[![Greenkeeper badge](https://badges.greenkeeper.io/wechaty/wechaty-puppet-hostie.svg)](https://greenkeeper.io/)

![Hostie](https://wechaty.github.io/wechaty-puppet-hostie/images/hostie.png)

Hostie Puppet for Wechaty

## Features

1. Consume hostie service
1. Provide hostie service

## Usage

```ts
import { Wechaty } from 'wechaty'

const wechaty = new Wechaty({
  puppet: 'wechaty-puppet-hostie',
  puppetOptions: {
    token: 'secret'
  }
})

wechaty.start()
```

## Environment Variables

### 1 `WECHATY_PUPPET_HOSTIE_TOKEN`

The token set to this environment variable will become the default value of `puppetOptions.token`

```sh
WECHATY_PUPPET_HOSTIE_TOKEN=secret node bot.js
```

## History

### master

### v0.3 (Feb 2020)

1. Publish the NPM module [wechaty-puppet-hostie](https://www.npmjs.com/package/wechaty-puppet-hostie)
1. Implemented basic hostie features with gRPC module: [@chatie/grpc](https://github.com/Chatie/grpc)

### v0.0.1 (Jun 2018)

Designing the puppet hostie with the following protocols:

1. [gRPC](https://grpc.io/)
1. [JSON RPC](https://www.jsonrpc.org/)
1. [OpenAPI/Swagger](https://swagger.io/docs/specification/about/)

## Author

[Huan LI](https://github.com/huan) ([李卓桓](http://linkedin.com/in/zixia)) zixia@zixia.net

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## Copyright & License

* Code & Docs © 2018-now Huan LI \<zixia@zixia.net\>
* Code released under the Apache-2.0 License
* Docs released under Creative Commons
