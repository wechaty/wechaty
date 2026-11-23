

# 生成步骤:
1、执行 buildTool目录下的`./copy.ps1` powshell 文件
2、dotnet build 生成Nuget包

# 问题
## 【gRPC使用问题3】生成出来无法识别Google.Api.AnnotationsReflection.Descriptor
    处理方案：Install the package "Google.Api.Gax.Grpc"

## 找不到 `protoc-gen-openapiv2/options/annotations.proto` proto文件
去对应的目录下拷贝对应的proto文件到项目中 https://github.com/grpc-ecosystem/grpc-gateway/tree/master/protoc-gen-openapiv2/options
