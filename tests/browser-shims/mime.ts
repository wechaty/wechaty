/**
 * Browser adapter for `mime` package.
 *
 * FileBox in browser contexts relies on MIME type resolution without
 * requiring Node-specific filesystem inspection.
 */

const MIME_MAP: Record<string, string> = {
  gif: 'image/gif',
  html: 'text/html',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  json: 'application/json',
  mp3: 'audio/mp3',
  mp4: 'video/mp4',
  pdf: 'application/pdf',
  png: 'image/png',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  webp: 'image/webp',
}

const mime = {
  /**
   * Resolves the MIME type for a given filename or path.
   */
  getType (path: string): string | null {
    if (!path) {
      return null
    }
    const ext = path.split('.').pop()?.toLowerCase()
    return (ext && MIME_MAP[ext]) || 'application/octet-stream'
  },

  /**
   * Resolves the standard file extension for a given MIME type.
   */
  getExtension (type: string): string | null {
    if (!type) {
      return null
    }
    for (const [ext, mimeType] of Object.entries(MIME_MAP)) {
      if (mimeType === type) {
        return ext
      }
    }
    return null
  },
}

export default mime
export const getType = mime.getType
export const getExtension = mime.getExtension
