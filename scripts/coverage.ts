import { spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export type MetricName = 'lines' | 'functions' | 'branches'

export interface Metric {
  covered: number
  total: number
  percent: number
}

export type CoverageMetrics = Record<MetricName, Metric>

export interface LcovRecord {
  source: string
  text: string
  metrics: CoverageMetrics
}

export interface CoverageBaseline {
  lines: number
  functions: number
  branches: number
}

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const METRICS: Record<MetricName, [string, string]> = {
  lines: [ 'LH', 'LF' ],
  functions: [ 'FNH', 'FNF' ],
  branches: [ 'BRH', 'BRF' ],
}
const SOURCE_EXCLUDES = new Set([ 'src/package-json.ts' ])

function metric (covered: number, total: number): Metric {
  return {
    covered,
    total,
    percent: total ? covered / total * 100 : 0,
  }
}

export function parseLcov (content: string): LcovRecord[] {
  if (!content.trim()) {
    throw new Error('LCOV report is empty')
  }
  if (!content.trimEnd().endsWith('end_of_record')) {
    throw new Error('LCOV report is missing end_of_record')
  }

  const records: LcovRecord[] = []
  let current: string[] = []
  for (const line of content.split(/\r?\n/)) {
    if (line === 'end_of_record') {
      records.push(parseRecord(current))
      current = []
    } else if (line) {
      current.push(line)
    }
  }
  if (current.length) {
    throw new Error('LCOV report has an incomplete record')
  }
  if (!records.length) {
    throw new Error('LCOV report has no source records')
  }

  const sources = new Set<string>()
  for (const record of records) {
    if (sources.has(record.source)) {
      throw new Error(`LCOV report has duplicate source record: ${record.source}`)
    }
    sources.add(record.source)
  }
  return records
}

function parseRecord (lines: string[]): LcovRecord {
  const fields = new Map<string, string[]>()
  const functionCounts = new Map<string, number>()
  const functionHits = new Map<string, number[]>()
  let lineCount = 0
  let lineHits = 0
  let branchCount = 0
  let branchHits = 0
  for (const line of lines) {
    const separator = line.indexOf(':')
    if (separator <= 0) {
      throw new Error(`Malformed LCOV record line: ${line}`)
    }
    const key = line.slice(0, separator)
    const value = line.slice(separator + 1)
    if (![
      'TN', 'SF', 'FN', 'FNDA', 'FNF', 'FNH', 'BRDA', 'BRF', 'BRH', 'DA', 'LH', 'LF',
    ].includes(key)) {
      throw new Error(`Unsupported LCOV record field: ${key}`)
    }
    fields.set(key, [ ...(fields.get(key) ?? []), value ])

    if (key === 'DA') {
      const data = /^(\d+),(\d+)(?:,[^,]*)?$/.exec(value)
      if (!data || !Number.isSafeInteger(Number(data[1])) || !Number.isSafeInteger(Number(data[2]))) {
        throw new Error(`Malformed LCOV line record: ${line}`)
      }
      lineCount++
      lineHits += Number(data[2]) > 0 ? 1 : 0
    } else if (key === 'FN') {
      const data = /^(\d+),(.+)$/.exec(value)
      if (!data || !Number.isSafeInteger(Number(data[1]))) {
        throw new Error(`Malformed LCOV function record: ${line}`)
      }
      functionCounts.set(data[2]!, (functionCounts.get(data[2]!) ?? 0) + 1)
    } else if (key === 'FNDA') {
      const data = /^(\d+),(.+)$/.exec(value)
      if (!data || !Number.isSafeInteger(Number(data[1]))) {
        throw new Error(`Malformed LCOV function count: ${line}`)
      }
      functionHits.set(data[2]!, [ ...(functionHits.get(data[2]!) ?? []), Number(data[1]) ])
    } else if (key === 'BRDA') {
      const data = /^(\d+),(\d+),(\d+),(-|\d+)$/.exec(value)
      if (!data || data.slice(1, 4).some(item => !Number.isSafeInteger(Number(item)))) {
        throw new Error(`Malformed LCOV branch record: ${line}`)
      }
      branchCount++
      if (data[4] !== '-') {
        branchHits += Number(data[4]) > 0 ? 1 : 0
      }
    }
  }

  const source = fields.get('SF')?.[0]
  if (!source || fields.get('SF')?.length !== 1) {
    throw new Error('LCOV record must have exactly one source file')
  }
  if (!lineCount) {
    throw new Error(`LCOV record has no line data: ${source}`)
  }
  const functionNames = new Set([ ...functionCounts.keys(), ...functionHits.keys() ])
  if ([ ...functionNames ].some(name => functionCounts.get(name) !== functionHits.get(name)?.length)) {
    throw new Error(`LCOV function declarations and counts differ: ${source}`)
  }

  const values = new Map<string, number>()
  for (const key of [ 'LH', 'LF', 'FNH', 'FNF', 'BRH', 'BRF' ]) {
    const raw = fields.get(key)
    if (!raw || raw.length !== 1 || !/^\d+$/.test(raw[0]!)) {
      throw new Error(`LCOV record must have exactly one valid ${key}: ${source}`)
    }
    values.set(key, Number(raw[0]))
  }

  if (
    values.get('LH')! > values.get('LF')!
    || values.get('FNH')! > values.get('FNF')!
    || values.get('BRH')! > values.get('BRF')!
  ) {
    throw new Error(`Invalid LCOV summary totals for ${source}`)
  }

  const metrics: CoverageMetrics = {
    lines: metric(lineHits, lineCount),
    functions: metric(
      [ ...functionHits.values() ].flat().filter(hits => hits > 0).length,
      [ ...functionHits.values() ].flat().length,
    ),
    branches: metric(branchHits, branchCount),
  }
  return { source, text: `${lines.join('\n')}\nend_of_record`, metrics }
}

export function sourceKey (source: string, root = ROOT): string {
  const path = relativeSource(source, root)
  if (
    path.startsWith('../')
    || path === '..'
    || !path.startsWith('src/')
    || !path.endsWith('.ts')
    || path.endsWith('.d.ts')
    || path.endsWith('.test.ts')
    || path.split('/').includes('fixtures')
    || SOURCE_EXCLUDES.has(path)
  ) {
    throw new Error(`LCOV source is outside the production scope: ${source}`)
  }
  return path
}

export function normalizeLcovForRenderer (content: string, root = ROOT): string {
  const records = parseLcov(content)
  return `${records.map(record => {
    const lines = record.text.split('\n')
    const functionCounts = new Map<string, Map<string, number>>([
      [ 'FN', new Map() ],
      [ 'FNDA', new Map() ],
    ])
    for (const line of lines) {
      const declaration = /^(FN|FNDA):[^,]+,(.+)$/.exec(line)
      if (declaration) {
        const counts = functionCounts.get(declaration[1]!)!
        const name = declaration[2]!
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    const declarations = functionCounts.get('FN')!
    const hits = functionCounts.get('FNDA')!
    for (const [ name, count ] of declarations) {
      if (count > 1 && hits.get(name) !== count) {
        throw new Error(`LCOV function hit count does not match declarations: ${record.source}`)
      }
    }
    const indices = new Map<string, Map<string, number>>([
      [ 'FN', new Map() ],
      [ 'FNDA', new Map() ],
    ])
    const renderedLines = lines.map(line => {
      if (line.startsWith('SF:')) return `SF:${sourceKey(record.source, root)}`
      const declaration = /^(FN|FNDA):([^,]+),(.+)$/.exec(line)
      if (declaration && (declarations.get(declaration[3]!) ?? 0) > 1) {
        const nextIndices = indices.get(declaration[1]!)!
        const index = nextIndices.get(declaration[3]!) ?? 0
        nextIndices.set(declaration[3]!, index + 1)
        return `${declaration[1]}:${declaration[2]},${declaration[3]} (${index + 1})`
      }
      return line
    })
    return renderedLines.join('\n')
  }).join('\n')}\n`
}

function relativeSource (source: string, root: string): string {
  const absolute = source.startsWith('file:')
    ? fileURLToPath(source)
    : isAbsolute(source) ? source : resolve(root, source)
  return relative(root, absolute).split(sep).join('/')
}

export function productionSources (root = ROOT): string[] {
  const sources: string[] = []
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(path)
      } else if (
        entry.isFile()
        && entry.name.endsWith('.ts')
        && !entry.name.endsWith('.d.ts')
        && !entry.name.endsWith('.test.ts')
        && !relative(root, path).split(sep).includes('fixtures')
        && !SOURCE_EXCLUDES.has(relative(root, path).split(sep).join('/'))
      ) {
        sources.push(relative(root, path).split(sep).join('/'))
      }
    }
  }
  visit(join(root, 'src'))
  if (!sources.length) {
    throw new Error('Production source discovery returned no TypeScript files')
  }
  return sources
}

