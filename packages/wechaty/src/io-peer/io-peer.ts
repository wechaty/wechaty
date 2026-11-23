/// <reference path="json-rpc-peer.d.ts"/>
import jsonRpcPeer from 'json-rpc-peer'

// // https://stackoverflow.com/a/50375286/1123955
// type UnionToIntersection<U> =
//   (U extends any ? (k: U)=>void : never) extends ((k: infer I)=>void) ? I : never

// type UnknownJsonRpcPayload = Partial<UnionToIntersection<JsonRpcPayload>>

const isJsonRpcRequest      = (payload: jsonRpcPeer.JsonRpcPayload): payload is jsonRpcPeer.JsonRpcPayloadRequest      => ('method' in payload)
const isJsonRpcNotification = (payload: jsonRpcPeer.JsonRpcPayload): payload is jsonRpcPeer.JsonRpcPayloadNotification => isJsonRpcRequest(payload) && (!('id' in payload))
const isJsonRpcResponse     = (payload: jsonRpcPeer.JsonRpcPayload): payload is jsonRpcPeer.JsonRpcPayloadResponse     => ('result' in payload)
const isJsonRpcError        = (payload: jsonRpcPeer.JsonRpcPayload): payload is jsonRpcPeer.JsonRpcPayloadError        => ('error' in payload)

interface IoPeerOptions {
  serviceGrpcPort: number,
}

const getPeer = (options: IoPeerOptions) => {
  const getServiceGrpcPort = () => options.serviceGrpcPort

  const serviceImpl = {
    /**
     * Huan(202101) Need to be fixed by new IO Bus system.
     *  See: https://github.com/wechaty/wechaty-puppet-service/issues/118
     */
    getHostieGrpcPort: getServiceGrpcPort,
  }

  const onMessage = async (message: jsonRpcPeer.JsonRpcPayload): Promise<any> => {
    if (isJsonRpcRequest(message)) {
      const {
        // id,
        method,
        // params,
      } = message

      if (!(method in serviceImpl)) {
        console.error('serviceImpl does not contain method: ' + method)
        return
      }

      const serviceMethodName = method as keyof typeof serviceImpl
      switch (serviceMethodName) {
        /**
         * Huan(202101) Need to be fixed by new IO Bus system.
         *  See: https://github.com/wechaty/wechaty-puppet-service/issues/118
         */
        case 'getHostieGrpcPort':
          return serviceImpl[serviceMethodName]()

        default:
          throw new jsonRpcPeer.MethodNotFound(serviceMethodName)
      }
    } else if (isJsonRpcResponse(message)) {
      // NOOP: we are server
    } else if (isJsonRpcNotification(message)) {
      // NOOP: we are server
    } else if (isJsonRpcError(message)) {
      // NOOP: we are server
    } else {
      throw new Error('unknown json-rpc message: ' + JSON.stringify(message))
    }
    console.info(JSON.stringify(message))
  }

  const ioPeer = new jsonRpcPeer.Peer(onMessage)

  return ioPeer
}

export {
  getPeer,

  isJsonRpcError,
  isJsonRpcNotification,
  isJsonRpcRequest,
  isJsonRpcResponse,
}
