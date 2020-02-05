/**
 * Huan(202001): support both seconds & milliseconds
 *
 * How to test if a given time-stamp is in seconds or milliseconds?
 * https://stackoverflow.com/a/23982005/1123955
 */
export function timestampToDate (timestamp: number): Date {
  /**
    * 1e11:
    *   in milliseconds:  Sat Mar 03 1973 09:46:39 UTC
    *   in seconds:       Wed Nov 16 5138 9:46:40 UTC
    */
  if (timestamp < 1e11) {
    timestamp *= 1000 // turn seconds to milliseconds
  }

  return new Date(timestamp)
}
