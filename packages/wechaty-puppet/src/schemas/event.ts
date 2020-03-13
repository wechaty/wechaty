/**
 * The event `scan` status number.
 */
export enum ScanStatus {
  Unknown = 0,
  Cancel,
  Waiting,
  Scanned,
  Confirmed,
  Timeout,
}
