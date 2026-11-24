/**
 * Browser shim for file-box QR code utilities.
 *
 * QR code image processing (Jimp / jsQR) is Node-specific and unused by puppet unit tests.
 * This module stubs those operations for in-browser test execution.
 */

/**
 * Stubs QR code decoding from a buffer.
 */
export async function bufferToQrValue (_buf: unknown): Promise<string> {
  throw new Error('QR code decoding is not supported in browser environment')
}

/**
 * Stubs QR code stream generation from a string.
 */
export function qrValueToStream (_value: string): unknown {
  throw new Error('QR code stream generation is not supported in browser environment')
}
