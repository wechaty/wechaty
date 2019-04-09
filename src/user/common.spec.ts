import { SinonSandbox } from 'sinon'
import { Puppet, RoomPayload } from 'wechaty-puppet'

export const mockRoomPayload = (
  sandbox: SinonSandbox,
  puppet: Puppet,
  topic: string,
) => {
  sandbox.stub(puppet, 'roomPayload').callsFake(async () => {
    await new Promise(r => setImmediate(r))
    return { topic } as RoomPayload
  })
}
