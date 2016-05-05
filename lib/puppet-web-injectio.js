/**
*
* Wechaty - Robot API/SDK Library for Personal WeChat(微信) Account
*
* Inject this js code to browser, 
* in order to interactive with wechat web program.
*
* Licenst: MIT
* https://github.com/zixia/wechaty-lib
*

     MMCgi.isLogin
     loginScope.qrcodeUrl

     loginScope.code:
       0:   显示二维码
       201: 扫描，未确认
       200: 登录成功
       408: 未确认

*/
;(function (port) {
  port = port || 8788


  var Wechaty = {
    // get all we need from browser(angularjs)
    glue: {
      injector:       angular.element(document).injector()
      , rootScope:    injector.get("$rootScope")
      , http:         injector.get("$http")
      , chatFactory:  injector.get("chatFactory")
      , confFactory:  injector.get("confFactory")
      , loginScope:   angular.element(".login_box").scope()
    }

    // variables
    , var {
      socket:   socket
    } 

    // methods
    , func {
      , init: init
      , send: send
      , zlog: zlog
      , log:  log

      , log:  function (msg) { socket && socket.emit('log', msg) }
      , ping: function () { return 'pong' }

      , getLoginStatusCode: function () { return loginScope.code }
      , getLoginQrImgUrl:   function () { return loginScope.qrcodeUrl }
      , isLogined:          function () { return 200===loginScope.code }
      , isReady:            function () { return !!(angular && angular.element && angular.element("body")) }
      
      , initSocket: initSocket

    }
  }

  function send (ToUserName, Content) {
    var m = chatFactory.createMessage({
      ToUserName: ToUserName
      , Content: Content
    })
    chatFactory.appendMessage(m)
    return chatFactory.sendMessage(m)
  }

  function init() {
    initZlog()
    zlog('wechaty port ' + port)
    initSocket()  // save to socket
    
    hookUnload()  
    hookMessage()

    zlog('Wechaty injected!. ;-D')
  }

  angular.extend(Wechaty, {
  })

 
  function initZlog() {
    var enable = true
    if (enable) {
      if (!console.memory && console.time) { // wechat debuger exist
        delete console
      }
      console.zlog = window.console.log
      window.zlog = function (s) { return console.zlog(s) }
      console.log = function () {}
    } else {
      window.zlog = function () {}
    }
  }

  function hookMessage() {
    rootScope.$on("message:add:success", function (event, data) { 
      socket.emit('message', data)
      .catch(function (e) { zlog('socket.emit(message, data) fail:'); zlog(e) })
    })
  }

  function hookUnload() {
    window.addEventListener ('unload', function (e) {
      socket.emit('unload') 
    })
  }

  function initSocket() {
    // Wechaty global variable: socket
    Wechaty.socket = io.connect('https://127.0.0.1:' + port)

    zlog('socket: ' + socket)
    
    Wechaty.socket.on('connect', function() {
      zlog('on connect entried')

      rootScope.$on("message:add:success", function (event, data) { 
        socket.emit('message', data)
      })

      socket.on('disconnect', function(e) {
        zlog('event: socket disconnect')
        // socket.emit('disconnect', e)

        // Reconnect...
        setTimeout(initSocket, 1000)
      })

      // for test & live check purpose: ping -> pong
      socket.on('ping', function (e) {
        zlog('received socket io event: ping. emit pong...')
        socket.emit('pong', 'pong')
      })
    })

  }

  window.Wechaty = Wechaty
  return 'Wechaty'

}(arguments[0]))
