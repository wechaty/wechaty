# Examples

1. How to define a middleware
```
// 抽象通过能力为中间件，由中间件控制事件响应
const filterMiddleWare = (options) {
  return async (message, next) => {

    const room = message.room()

    if (!room) return 
    if (message.type() !== option.type) return 
    if (!matchers.roomMatcher(option.room)) return

    await next();
  }
}
```

2. Add middleware to specified event
```
// Only room a print `banana`
bot.on('message', 
  filterMiddlerWare({ type: type.Message.Text, room: 'room a'}),
  (message) => console.log('banana')
);

// All rooms print `apple` 
bot.on('message', 
  (message) => console.log('apple')
);
```

3. Add global middleware
```
WechatyImpl.middleware({
  message: filterMiddleWare({ type.Message.Text, room: [ 'room-d', 'room-e' ]})
})

// Only room-d, room-e print apple.
bot.on('message', 
  (message) => console.log('apple')
);

// only room-d, room-e print orange(50% probability)
bot.on('message', async (message, next) => {
  if (Math.random() < 0.5) {
    await next();
  }
}, (message) => console.log('orange'))
```

4. Work with plugins
```
WechatyImpl.middleware({
  message: filterMiddleWare({ type.Message.Text, room: [ 'room-d', 'room-e' ]})
})

// Only room-d, room-e has kickoff feature
WechatyImpl.use(KickOffPlugin(options));


// TODO: use support rest params, so we need to think about how design it.
// WechatyImpl.use({ message: someMiddleWare() }, KickOffPlugin(options));
```

5. Work in plugins
```
const onMessage = (message) => {
  // plugin logic
}
export MyPlugin = (bot: WechatyInterface) => {
  bot.on('message', [
    MiddleWareA(),
    MiddleWareB(),
    MiddleWareC(),
  ], onMessage)
}
```