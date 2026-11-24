/**
 * Locates and reads raw `.proto` files on native runtimes. The schema entry
 * can also load in browsers, where these filesystem helpers are unavailable.
 */
import type { ApiStore } from './config.ts'

/**
 * Absolute package root on native runtimes, or an empty string in a browser.
 */
const codeRoot = globalThis.process?.getBuiltinModule?.('node:url')
  ?.fileURLToPath(new URL('..', import.meta.url)) ?? ''

/**
 * Resolves an absolute path inside the `proto/` directory of the `wechaty-grpc` package.
 *
 * @param paths Subpath segments relative to `packages/wechaty-grpc/proto/`.
 * @returns Fully qualified filesystem path.
 * @throws If the runtime has no native path API.
 */
function getProtoPath (...paths: string[]): string {
  const path = globalThis.process?.getBuiltinModule?.('node:path')
  if (!path) {
    throw new Error('Raw protobuf files require a native filesystem')
  }
  return path.join(codeRoot, 'proto', ...paths)
}

/**
 * Native access to the puppet schema path and text. Unreadable files return
 * empty text. Access from a browser throws because there is no local file.
 */
const puppet: ApiStore = {
  v0: {
    get data () {
      const file = getProtoPath('wechaty', 'puppet.proto')
      try {
        return globalThis.process?.getBuiltinModule?.('node:fs')?.readFileSync(file, 'utf8') ?? ''
      } catch {
        return ''
      }
    },
    get file () {
      return getProtoPath('wechaty', 'puppet.proto')
    },
  },
}

export {
  codeRoot,
  getProtoPath,
  puppet,
}
