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

  /**
  *
  * Get All I Need from Browser
  *
  */
  var injector  = angular.element(document).injector()
  var rootScope = injector.get("$rootScope")
  var http      = injector.get("$http")

  var chatFactory = injector.get("chatFactory")
  var confFactory = injector.get("confFactory")

  var loginScope = angular.element(".login_box").scope()



  var Wechaty = function () {
    initZlog()
    zlog('wechaty port ' + port)
    /**
    * socket might be destroyed(reconnected)
    */
    var socket

    initSocket()
    
    hookUnload()
    hookMessage()

    zlog('Wechaty injected!. ;-D')
  }

  angular.extend(Wechaty, {
    getLoginStatusCode:   function () { return loginScope.code }
    , getLoginQrImgUrl:   function () { return loginScope.qrcodeUrl }
    , isLogined:          function () { return 200===loginScope.code }
    , isReady:            function () { return !!(angular && angular.element && angular.element("body")) }
    , log:                function (msg) { SOCKET && SOCKET.emit('log', msg) }
    , ping:               function () { return 'pong' }
  })

 
  function initZlog() {
    var enable = true
    if (enable) {
      if (console) 
        delete console.log
      delete console
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
    socket = io.connect('https://127.0.0.1:' + port)

    zlog('socket: ' + socket)
    
    socket.on('connect', function() {
      zlog('on connect entried')

      rootScope.$on("message:add:success", function (event, data) { 
        socket.emit('message', data)
      })

      socket.on('disconnect', function(e) {
        zlog('event: socket disconnect')
        socket.emit('disconnect', e)

        // Reconnect...
        setTimeout(initSocket, 1000)
      })
    })

  }

  window.Wechaty = Wechaty
  return 'Wechaty'

}(arguments[0]))
