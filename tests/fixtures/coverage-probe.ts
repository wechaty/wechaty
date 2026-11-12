export function coverageProbe (value: boolean): string {
  if (value) {
    return 'covered'
  }
  return 'uncovered'
}
