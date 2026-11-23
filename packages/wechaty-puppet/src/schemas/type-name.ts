/**
 * Reverse lookup for the `const` type maps in `src/schemas/` (`MessageType`,
 * `DirtyType`, …). 1.x exported TypeScript enums, which had reverse mappings
 * (`MessageType[7] === 'Text'`); 2.0 exports erasable `as const` objects so
 * Node.js can run the sources with type stripping, and this helper replaces
 * the reverse mapping.
 */

/**
 * Returns the name of `value` in `typeMap`, such as `'Text'` for
 * `typeName(MessageType, MessageType.Text)`, or `undefined` when no key maps
 * to it.
 */
export function typeName (
  typeMap : Readonly<Record<string, number>>,
  value   : number,
): string | undefined {
  return Object.keys(typeMap).find(key => typeMap[key] === value)
}
