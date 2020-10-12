# Paths

# csharp build Folder
$buildFolder = (Get-Item -Path "./" -Verbose).FullName

# wechaty root folder
$rootFolder = Join-Path $buildFolder "../../../"

# wechaty proto folder
$wechatyProtoFolder=Join-Path $rootFolder "proto"

# chsarp solution Folder
$solutionFolder = Join-Path $rootFolder "csharp/Wechaty.Grpc"

# get package.json data
$packageData=Get-Content (Join-Path $rootFolder "package.json") | ConvertFrom-Json

# get  package.json version
$version=($packageData | Select-Object -Property version).version

