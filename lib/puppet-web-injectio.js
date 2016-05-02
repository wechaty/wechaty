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
;(function () {
  // DEBUG START
  delete window.console.log, delete window.console
  window.console.zlog = window.console.log
  // window.console.log = function () {}
  window.zlog = function (s) { return window.console.zlog(s) }
  zlog('Wechaty injected!. ;-D')
  // DEBUG END

  var injector  = angular.element(document).injector()
  var rootScope = injector.get("$rootScope")
  var http      = injector.get("$http")

  rootScope.$on("message:add:success", function (event, data) { 
    http.post("https://localhost:${this.PORT}", data) 
  })

  var chatFactory = injector.get("chatFactory")
  var confFactory = injector.get("confFactory")

  var loginScope = angular.element(".login_box").scope()

  window.Wechaty = {
    getLoginStatusCode:   function () { return loginScope.code }
          , getLoginQrImgUrl:  function () { return loginScope.qrcodeUrl }
          , isReady:            function () { 
        return !!(angular && angular.element && angular.element("body")) 
          }
          , isLogined:          function () { return 200===loginScope.code }
  }

  return Wechaty()
}())

