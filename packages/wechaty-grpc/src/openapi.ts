/**
 * Subpath entry (`wechaty-grpc/openapi`) exporting the pre-generated OpenAPI 3.2.0
 * specification without pulling it into the root WinterTC bundle, and keeping
 * `info.version` synchronized with `VERSION` on lockstep releases.
 */
import { VERSION } from './config.ts'
import { openApiSpec as baseSpec, type OpenApiDocument } from './openapi-spec.ts'

export type { OpenApiDocument }

export const openApiSpec: OpenApiDocument = VERSION !== '0.0.0'
  ? {
      ...baseSpec,
      info: {
        ...baseSpec.info,
        version: VERSION,
      },
    }
  : baseSpec
