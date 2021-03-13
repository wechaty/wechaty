# wechaty-puppet-service

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-service.svg)](https://www.npmjs.com/package/wechaty-puppet-service)
[![NPM](https://github.com/wechaty/wechaty-puppet-service/workflows/NPM/badge.svg)](https://github.com/wechaty/wechaty-puppet-service/actions?query=workflow%3ANPM)

![Wechaty Hostie](https://wechaty.github.io/wechaty-puppet-service/images/hostie.png)

Wechaty Puppet Service is gRPC for Wechaty Puppet Provider.

For example, we can cloudify the Wechaty Puppet Provider wechaty-puppet-padlocal
to a Wechaty Puppet Service by running our Wechaty Puppet Service Token Gateway.

If you want to learn more about what is Wechaty Puppet and Wechaty Puppet Service,
we have a blog post to explain them in details at
<https://wechaty.js.org/2021/01/14/wechaty-puppet-service/>

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/Wechaty/wechaty)

## Features

1. Consume Wechaty Puppet Service
1. Provide Wechaty Puppet Service

## Usage

```ts
import { Wechaty } from 'wechaty'

const wechaty = new Wechaty({
  puppet: 'wechaty-puppet-service',
  puppetOptions: {
    token: '__WECHATY_PUPPET_SERVCIE_TOKEN__'
  }
})

wechaty.start()
```

## Environment Variables

### 1 `WECHATY_PUPPET_SERVICE_TOKEN`

The token set to this environment variable will become the default value of `puppetOptions.token`

```sh
WECHATY_PUPPET_SERVICE_TOKEN=__WECHATY_PUPPET_SERVCIE_TOKEN__ node bot.js
```

## History

### v0.15 master

### v0.14 (Jan 2021)

Rename from ~~wechaty-puppet-hostie~~ to [wechaty-puppet-service](https://www.npmjs.com/package/wechaty-puppet-service)
(Issue [#118](https://github.com/wechaty/wechaty-puppet-service/issues/118))

### v0.10.4 (Oct 2020)

1. Add 'grpc.default_authority' to gRPC client option.  
    > See: [Issue #78: gRPC server can use the authority  to identify current user](https://github.com/wechaty/wechaty-puppet-hostie/pull/78)

### v0.6 (Apr 2020)

Beta Version

1. Reconnect to Hostie Server with RxSJ Observables

### v0.3 (Feb 2020)

1. Publish the NPM module [wechaty-puppet-hostie](https://www.npmjs.com/package/wechaty-puppet-hostie)
1. Implemented basic hostie features with gRPC module: [@chatie/grpc](https://github.com/Chatie/grpc)

### v0.0.1 (Jun 2018)

Designing the puppet hostie with the following protocols:

1. [gRPC](https://grpc.io/)
1. [JSON RPC](https://www.jsonrpc.org/)
1. [OpenAPI/Swagger](https://swagger.io/docs/specification/about/)

## Maintainers

- [@huan](https://github.com/huan) Huan
- [@windmemory](https://github.com/windmemory) Yuan

## Copyright & License

- Code & Docs © 2018-now Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
