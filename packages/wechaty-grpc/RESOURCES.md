<div align="center">
<h1>Wechaty gRPC</h1>
<p>
gRPC Service & Protocol Buffers for Wechaty Puppet
<h4>
Learning Resources
</h4>
</div>

## gRPC

- [探讨 gRPC 的 Node 技术生态及实现工具](https://xenojoshua.com/2018/02/grpc-node-ecosystem/)
- [gRPC Basics - Node.js](https://grpc.io/docs/tutorials/basic/node.html)
- [Building a gRPC service with Node.js](https://codelabs.developers.google.com/codelabs/cloud-grpc/)
- [gRPC in 3 minutes (Node.js)](https://github.com/grpc/grpc/tree/master/examples/node)
- [Listen gRPC and HTTP requests on the same port](https://medium.com/@drgarcia1986/listen-grpc-and-http-requests-on-the-same-port-263c40cb45ff)
- [gRPC to JSON proxy generator following the gRPC HTTP spec](https://github.com/grpc-ecosystem/grpc-gateway)
- [如何在 Node.js 中更优雅地使用 gRPC：grpc-helper](https://github.com/xizhibei/blog/issues/86)

#### Official Libraries and Tools

- [gRPC Core](https://github.com/grpc/grpc) - C, C++, Ruby, Node.js, Python, PHP, C#, Objective-C
- [gRPC Java](https://github.com/grpc/grpc-java) - The Java gRPC implementation. HTTP/2 based RPC
- [gRPC Kotlin](https://github.com/grpc/grpc-kotlin) - The Kotlin gRPC implementation. Based on gRPC Java
- [gRPC Node.js](https://github.com/grpc/grpc-node) - gRPC for Node.js
- [gRPC Go](https://github.com/grpc/grpc-go) - The Go language implementation of gRPC. HTTP/2 based RPC
- [gRPC Swift](https://github.com/grpc/grpc-swift) - The Swift language implementation of gRPC
- [gRPC Dart](https://github.com/grpc/grpc-dart) - The Dart language implementation of gRPC
- [gRPC C#](https://github.com/grpc/grpc-dotnet) - The C# language implementation of gRPC
- [gRPC Web](https://github.com/grpc/grpc-web) - gRPC for Web Clients
- [gRPC Ecosystem](https://github.com/grpc-ecosystem) - gRPC Ecosystem that complements gRPC
- [gRPC contrib](https://github.com/grpc/grpc-contrib) - Known useful contributions around github
- [Homebrew gRPC](https://github.com/grpc/homebrew-grpc) - gRPC formulae repo for Homebrew
- [grpc_cli](https://github.com/grpc/grpc/blob/master/doc/command_line_tool.md) - gRPC CLI tool

## Protocol Buffers

- [Protocol Buffers for JavaScript (& TypeScript)](https://github.com/dcodeIO/protobuf.js)
- [Missing value/null support for scalar value types in proto 3](https://github.com/protocolbuffers/protobuf/issues/1606)
- [How to Make a Nullable Field in Proto3 for a HTTP Response?](https://stackoverflow.com/questions/57908389/how-to-make-a-nullable-field-in-proto3-for-a-http-response)

#### Documentation

- [Website](https://developers.google.com/protocol-buffers/) - Official website and documentation
- [Third-Party Add-ons for Protocol Buffers](https://github.com/protocolbuffers/protobuf/blob/master/docs/third_party.md) - List of add-ons for Protocol Buffers in the main Github repository

#### Tools

- [buf](https://buf.build) - Protobuf tool that includes linting and breaking change detection.
  Allows many types of input including directly checking remote repositories and tarballs, and has a built-in compiler as well.
- [prototools](https://github.com/sourcegraph/prototools) - Documentation generator & other tools for protobuf/gRPC
- [protoc-gen-doc](https://github.com/pseudomuto/protoc-gen-doc) - Documentation generator plugin for Google Protocol Buffers
- [Protoxygen](https://github.com/lisroach/Protoxygen) - [Doxygen](http://doxygen.nl) plugin to generate documentation for protobuf/gRPC
- [openapi2proto](https://github.com/NYTimes/openapi2proto) - A tool for generating Protobuf v3 schemas and gRPC service definitions from OpenAPI specifications
- [Wireshark Protobuf Dissector](https://github.com/128technology/protobuf_dissector) - A Wireshark Lua plugin for decoding Google protobuf packets. [Relevant PR and discussion](https://github.com/google/protobuf/issues/3303).
- [protoc-gen-lint](https://github.com/ckaznocha/protoc-gen-lint) - A plug-in for Google's Protocol Buffers (protobufs) compiler to lint .proto files for style violations
- [prototool](https://github.com/uber/prototool) - Compile, lint, and format Protobuf files, and generate stubs for any lanuguage/plugin, along with Vim/IDE integration
- [protoc-gen-validate](https://github.com/lyft/protoc-gen-validate) - Protoc plugin to generate polyglot message validators
- [go-proto-validators](https://github.com/mwitkow/go-proto-validators) - Generate message validators from .proto annotations, used in `grpc_validator` Go gRPC middleware.
- [protolock](https://github.com/nilslice/protolock) - Protocol Buffer companion tool to `protoc` and `git`. Track your .proto files and prevent changes to messages and services which impact API compatibilty.
- [protoc-gen-map](https://github.com/jackskj/protoc-gen-map) - SQL data mapper framework for Protocol Buffers.
- [api-linter](https://github.com/googleapis/api-linter) - A linter for APIs defined in protocol buffers.
- [protoc-gen-struct-transformer](https://github.com/bold-commerce/protoc-gen-struct-transformer) - Transformation functions generator for Protocol Buffers.
- [pbvm](https://github.com/ekalinin/pbvm) - Protocol Buffers Version Manager
- [clang-format](https://clang.llvm.org/docs/ClangFormat.html) - Protocol Buffers formating tool
  Can be used to format on save in editor such as [Visual studio code](https://marketplace.visualstudio.com/items?itemName=xaver.clang-format) or [IntelliJ](https://plugins.jetbrains.com/plugin/14004-protocol-buffer-editor).
- [intellij-protobuf-plugin](https://github.com/devkanro/intellij-protobuf-plugin) - IntelliJ-based IDEs Protobuf Language Plugin that provides Protobuf language support.

## gRPC Web

- [gRPC-Web: Moving past REST+JSON towards type-safe Web APIs](https://improbable.io/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)
- [Library for making gRPC-Web requests intended for TypeScript from either a browser or Node.js.](https://github.com/improbable-eng/grpc-web/tree/master/ts)
- [gRPC-Web: Moving past REST+JSON towards type-safe Web APIs](https://improbable.io/blog/grpc-web-moving-past-restjson-towards-type-safe-web-apis)
- [Library for making gRPC-Web requests intended for TypeScript from either a browser or Node.js.](https://github.com/improbable-eng/grpc-web/tree/master/ts)

## TypeScript Generator

- [A Typescript definition file generator for gRPC services](https://github.com/anfema/grpc-code-generator)
- [gRPC Web TypeScript Code Generation](https://github.com/improbable-eng/grpc-web/blob/master/ts/docs/code-generation.md)
- [Protocol Buffers Compiler (protoc) plugin for TypeScript and gRPC-Web.](https://github.com/improbable-eng/ts-protoc-gen)

## gRPC with XDS (Universal Data Plane API) and Service Mesh

- [Traffic Director with proxyless gRPC services overview](https://cloud.google.com/traffic-director/docs/proxyless-overview)
- [Build Your Own Envoy Control Plane - Steve Sloka, VMware](https://www.youtube.com/watch?v=qAuq4cKEG_E)
- [Service mesh data plane vs. control plane](https://blog.envoyproxy.io/service-mesh-data-plane-vs-control-plane-2774e720f7fc)
- [gRPC xDS Loadbalancing](https://salmaan-rashid.medium.com/grpc-xds-loadbalancing-a05f8bd754b8)
- [Envoy Dynamic configuration (control plane)](https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/dynamic-configuration-control-plane)

#### More TypeScript

- [ts-protoc-gen](https://github.com/improbable-eng/ts-protoc-gen) - Protoc Plugin for TypeScript Declarations
- [protoc-gen-tstypes](https://godoc.org/github.com/tmc/grpcutil/protoc-gen-tstypes) - Configurable Protoc Plugin to generate TypeScript types.
- [sisyphus.js](https://github.com/ButterCam/sisyphus-js) - gRPC runtime and compiler for Web Clients by HTTP transcoding. Recommend using with [Sisyphus](https://github.com/ButterCam/sisyphus) back-end framework.
- [protoc-gen-grpc-gateway-ts](https://github.com/grpc-ecosystem/protoc-gen-grpc-gateway-ts) - TypeScript client generator for the grpc-gateway project that generates idiomatic TypeScript clients that connect the web frontend and golang backend fronted by grpc-gateway.
- [protobuf-ts](https://github.com/timostamm/protobuf-ts) - Protocol buffers and RPC for Node.js and the Web Browser. Pure TypeScript.
- [ts-proto](https://github.com/stephenh/ts-proto) - Transforms your .proto files into strongly-typed, idiomatic TypeScript files!
- [grpc-js-typescript](https://github.com/badsyntax/grpc-js-typescript) - Examples of how to use gRPC with TypeScript & Node.js.

## ZooKeeper

- [ZooKeeper - The King of Coordination](https://www.elastic.co/blog/found-zookeeper-king-of-coordination)

## Session Traversal Utilities for NAT (STUN)

- [How To TCP NAT Traversal using Node.js and a STUN Server](http://sogilis.com/blog/tcp-nat-traversal-nodejs-stun/)
- [chownat, allows two peers behind two separate NATs to directly communicate with each other.](https://samy.pl/chownat/)
- [What is STUN & TURN Server](https://stackoverflow.com/a/23307588/1123955)
- [NPM Search for: NAT Traversal](https://www.npmjs.com/search?q=nat+traversal)
- [NAT traversal by way of UPnP or NAT-PMP](https://github.com/tintfoundation/nat-traverse)
- [How To TCP NAT Traversal using Node.js and a STUN Server](https://gist.github.com/mildred/b803e48801f9cdd8a4a8)
- [STUN, TURN, and ICE - AnyConnect pioneered the STUN, TURN, and ICE NAT Traversal protocols](https://anyconnect.com/stun-turn-ice/)
- [What are STUN, TURN, and ICE?](https://www.twilio.com/docs/stun-turn/faq#faq-what-is-nat)
- [Set Phasers to STUN/TURN: Getting Started with WebRTC using Node.js, Socket.io, and Twilio’s NAT Traversal Service](https://www.twilio.com/blog/2014/12/set-phasers-to-stunturn-getting-started-with-webrtc-using-node-js-socket-io-and-twilios-nat-traversal-service.html)

## Reverse Engineering

- [A toolset for reverse engineering and fuzzing Protobuf-based apps](https://github.com/marin-m/pbtk)

## Python Stub

- [gRPC typing stubs for Python](https://github.com/shabbyrobe/grpc-stubs)

## CSharp gRPC

- [An introduction to NuGet (microsoft)](https://docs.microsoft.com/en-us/nuget/what-is-nuget)
- [Create a gRPC client and server in ASP.NET Core (microsoft)](https://docs.microsoft.com/en-us/aspnet/core/tutorials/grpc/grpc-start?view=aspnetcore-3.1&tabs=visual-studio)
- [ASP.NET Core 3.0 使用 gRPC (晓晨 Master)](https://www.cnblogs.com/stulzq/p/11581967.html)

## Miscellaneous Documentation

- [Protocol Buffers Language Guide (proto3)](https://developers.google.com/protocol-buffers/docs/proto3)
- [Protocol Buffers for TypeScript with Decorators](https://github.com/protobufjs/protobuf.js#using-decorators)
- [Troubleshooting gRPC](https://github.com/grpc/grpc/blob/master/TROUBLESHOOTING.md)
- [gRPC environment variables](https://github.com/grpc/grpc/blob/master/doc/environment_variables.md)
- [How to Interact With and Debug a gRPC Server](https://medium.com/@EdgePress/how-to-interact-with-and-debug-a-grpc-server-c4bc30ddeb0b)
