# GRPC [![NPM](https://github.com/Chatie/grpc/workflows/NPM/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3ANPM) [![PyPI](https://github.com/Chatie/grpc/workflows/PyPI/badge.svg)](https://github.com/Chatie/grpc/actions?query=workflow%3APyPI)

![chatie grpc](https://chatie.io/grpc/images/grpc.png)

[![NPM Version](https://badge.fury.io/js/%40chatie%2Fgrpc.svg)](https://www.npmjs.com/package/@chatie/grpc)

![PyPI Version](https://img.shields.io/pypi/v/chatie-grpc?color=blue)
[![Python 3.7](https://img.shields.io/badge/python-3.7+-blue.svg)](https://www.python.org/downloads/release/python-370/)

gRPC for Chatie

## Install

```shell
./scripts/install-protoc.sh
npm install
```

> <https://github.com/google/protobuf/releases/latest>

## Generate Stubs

```shell
npm run generate
```

### 1. JS for Protocol Buffer

```shell
protoc \
  --js_out="import_style=commonjs,binary:${OUT_DIR}"
```

> <https://github.com/google/protobuf/releases/latest>

### 2. JS for gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=`which grpc_tools_node_protoc_plugin`" \
  --grpc_out="${OUT_DIR}"
```

> <https://www.npmjs.com/package/grpc-tools>

### 3. TypeScript Typing Definations for Protocol Buffer & gRPC Stubs

```shell
protoc \
  --plugin="protoc-gen-grpc=node_modules/grpc_tools_node_protoc_ts/bin/protoc-gen-ts" \
  --grpc_out="${OUT_DIR}"
```

> <https://github.com/agreatfool/grpc_tools_node_protoc_ts>

### 4. JS & TS for gRPC Web

```shell
protoc \
  --plugin="protoc-gen-ts=node_modules/ts-protoc-gen/bin/protoc-gen-ts" \
  --ts_out="service=true:${OUT_DIR}"
```

> <https://github.com/improbable-eng/ts-protoc-gen>

## Development

### gRPC CLI Debug

- [A gRPC CLI interface for easy testing against gRPC servers with Node.js REPL](https://github.com/njpatel/grpcc)

```sh
grpcc --proto ./service/myservice.proto --address 127.0.0.1:3466
```

## Documentatoin

- [Protocol Buffers Language Guide (proto3)](https://developers.google.com/protocol-buffers/docs/proto3)
- [Google Protocol Buffers Style Guide](https://developers.google.com/protocol-buffers/docs/style)
- [Protocol Buffers for TypeScript with Decorators](https://github.com/protobufjs/protobuf.js#using-decorators)
- [Troubleshooting gRPC](https://github.com/grpc/grpc/blob/master/TROUBLESHOOTING.md)
- [gRPC environment variables](https://github.com/grpc/grpc/blob/master/doc/environment_variables.md)
- [How to Interact With and Debug a gRPC Server](https://medium.com/@EdgePress/how-to-interact-with-and-debug-a-grpc-server-c4bc30ddeb0b)

## Resources

- [探讨gRPC的Node技术生态及实现工具](https://xenojoshua.com/2018/02/grpc-node-ecosystem/)
- [gRPC Basics - Node.js](https://grpc.io/docs/tutorials/basic/node.html)
- [Building a gRPC service with Node.js](https://codelabs.developers.google.com/codelabs/cloud-grpc/)
- [gRPC in 3 minutes (Node.js)](https://github.com/grpc/grpc/tree/master/examples/node)
- [Listen gRPC and HTTP requests on the same port](https://medium.com/@drgarcia1986/listen-grpc-and-http-requests-on-the-same-port-263c40cb45ff)
- [gRPC to JSON proxy generator following the gRPC HTTP spec](https://github.com/grpc-ecosystem/grpc-gateway)
- [如何在 Node.js 中更优雅地使用 gRPC：grpc-helper](https://github.com/xizhibei/blog/issues/86)

### Protocol Buffer

- [Protocol Buffers for JavaScript (& TypeScript)](https://github.com/dcodeIO/protobuf.js)
- [Missing value/null support for scalar value types in proto 3](https://github.com/protocolbuffers/protobuf/issues/1606)
- [How to Make a Nullable Field in Proto3 for a HTTP Response?](https://stackoverflow.com/questions/57908389/how-to-make-a-nullable-field-in-proto3-for-a-http-response)

### gRPC Web

- [gRPC-Web: Moving past REST+JSON towards type-safe Web APIs](https://improbable.io/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)
- [Library for making gRPC-Web requests intended for TypeScript from either a browser or Node.js.](https://github.com/improbable-eng/grpc-web/tree/master/ts)

### TypeScript Generator

- [A Typescript definition file generator for gRPC services](https://github.com/anfema/grpc-code-generator)
- [gRPC Web TypeScript Code Generation](https://github.com/improbable-eng/grpc-web/blob/master/ts/docs/code-generation.md)
- [Protocol Buffers Compiler (protoc) plugin for TypeScript and gRPC-Web.](https://github.com/improbable-eng/ts-protoc-gen)

### Zoo Keeper

- [ZooKeeper - The King of Coordination](https://www.elastic.co/blog/found-zookeeper-king-of-coordination)

### STUN

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

### Reverse Engineering

- [A toolset for reverse engineering and fuzzing Protobuf-based apps](https://github.com/marin-m/pbtk)

### Python

- [gRPC typing stubs for Python](https://github.com/shabbyrobe/grpc-stubs)

## History

### v0.6 (Feb 2020)

- Align gRPC Services with Wechaty Puppet Abstraction
- Add Unit Tests

### v0.2 (Jul 2018)

- Automatic Generating gRPC Stubs
- Publish to NPM

### v0.0.1 (May 2018)

Initial commiit

## Author

[Huan LI](https://github.com/huan) ([李卓桓](http://linkedin.com/in/zixia)) zixia@zixia.net

[![Profile of Huan LI (李卓桓) on StackOverflow](https://stackexchange.com/users/flair/265499.png)](https://stackexchange.com/users/265499)

## Copyright & License

- Code & Docs © 2018-now Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
