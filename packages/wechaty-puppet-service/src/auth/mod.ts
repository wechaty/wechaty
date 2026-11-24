/**
 * Public entry of the `auth/` folder: token authorization for the server and
 * token credentials for the client.
 */
import { authImplToken }                                      from './auth-impl-token.ts'
import { monkeyPatchMetadataFromHttp2Headers }                from './mokey-patch-header-authorization.ts'
import { callCredToken }                                      from './call-cred.ts'

export {
  authImplToken,
  callCredToken,
  monkeyPatchMetadataFromHttp2Headers,
}
