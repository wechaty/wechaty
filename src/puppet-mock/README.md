# PUPPET-MOCK

```ts
import PuppetMock from '@chatie/wechaty-puppet-mock'

const wechaty = new Wechaty()

const puppet = new PuppetMock({
  profile,
  wechaty,
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
await this.profile.set('config', { id: 1, key: 'xxx' })
const config = await this.profile.get('config')
console.log(config)
// Output: { id: 1, key: 'xxx' }
```
