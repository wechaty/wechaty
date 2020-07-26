import { Mocker } from './mocker'

type EnvironmentStart = (mocker: Mocker) => EnvironmentStop
type EnvironmentStop  = () => void

export type EnvironmentMock = EnvironmentStart
