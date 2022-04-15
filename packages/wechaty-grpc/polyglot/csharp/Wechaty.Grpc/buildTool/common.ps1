# Paths

# csharp build Folder
$buildFolder = (Get-Item -Path "./" -Verbose).FullName

# wechaty root folder
$rootFolder = Join-Path $buildFolder "../../../../"

# wechaty proto folder
$wechatyProtoFolder=Join-Path $rootFolder "proto/wechaty"

# chsarp solution Folder
$solutionFolder = Join-Path $rootFolder "polyglot/csharp/Wechaty.Grpc"

# csharp wechaty proto folder
$csharpProtoFolder=Join-Path $solutionFolder "proto"

$csharpWechatyProtoFolder = Join-Path $rootFolder "polyglot/csharp/Wechaty.Grpc/proto/wechaty"

# get package.json data
$packageData=Get-Content (Join-Path $rootFolder "package.json") | ConvertFrom-Json

# get  package.json version
$version=($packageData | Select-Object -Property version).version