export function assertTestDiscovery (files: string[]): void {
  if (!files.length) {
    throw new Error('Native test discovery returned no *.test.ts files')
  }
}

export function coverageExitCode (testStatus: number, reportStatus: number): number {
  return testStatus || reportStatus
}

export function coveragePassed (testStatus: number, validationStatus: number): boolean {
  return testStatus === 0 && validationStatus === 0
}

export function summarizeLcov (records: LcovRecord[]): CoverageMetrics {
  if (!records.length) {
    throw new Error('LCOV report has no source records')
  }
  const result = Object.fromEntries(
    Object.keys(METRICS).map(name => [ name, metric(0, 0) ]),
  ) as CoverageMetrics
  for (const record of records) {
    for (const name of Object.keys(METRICS) as MetricName[]) {
      result[name].covered += record.metrics[name].covered
      result[name].total += record.metrics[name].total
    }
  }
  for (const name of Object.keys(METRICS) as MetricName[]) {
    if (!result[name].total) {
      throw new Error(`LCOV report has no ${name} coverage data`)
    }
    result[name].percent = result[name].covered / result[name].total * 100
  }
  return result
}

export function assertBaseline (measured: CoverageMetrics, baseline: unknown): asserts baseline is CoverageBaseline {
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
    throw new Error('Coverage baseline must be an object')
  }
  const value = baseline as Record<string, unknown>
  for (const name of Object.keys(METRICS) as MetricName[]) {
    const floor = value[name]
    if (typeof floor !== 'number' || !Number.isFinite(floor) || floor < 0 || floor > 100) {
      throw new Error(`Coverage baseline has an invalid ${name} floor`)
    }
    if (measured[name].percent < floor) {
      throw new Error(`${name} coverage ${measured[name].percent.toFixed(2)}% is below the ${floor}% baseline`)
    }
  }
  if (Object.keys(value).length !== Object.keys(METRICS).length) {
    throw new Error('Coverage baseline must contain only lines, functions, and branches')
  }
}

