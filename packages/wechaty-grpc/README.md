# Wechaty GRPC

[![Node.js](https://github.com/Chatie/grpc/workflows/Node.js/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3ANode.js)
[![NPM](https://github.com/Chatie/grpc/workflows/NPM/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3ANPM)
[![PyPI](https://github.com/Chatie/grpc/workflows/PyPI/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3APyPI)
[![Maven](https://github.com/Chatie/grpc/workflows/Maven/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3A%22Maven%22)
[![PHP](https://github.com/Chatie/grpc/workflows/PHP/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3APHP)
[![Go](https://github.com/chatie/grpc/workflows/Go/badge.svg)](https://github.com/chatie/grpc/actions?query=workflow%3AGo)

![Wechaty gRPC](docs/images/grpc.png)

[![NPM Version](https://img.shields.io/npm/v/wechaty-grpc?color=brightgreen&label=NPM)](https://www.npmjs.com/package/wechaty-grpc)
[![PyPI Version](https://img.shields.io/pypi/v/chatie-grpc?color=blue&label=PyPI)](https://pypi.org/project/chatie-grpc/)
[![Java Version](https://img.shields.io/maven-central/v/io.github.wechaty/grpc?label=Java)](https://mvnrepository.com/artifact/io.github.wechaty/grpc)
[![PHP Version](https://img.shields.io/packagist/v/wechaty/php-grpc)](https://packagist.org/packages/wechaty/php-grpc)

[![node](https://img.shields.io/node/v/wechaty.svg?maxAge=604800&label=Node.js)](https://nodejs.org/)
[![Python 3.7](https://img.shields.io/badge/python-3.7+-blue.svg?label=Python)](https://www.python.org/downloads/release/python-370/)
![Go Version](https://img.shields.io/github/go-mod/go-version/wechaty/go-wechaty)

gRPC for Wechaty Puppet Service

## USAGE

### Node.js

[wechaty-grpc@NPM](https://www.npmjs.com/package/wechaty-grpc)

Maintainer:

- [@huan](https://github.com/huan) - Huan LI (李卓桓)

### Python

[chatie-grpc@PyPI](https://pypi.org/project/chatie-grpc)

Maintainer:

- [@wj-Mcat](https://github.com/wj-Mcat) - Jingjing WU (吴京京)

### Go

[github.com/wechaty/go-grpc](https://github.com/wechaty/go-grpc)

Maintainer:

- [@dchaofei](https://github.com/dchaofei) - Chaofei DING (丁超飞)

### Java

[https://mvnrepository.com/artifact/io.github.wechaty/grpc](https://mvnrepository.com/artifact/io.github.wechaty/grpc)

Maven:

```xml
<dependency>
    <groupId>io.github.wechaty</groupId>
    <version>0.11.25</version>
    <artifactId>grpc</artifactId>
</dependency>
```

Gradle:

```groovy
compile 'io.github.wechaty:grpc:0.11.25'
```

Maintainer:

- [@diaozxin007](https://github.com/diaozxin007) - Zhengxin DIAO (刁政欣)

### PHP

[github.com/wechaty/php-grpc](https://github.comwechaty/php-grpc)

Maintainer:

- [@zhangchunsheng](https://github.com/zhangchunsheng) - Chunsheng ZHANG (张春生)

### Csharp

[Wechaty.Grpc @ Nuget](https://www.nuget.org/packages/Wechaty.Grpc)

Maintainer:

- [@Darren](https://github.com/jesn)  - Darren (郑波)

## DEVELOPMENT

### Debug

- [GUI Client for GRPC Services](https://github.com/uw-labs/bloomrpc) - BloomRPC aim to give the simplest and efficient developer experience for exploring and querying your GRPC services.(Inspired by Postman and GraphQL Playground)
- [A gRPC CLI interface for easy testing against gRPC servers with Node.js REPL](https://github.com/njpatel/grpcc)

    ```sh
    grpcc --proto ./service/myservice.proto --address 127.0.0.1:3466
    ```

### Build

```shell
./scripts/install-protoc.sh
npm install
```

> <https://github.com/google/protobuf/releases/latest>

### Generate Stubs

```shell
npm run generate
```

#### 1. JS for Protocol Buffer

```shell
protoc \
  --js_out="import_style=commonjs,binary:${OUT_DIR}"
```

> <https://github.com/google/protobuf/releases/latest>

#### 2. JS for gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=`which grpc_tools_node_protoc_plugin`" \
  --grpc_out="${OUT_DIR}"
```

> <https://www.npmjs.com/package/grpc-tools>

#### 3. TypeScript Typing Definations for Protocol Buffer & gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=node_modules/grpc_tools_node_protoc_ts/bin/protoc-gen-ts" \
  --grpc_out="${OUT_DIR}"
```

> <https://github.com/agreatfool/grpc_tools_node_protoc_ts>

#### 4. JS & TS for gRPC Web

```shell
protoc \
  --plugin="protoc-gen-ts=node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
  --ts_out="service=true:${OUT_DIR}"
```

> <https://github.com/improbable-eng/ts-protoc-gen>

## OpenAPI

Thanks for the ecosystem of gRPC, we can generate OpenAPI Specification from our gRPC proto definitions automatically.

We are using [gRPC to JSON proxy generator following the gRPC HTTP spec](https://github.com/grpc-ecosystem/grpc-gateway) as the OpenAPI Specification generator ([protoc-gen-openapiv2](https://github.com/grpc-ecosystem/grpc-gateway/tree/master/protoc-gen-openapiv2)), and using [Like grpc-gateway, but written in node and dynamic](https://github.com/konsumer/grpc-dynamic-gateway) project to serve a HTTP RESTful API to gRPC proxy.

[![gRPC Gateway](docs/images/grpc-gateway-architecture.svg)](https://github.com/wechaty/openapi)

> Image credit: [grpc-gateway](https://grpc-ecosystem.github.io/grpc-gateway/)

Learn more about the RESTful API service for Wechaty from [Wechaty OpenAPI](https://github.com/wechaty/openapi).

See also: [AIP-4222 - Routing headers](https://google.aip.dev/client-libraries/4222)

## gRPC Web

- [gRPC-Web ReactJS client, Golang Server](https://github.com/longfellowone/grpcwebtest)

## RESOURCES

### Guidelines

- [Google Protocol Buffers Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [Google Cloud API Naming Conventions](https://cloud.google.com/apis/design/naming_convention)
- [Google Cloud Cloud API Design Guide](https://cloud.google.com/apis/design/)

### Documentation

- [Protocol Buffers Language Guide (proto3)](https://developers.google.com/protocol-buffers/docs/proto3)
- [Protocol Buffers for TypeScript with Decorators](https://github.com/protobufjs/protobuf.js#using-decorators)
- [Troubleshooting gRPC](https://github.com/grpc/grpc/blob/master/TROUBLESHOOTING.md)
- [gRPC environment variables](https://github.com/grpc/grpc/blob/master/doc/environment_variables.md)
- [How to Interact With and Debug a gRPC Server](https://medium.com/@EdgePress/how-to-interact-with-and-debug-a-grpc-server-c4bc30ddeb0b)

### Links

- [探讨gRPC的Node技术生态及实现工具](https://xenojoshua.com/2018/02/grpc-node-ecosystem/)
- [gRPC Basics - Node.js](https://grpc.io/docs/tutorials/basic/node.html)
- [Building a gRPC service with Node.js](https://codelabs.developers.google.com/codelabs/cloud-grpc/)
- [gRPC in 3 minutes (Node.js)](https://github.com/grpc/grpc/tree/master/examples/node)
- [Listen gRPC and HTTP requests on the same port](https://medium.com/@drgarcia1986/listen-grpc-and-http-requests-on-the-same-port-263c40cb45ff)
- [gRPC to JSON proxy generator following the gRPC HTTP spec](https://github.com/grpc-ecosystem/grpc-gateway)
- [如何在 Node.js 中更优雅地使用 gRPC：grpc-helper](https://github.com/xizhibei/blog/issues/86)

#### Protocol Buffer

- [Protocol Buffers for JavaScript (& TypeScript)](https://github.com/dcodeIO/protobuf.js)
- [Missing value/null support for scalar value types in proto 3](https://github.com/protocolbuffers/protobuf/issues/1606)
- [How to Make a Nullable Field in Proto3 for a HTTP Response?](https://stackoverflow.com/questions/57908389/how-to-make-a-nullable-field-in-proto3-for-a-http-response)

#### gRPC Web

- [gRPC-Web: Moving past REST+JSON towards type-safe Web APIs](https://improbable.io/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)
- [Library for making gRPC-Web requests intended for TypeScript from either a browser or Node.js.](https://github.com/improbable-eng/grpc-web/tree/master/ts)

#### TypeScript Generator

- [A Typescript definition file generator for gRPC services](https://github.com/anfema/grpc-code-generator)
- [gRPC Web TypeScript Code Generation](https://github.com/improbable-eng/grpc-web/blob/master/ts/docs/code-generation.md)
- [Protocol Buffers Compiler (protoc) plugin for TypeScript and gRPC-Web.](https://github.com/improbable-eng/ts-protoc-gen)

#### Zoo Keeper

- [ZooKeeper - The King of Coordination](https://www.elastic.co/blog/found-zookeeper-king-of-coordination)

#### STUN

- [How To TCP NAT Traversal using Node.js and a STUN Server](http://sogilis.com/blog/tcp-nat-traversal-nodejs-stun/)
- [chownat, allows two peers behind two separate NATs to directly communicate with each other.](https://samy.pl/chownat/)
- [What is STUN & TURN Server](https://stackoverflow.com/a/23307588/1123955)
- [NPM Search for: NAT Traversal](https://www.npmjs.com/search?q=nat+traversal)
- [NAT traversal by way of UPnP or NAT-PMP](https://github.com/tintfoundation/nat-traverse)
- [How To TCP NAT Traversal using Node.js and a STUN Server](https://gist.github.com/mildred/b803e48801f9cdd8a4a8)
- [STUN, TURN, and ICE - AnyConnect pioneered the STUN, TURN, and ICE NAT Traversal protocols](https://anyconnect.com/stun-turn-ice/)
- [What are STUN, TURN, and ICE?](https://www.twilio.com/docs/stun-turn/faq#faq-what-is-nat)
- [Set Phasers to STUN/TURN: Getting Started with WebRTC using Node.js, Socket.io and Twilio’s NAT Traversal Service](https://www.twilio.com/blog/2014/12/set-phasers-to-stunturn-getting-started-with-webrtc-using-node-js-socket-io-and-twilios-nat-traversal-service.html)

TCP hole punching

#### Reverse Engineering

- [A toolset for reverse engineering and fuzzing Protobuf-based apps](https://github.com/marin-m/pbtk)

#### Python Stub

- [gRPC typing stubs for Python](https://github.com/shabbyrobe/grpc-stubs)

#### CSharp grpc

- [An introduction to NuGet  (microsoft)](https://docs.microsoft.com/en-us/nuget/what-is-nuget)
- [Create a gRPC client and server in ASP.NET Core (microsoft)](https://docs.microsoft.com/en-us/aspnet/core/tutorials/grpc/grpc-start?view=aspnetcore-3.1&tabs=visual-studio)
- [ASP.NET Core 3.0 使用gRPC (晓晨Master)](https://www.cnblogs.com/stulzq/p/11581967.html)

## HISTORY

### master

### v0.20 (Feb 21, 2021)

1. Rename NPM module name from `@chatie/grpc` to `wechaty-grpc`
1. Add OpenAPI annotations & generators for supporting <https://github.com/wechaty/openapi>
1. Code clean.

### v0.18 (Oct 15, 2020)

- Add new `MessageFileStream` and `MessageImageStream` to replace the `MessageFile` and `MessageImage` method to avoid blocking nodejs event loop when sending large files ([#88](https://github.com/Chatie/grpc/pull/88)) by [@windmemory](https://github.com/windmemory)
- Add new `MessageSendFileStream` to replace the `MessageSendFile` method to avoid blocking nodejs event loop when sending large files ([#89](https://github.com/Chatie/grpc/pull/89)) by [@windmemory](https://github.com/windmemory)

### v0.17 (Aug 5, 2020)

- Add PHPH Support ([#76](https://github.com/Chatie/grpc/pull/76) [#78](https://github.com/Chatie/grpc/pull/78)) by [@zhangchunsheng](https://github.com/zhangchunsheng)
- Publish PHP Module at <https://github.com/wechaty/php-grpc>

### v0.13 (Apr 19, 2020)

- Add Java Support ([#52](https://github.com/Chatie/grpc/issues/52) [#53](https://github.com/Chatie/grpc/issues/53) by [@diaozxin007](https://github.com/diaozxin007))
- Publish Java Module at [Open Source Project Repository HostingOSSRH-56843 - Release the Chatie/grpc Java Client](https://issues.sonatype.org/browse/OSSRH-56843)

### v0.11 (Apr 10, 2020)

- Add Go Support ([#50](https://github.com/Chatie/grpc/issues/50) by [@dchaofei](https://github.com/dchaofei))
- Publish Go Module at <github.com/wechaty/go-grpc>

### v0.6 (Feb 2020)

- Align gRPC Services with Wechaty Puppet Abstraction
- Add Unit Tests

### v0.2 (Jul 2018)

- Automatic Generating gRPC Stubs
- Publish to NPM

### v0.0.1 (May 2018)

Initial commiit

## MAINTAINER

[Huan LI](https://github.com/huan) ([李卓桓](http://linkedin.com/in/zixia)), Google Developer Expert in Machine Learning (ML GDE), <zixia@zixia.net>

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## COPYRIGHT & LICENSE

- Code & Docs © 2018-now Wechaty Authors \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
