# PUPPET-MOCK

```ts
import PuppetMock from 'wechaty-puppet-mock'

const puppet = new PuppetMock({
  profile,
})

const wechaty = new Wechaty({
  puppet,
})
```

## HELPER UTILITIES

### StateSwitch

```ts
this.state.on('pending')
this.state.on(true)
this.state.off('pending')
this.state.off(true)

await this.state.ready('on')
await this.state.ready('off')

```

### Watchdog

```ts
```

### Profile

```ts
this.profile.set('config', { id: 1, key: 'xxx' })
const config = await this.profile.get('config')
```

