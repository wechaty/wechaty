#!/usr/bin/env bash
set -e

VERSION=$(node --input-type=commonjs -p "require('./package.json').version")

if ./node_modules/.bin/semver-is-prod "$VERSION"; then
  NPM_DIST_TAG=latest
else
  NPM_DIST_TAG=next
fi

TMPDIR="/tmp/npm-pack-testing.$$"
mkdir "$TMPDIR"
trap 'rm -rf "$TMPDIR"' EXIT

npm run dist
npm pack --pack-destination "$TMPDIR"
shopt -s nullglob
PACK_FILES=("$TMPDIR"/*.tgz)
if [ "${#PACK_FILES[@]}" -ne 1 ]; then
  echo "Expected exactly one package tarball, found ${#PACK_FILES[@]}." >&2
  exit 1
fi
PACK_FILE="${PACK_FILES[0]##*/}"
cp tests/fixtures/smoke-testing.ts "$TMPDIR"

tar -xzf "$TMPDIR/$PACK_FILE" -C "$TMPDIR"
node --input-type=commonjs - "$TMPDIR/package" <<'NODE'
const fs = require('node:fs')
const path = require('node:path')

const packageRoot = path.resolve(process.argv[2])
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'))
const files = []

function visit (directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      visit(file)
    } else {
      files.push(path.relative(packageRoot, file).split(path.sep).join('/'))
    }
  }
}

visit(packageRoot)

const requiredFiles = [
  ...Object.values(manifest.exports).map(entry => entry.import.replace(/^\.\//, '')),
  ...Object.values(manifest.exports).map(entry => entry.import.replace(/\.js$/, '.d.ts').replace(/^\.\//, '')),
  ...Object.values(manifest.bin),
].map(file => file.replace(/^\.\//, ''))

const missingFiles = requiredFiles.filter(file => !files.includes(file))
if (missingFiles.length) {
  console.error('Package is missing required exports or binaries:', missingFiles)
  process.exitCode = 1
}

const forbiddenFiles = files.filter(file =>
  /\.spec\.(?:d\.)?(?:[cm]?js|[cm]?ts)(?:\.map)?$/.test(file)
  || /^(?:tests|examples|scripts)\//.test(file)
  || /^dist\/esm\/(?:tests|examples|scripts)\//.test(file)
  || /(?:^|\/)fixtures\//.test(file),
)
if (forbiddenFiles.length) {
  console.error('Package contains forbidden tests, fixtures, or maintenance files:', forbiddenFiles)
  process.exitCode = 1
}

const unresolvedMapSources = []
for (const file of files.filter(file => file.endsWith('.map'))) {
  const mapPath = path.join(packageRoot, file)
  const sourceMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
  for (const source of sourceMap.sources) {
    const sourcePath = path.resolve(path.dirname(mapPath), sourceMap.sourceRoot || '', source)
    if (!sourcePath.startsWith(`${packageRoot}${path.sep}`) || !fs.existsSync(sourcePath)) {
      unresolvedMapSources.push(`${file}: ${source}`)
    }
  }
}
if (unresolvedMapSources.length) {
  console.error('Package contains maps with missing source files:', unresolvedMapSources)
  process.exitCode = 1
}
NODE

cd "$TMPDIR"

npm init -y
npm install --production "./$PACK_FILE" \
  @types/node \
  @typescript/native@npm:typescript@^7.0.2 \
  file-box@"$NPM_DIST_TAG" \
  wechaty-puppet-mock@"$NPM_DIST_TAG" \
  wechaty-puppet-padlocal@"$NPM_DIST_TAG" \
  wechaty-puppet-service@"$NPM_DIST_TAG" \

#
# ES Modules
#
node --input-type=commonjs -e "const fs = require('node:fs'); const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')); packageJson.type = 'module'; fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2))"

npx tsc \
  --target esnext \
  --module nodenext \
  \
  --moduleResolution nodenext \
  --verbatimModuleSyntax \
  --esModuleInterop \
  --lib esnext \
  --noEmitOnError \
  --noImplicitAny \
  --skipLibCheck \
  smoke-testing.ts

echo
echo "ES Module: pack testing..."
node smoke-testing.js

if [ -n "${TESTED_PACKAGE_OUTPUT_PATH:-}" ]; then
  cp "$PACK_FILE" "$TESTED_PACKAGE_OUTPUT_PATH"
fi