function assertSources (records: LcovRecord[], expectedSources: string[], root = ROOT): Map<string, LcovRecord> {
  const bySource = new Map<string, LcovRecord>()
  for (const record of records) {
    const key = sourceKey(record.source, root)
    if (bySource.has(key)) {
      throw new Error(`LCOV report contains duplicate production source: ${key}`)
    }
    bySource.set(key, record)
  }
  const expected = new Set(expectedSources)
  const unexpected = [ ...bySource.keys() ].filter(path => !expected.has(path))
  const missing = expectedSources.filter(path => !bySource.has(path))
  if (unexpected.length || missing.length) {
    throw new Error(`LCOV production source mismatch; missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}`)
  }
  return bySource
}

export function mergeUnloadedSources (
  nativeLcov: string,
  zeroLcov: string,
  expectedSources: string[],
  root = ROOT,
): string {
  const nativeRecords = parseLcov(nativeLcov)
  const zeroRecords = parseLcov(zeroLcov)
  const nativeBySource = new Map(nativeRecords.map(record => [ sourceKey(record.source, root), record ]))
  const zeroBySource = assertSources(zeroRecords, expectedSources, root)
  const expected = new Set(expectedSources)
  const unexpected = [ ...nativeBySource.keys() ].filter(path => !expected.has(path))
  if (unexpected.length) {
    throw new Error(`Deno LCOV contains unexpected sources: ${unexpected.join(', ')}`)
  }
  for (const [ path, record ] of zeroBySource) {
    const hasHitLine = record.text.split(/\r?\n/).some(line =>
      line.startsWith('DA:') && Number(line.split(',')[1]) !== 0,
    )
    const hasHitFunction = record.text.split(/\r?\n/).some(line =>
      line.startsWith('FNDA:') && Number(line.slice('FNDA:'.length).split(',')[0]) !== 0,
    )
    const hasHitBranch = record.text.split(/\r?\n/).some(line =>
      line.startsWith('BRDA:') && !line.endsWith(',-') && Number(line.slice(line.lastIndexOf(',') + 1)) !== 0,
    )
    if (record.metrics.functions.covered || record.metrics.branches.covered || hasHitLine || hasHitFunction || hasHitBranch) {
      throw new Error(`Unloaded-source denominator has hits for ${path}`)
    }
  }

  const combined = [ ...nativeRecords ]
  for (const path of expectedSources) {
    if (!nativeBySource.has(path)) {
      const record = zeroBySource.get(path)!
      const zeroHitRecord = record.text.replace(/(^|\n)LH:\d+(\n)/, '$1LH:0$2')
      combined.push(parseLcov(zeroHitRecord)[0]!)
    }
  }
  assertSources(combined, expectedSources, root)
  return `${combined.map(record => record.text).join('\n')}\n`
}

