/**
 * Is there a RegExp.escape function in Javascript?
 *  https://stackoverflow.com/a/3561711/1123955
 */
export function escapeRegExp (text: string) {
  return text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
