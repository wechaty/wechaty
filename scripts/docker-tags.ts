export function dockerTags (version: string): { versionTag: string, channel: 'latest' | 'next' } {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version)
  if (!match) {
    throw new Error(`Invalid package version: ${version}`)
  }

  const prerelease = match[4]
  const stage = prerelease?.split('.')[0]

  return {
    versionTag: `${match[1]}.${match[2]}${stage ? `-${stage}` : ''}`,
    channel: prerelease || Number(match[2]) % 2 !== 0 ? 'next' : 'latest',
  }
}