export function assertCoverageProbe (lcov: string, sourceName: string, root = ROOT): void {
  const records = parseLcov(lcov)
  const record = records.find(item => relativeSource(item.source, root) === sourceName)
  if (!record) {
    throw new Error(`Coverage probe did not report ${sourceName}`)
  }
  const lines = record.text.split(/\r?\n/)
  if (!lines.includes('DA:5,0')) {
    throw new Error(`Coverage probe did not mark TypeScript line 5 uncovered in ${sourceName}`)
  }
  if (!lines.some(line => /^BRDA:4,\d+,\d+,0$/.test(line))) {
    throw new Error(`Coverage probe did not mark the TypeScript branch on line 4 uncovered in ${sourceName}`)
  }
}

function testFiles (root = ROOT): string[] {
  const files: string[] = []
  for (const directory of [ 'src', 'scripts', 'tests/unit' ]) {
    const visit = (path: string) => {
      for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const child = join(path, entry.name)
        if (entry.isDirectory()) {
          visit(child)
        } else if (entry.isFile() && entry.name.endsWith('.test.ts')) {
          files.push(relative(root, child).split(sep).join('/'))
        }
      }
    }
    visit(join(root, directory))
  }
  assertTestDiscovery(files)
  return files
}

function run (command: string, args: string[], env?: NodeJS.ProcessEnv): number {
  const result = spawnSync(command, args, { cwd: ROOT, env, stdio: 'inherit' })
  if (result.error) {
    console.error(`${command} failed: ${result.error.message}`)
    return 1
  }
  return result.status ?? 1
}

function coverageArgs (destination: string, include = 'src/**/*.ts'): string[] {
  return [
    '--test',
    '--test-timeout=180000',
    '--experimental-test-coverage',
    `--test-coverage-include=${include}`,
    '--test-coverage-exclude=**/*.test.ts',
    '--test-coverage-exclude=**/*.d.ts',
    '--test-coverage-exclude=src/**/fixtures/**/*.ts',
    '--test-coverage-exclude=src/package-json.ts',
    '--test-coverage-include-all',
    '--test-reporter=spec',
    '--test-reporter-destination=stdout',
    '--test-reporter=lcov',
    `--test-reporter-destination=${destination}`,
  ]
}

function baselineFor (runtime: 'node' | 'deno'): CoverageBaseline {
  return JSON.parse(readFileSync(join(ROOT, '.github', 'coverage-baselines', `${runtime}.json`), 'utf8')) as CoverageBaseline
}

