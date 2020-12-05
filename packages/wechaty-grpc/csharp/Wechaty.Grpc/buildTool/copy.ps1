. ".\common.ps1"


# Get-ChildItem $projectFolder | ?{$_.psiscontainer -eq $false} 

Set-Location $buildFolder

# csharp wechaty proto folder
$csharpProtoFolder=Join-Path $solutionFolder "proto"

# if csharp proto folder is exists, delete if exists
if(Test-Path $csharpProtoFolder)
{
  Remove-Item -Path $csharpProtoFolder -Recurse -Force
}

# copy wechaty proto folder to  csharp proto folder
Copy-Item $wechatyProtoFolder $solutionFolder -Recurse

$puppetFilePath = Join-Path $csharpProtoFolder "wechaty/puppet.proto"
# get puppet.proto content
$file = Get-Content $puppetFilePath

# update import as csharp catalog
$file.Replace("import public `"puppet/","import public `"proto/wechaty/puppet/")  | set-Content $puppetFilePath

$puppetChildPath = Join-Path $csharpProtoFolder "wechaty/puppet" 
Get-ChildItem $puppetChildPath| ForEach-Object -Process{
  if($_ -is [System.IO.FileInfo])
  {
     Write-Host($_.fullname);

     $childfile = Get-Content $_.fullname
     $childfile.Replace("import `"puppet/","import `"proto/wechaty/puppet/")  | set-Content $_.fullname
  }
}



# update common.props version as package.json version
$commonPropPath = Join-Path $solutionFolder "common.props"
$commonPropsData = Get-Content $commonPropPath

$versionNode="<Version>" + $version + "</Version>"
echo $versionNode
$commonPropsData -Replace "<Version>(.*)</Version>" , $versionNode | set-Content $commonPropPath

Set-Location $buildFolder



