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
  var port      = port || 8788

  var injector  = angular.element(document).injector()
  var rootScope = injector.get("$rootScope")
  var http      = injector.get("$http")

  var chatFactory = injector.get("chatFactory")
  var confFactory = injector.get("confFactory")

  var loginScope = angular.element(".login_box").scope()


  var Wechaty = function () {
    debug(true)
    hook()

    zlog('Wechaty injected!. ;-D')
  }

  angular.extend(Wechaty, {
    debug: debug
    , getLoginStatusCode: function () { return loginScope.code }
    , getLoginQrImgUrl:   function () { return loginScope.qrcodeUrl }
    , isLogined:          function () { return 200===loginScope.code }
    , isReady:            function () { return !!(angular && angular.element && angular.element("body")) }
  })

 
  function debug(enable) {
    if (enable) {
      delete window.console.log
      delete window.console
      window.console.zlog = window.console.log
      window.zlog = function (s) { return window.console.zlog(s) }
      window.console.log = function () {}
    } else {
      window.zlog = function () {}
    }
  }

  function hook() {
    rootScope.$on("message:add:success", function (event, data) { 
      http.post('https://localhost:' + port, data) 
    })
  }

  window.Wechaty = Wechaty

  return Wechaty
}(arguments[0]))