function validateAndRender (runtime: 'node' | 'deno', testStatus: number, validationStatus = 0): boolean {
  const output = join('coverage', runtime)
  const lcovPath = join(output, 'lcov.info')
  try {
    if (!existsSync(lcovPath)) {
      throw new Error(`Missing ${runtime} LCOV report: ${lcovPath}`)
    }
    const sources = productionSources()
    const records = parseLcov(readFileSync(lcovPath, 'utf8'))
    assertSources(records, sources)
    const metrics = summarizeLcov(records)
    const baseline = baselineFor(runtime)
    let baselineStatus = true
    try {
      assertBaseline(metrics, baseline)
    } catch (error) {
      baselineStatus = false
      console.error(error instanceof Error ? error.message : error)
    }
    const html = join(output, 'html')
    mkdirSync(html, { recursive: true })
    const renderLcovPath = join(tmpdir(), `wechaty-${runtime}-render-${process.pid}.lcov`)
    writeFileSync(renderLcovPath, normalizeLcovForRenderer(readFileSync(lcovPath, 'utf8')))
    const renderArgs = [
      '--ignore-errors', 'inconsistent',
      '--title=Wechaty native coverage',
      ...(runtime === 'deno' ? [ '--branch-coverage' ] : []),
      `--output-directory=${html}`,
      renderLcovPath,
    ]
    let renderStatus = 1
    try {
      renderStatus = run('genhtml', renderArgs)
    } finally {
      rmSync(renderLcovPath, { force: true })
    }
    if (renderStatus !== 0 || !existsSync(join(html, 'index.html'))) {
      console.error('LCOV HTML rendering failed or did not produce index.html')
    }
    const reportResult = validationStatus === 0 && baselineStatus && renderStatus === 0
    const result = coveragePassed(testStatus, reportResult ? 0 : 1) ? 'pass' : 'fail'
    writeFileSync(join(output, 'totals.json'), `${JSON.stringify({
      runtime,
      metrics,
      baseline,
      testExitCode: testStatus,
      validationExitCode: reportResult ? 0 : 1,
      result,
    }, null, 2)}\n`)
    const table = [
      `| ${runtime === 'node' ? 'Node' : 'Deno'} | ${metrics.lines.percent.toFixed(2)}% | ${metrics.functions.percent.toFixed(2)}% | ${metrics.branches.percent.toFixed(2)}% | ${baseline.lines}% / ${baseline.functions}% / ${baseline.branches}% | ${result} |`,
    ].join('\n')
    const summaryPath = process.env['GITHUB_STEP_SUMMARY']
    if (summaryPath) {
      appendFileSync(summaryPath, `\n## ${runtime === 'node' ? 'Node.js' : 'Deno'} native coverage\n\n| Runtime | Lines | Functions | Branches | Required baseline (L/F/B) | Result |\n| --- | ---: | ---: | ---: | --- | --- |\n${table}\n`)
    } else {
      console.log(`\n| Runtime | Lines | Functions | Branches | Required baseline (L/F/B) | Result |\n| --- | ---: | ---: | ---: | --- | --- |\n${table}`)
    }
    return result === 'pass'
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    return false
  }
}

function probe (runtime: 'node' | 'deno', output: string): number {
  const test = 'tests/fixtures/coverage-probe.test.ts'
  if (runtime === 'node') {
    return run(process.execPath, [
      ...coverageArgs(output, 'tests/fixtures/coverage-probe.ts'),
      test,
    ])
  }
  const profile = join(tmpdir(), `wechaty-${runtime}-coverage-probe-${process.pid}`)
  rmSync(profile, { recursive: true, force: true })
  const env = denoEnvironment()
  const testStatus = run(denoBinary(), [
    'test',
    '--no-check',
    `--coverage=${profile}`,
    '--allow-read=.,/tmp',
    '--allow-write=/tmp',
    '--allow-env',
    test,
  ], env)
  const coverageStatus = run(denoBinary(), [
    'coverage',
    profile,
    '--include=coverage-probe.ts',
    '--lcov',
    `--output=${output}`,
  ], env)
  rmSync(profile, { recursive: true, force: true })
  return testStatus || coverageStatus
}

function nodeRuntimeCoverage (tests: string[]): number {
  const output = join(ROOT, 'coverage', 'node')
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const status = run(process.execPath, [ ...coverageArgs('coverage/node/lcov.info'), ...tests ])
  let probeStatus = 0
  const probeOutput = join(tmpdir(), `wechaty-node-coverage-probe-${process.pid}.lcov`)
  try {
    probeStatus = probe('node', probeOutput)
    assertCoverageProbe(readFileSync(probeOutput, 'utf8'), 'tests/fixtures/coverage-probe.ts')
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    probeStatus ||= 1
  } finally {
    rmSync(probeOutput, { force: true })
  }
  const valid = validateAndRender('node', status, probeStatus)
  return coverageExitCode(status, valid ? 0 : 1)
}

function denoBinary (): string {
  return process.env['DENO_BINARY'] ?? 'deno'
}

