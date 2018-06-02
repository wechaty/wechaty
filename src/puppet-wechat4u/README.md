# WECHATY-PUPPET-WECHAT4U



## NOTES

```js
 /**
   * 发送撤回消息请求
   */
  bot.sendMsg('测试撤回', ToUserName)
     .then(res => {
       // 需要取得待撤回消息的MsgID
       return bot.revokeMsg(res.MsgID, ToUserName)
     })
     .catch(err => {
       console.log(err)
     })
```
