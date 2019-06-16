/**
 * The event `scan` status number.
 */
export enum ScanStatus {
  Unknown   = -1,

  Cancel    = 0,

  Waiting   = 1,
  Scanned   = 2,
  Confirmed = 3,
  Timeout   = 4,
}