function denoEnvironment (): NodeJS.ProcessEnv {
  return {
    PATH: process.env['PATH'] ?? '',
    HOME: process.env['HOME'] ?? '',
    CI: process.env['CI'] ?? '',
    NODE_BINARY: process.env['NODE_BINARY'] ?? process.execPath,
  }
}

function denoCoverage (tests: string[]): number {
  const output = join(ROOT, 'coverage', 'deno')
  const profile = join(output, 'raw')
  rmSync(output, { recursive: true, force: true })
  mkdirSync(output, { recursive: true })
  const nativeLcov = join(output, 'lcov-native.info')
  const denominator = join(output, 'unloaded.lcov')
  const probeOutput = join(tmpdir(), `wechaty-deno-coverage-probe-${process.pid}.lcov`)
  let testStatus = 1
  let reportStatus = 0
  let denominatorStatus = 0
  let probeStatus = 0
  try {
    const env = denoEnvironment()
    testStatus = run(denoBinary(), [
      'test',
      '--no-check',
      `--coverage=${profile}`,
      '--allow-read=.,/tmp,/etc/alpine-release',
      '--allow-write=coverage/deno,/tmp',
      '--allow-run=git,node',
      '--allow-env',
      '--allow-sys=hostname',
      '--allow-ffi=node_modules/leveldown/prebuilds',
      ...tests,
    ], env)

    const filterArgs = [
      '--include=src/',
      '--exclude=\\.test\\.ts$',
      '--exclude=\\.d\\.ts$',
      '--exclude=fixtures/',
      '--exclude=src/package-json\\.ts$',
    ]
    if (existsSync(profile)) {
      reportStatus = run(denoBinary(), [
        'coverage',
        profile,
        ...filterArgs,
        '--lcov',
        `--output=${nativeLcov}`,
      ], env)
      const htmlStatus = run(denoBinary(), [
        'coverage',
        profile,
        ...filterArgs,
        '--html',
      ], env)
      reportStatus ||= htmlStatus
      const nativeHtml = join(profile, 'html')
      if (existsSync(nativeHtml)) {
        const destination = join(output, 'native-html')
        rmSync(destination, { recursive: true, force: true })
        renameSync(nativeHtml, destination)
      } else {
        reportStatus ||= 1
        console.error('Deno did not produce its native HTML report')
      }
    } else {
      reportStatus = 1
      console.error('Deno did not produce a coverage profile')
    }

    denominatorStatus = run(process.execPath, [
      ...coverageArgs(denominator),
      'tests/fixtures/coverage-empty.test.ts',
    ])
    probeStatus = probe('deno', probeOutput)
    try {
      assertCoverageProbe(readFileSync(probeOutput, 'utf8'), 'tests/fixtures/coverage-probe.ts')
      if (existsSync(nativeLcov) && existsSync(denominator)) {
        const merged = mergeUnloadedSources(
          readFileSync(nativeLcov, 'utf8'),
          readFileSync(denominator, 'utf8'),
          productionSources(),
        )
        writeFileSync(join(output, 'lcov.info'), merged)
      } else {
        reportStatus ||= 1
        console.error('Deno or Node unloaded-source denominator LCOV report is missing')
      }
    } catch (error) {
      reportStatus ||= 1
      console.error(error instanceof Error ? error.message : error)
    }
  } catch (error) {
    reportStatus ||= 1
    console.error(error instanceof Error ? error.message : error)
  } finally {
    rmSync(probeOutput, { force: true })
    rmSync(denominator, { force: true })
    rmSync(nativeLcov, { force: true })
    rmSync(profile, { recursive: true, force: true })
  }
  const validationStatus = reportStatus || denominatorStatus || probeStatus
  const valid = validateAndRender('deno', testStatus, validationStatus)
  return coverageExitCode(testStatus, valid ? 0 : 1)
}

function main (): void {
  const runtime = process.argv[2]
  if (runtime !== 'node' && runtime !== 'deno') {
    console.error('Usage: node scripts/coverage.ts <node|deno>')
    process.exitCode = 2
    return
  }
  try {
    const tests = testFiles()
    process.exitCode = runtime === 'node'
      ? nodeRuntimeCoverage(tests)
      : denoCoverage(tests)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main()
}
