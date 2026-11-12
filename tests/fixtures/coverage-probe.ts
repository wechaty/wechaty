export function coverageProbe (value: boolean): string {
  if (value) {
    return 'covered'
  }
  return 'uncovered'
}
// Lines 4 and 5 are asserted by the coverage probe; keep their positions stable.
