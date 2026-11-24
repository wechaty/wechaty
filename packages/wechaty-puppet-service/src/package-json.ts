/**
 * The package's own package.json, embedded at build time. Git keeps an empty
 * object (checked by `package-json.test.ts`); `scripts/generate-package-json.sh`
 * writes the real manifest before packing.
 */
export const packageJson: { name?: string, version?: string, [key: string]: unknown } = {}
