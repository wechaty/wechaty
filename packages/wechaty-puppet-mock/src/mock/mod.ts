/**
 * The `mock` namespace: `Mocker`, `SimpleEnvironment`, and the contact, room
 * and message mocks.
 */
import { Mocker } from './mocker.ts'
import {
  type EnvironmentMock,
  SimpleEnvironment,
}                     from './environment.ts'
import {
  ContactMock,
  RoomMock,
  MessageMock,
}                     from './user/mod.ts'

export type {
  EnvironmentMock,
}
export {
  Mocker,
  SimpleEnvironment,
  ContactMock,
  RoomMock,
  MessageMock,
}
