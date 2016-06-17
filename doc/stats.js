function AQ_SECAPI_ESCAPE(Url, map) {
    var tmpArr = new Array;
    for (var m = 0; m < Url.length; m++) {
        if (Url.charAt(m) == '&') {
            var keyLen = [3, 4, 5, 9];
            var matchFlag = 0;
            for (var n in keyLen) {
                var l = keyLen[n];
                if (m + l <= Url.length) {
                    var subLow = Url.substr(m, l).toLowerCase();
                    if (map[subLow]) {
                        tmpArr.push(map[subLow]);
                        m = m + l - 1;
                        matchFlag = 1;
                        break;
                    }
                }
            }
            if (matchFlag == 0) {
                tmpArr.push(Url.charAt(m));
            }
        } else {
            tmpArr.push(Url.charAt(m));
        }
    }
    return tmpArr.join("");
}
function AQ_SECAPI_CheckXss() {
    var map = new Object();
    var escapeChars = "'\"<>`script:daex/hml;bs64,";
    for (var i = 0; i < escapeChars.length; i++) {
        var cha = escapeChars.charAt(i);
        var dec = cha.charCodeAt();
        var dec7 = dec;
        var hex = dec.toString(16);
        for (var j = 0; j < (7 - dec.toString().length); j++) {
            dec7 = "0" + dec7;
        }
        map["&#" + dec + ";"] = cha;
        map["&#" + dec7] = cha;
        map["&#x" + hex] = cha;
    }
    map["&lt"] = "<";
    map["&gt"] = ">";
    map["&quot"] = "\"";
    var Url = location.href;
    var Refer = document.referrer;
    Url = decodeURIComponent(AQ_SECAPI_ESCAPE(Url, map));
    Refer = decodeURIComponent(AQ_SECAPI_ESCAPE(Refer, map));
    var XssPattern = new RegExp("['\"<>`]|script:|data:text/html;base64,");
    if (XssPattern.test(Url) || XssPattern.test(Refer)) {
        var version = '1.5'
          , cgi = 'http://zyjc.sec.qq.com/dom'
          , img = new Image();
        img.src = cgi + "?v=" + version + "&u=" + encodeURIComponent(Url) + "&r=" + encodeURIComponent(Refer);
        Url = Url.replace(/['\"<>`]|script:/gi, 'M');
        Url = Url.replace(/data:text\/html;base64,/gi, 'data:text/plain;base64,');
        location.href = encodeURI(Url);
    }
}
AQ_SECAPI_CheckXss();
(function(_wnd, _doc, _ln) {
    function checkNonTxDomain(level, bid, pagetype) {
        var checkInfo = {
            bid: bid,
            childUrl: "",
            parentUrl: ""
        }, childCheckFlag, parentCheckFlag;
        try {
            checkInfo.childUrl = _ln.href;
        } catch (ign) {}
        try {
            checkInfo.parentUrl = parent.location.href;
        } catch (ign) {}
        if (Math.random() > level) {
            return;
        }
        if (pagetype == 1) {
            try {
                parentCheckFlag = (parent != _wnd) ? generateNonTxDomainFromDom(parent.document, 'datapp', checkInfo) : false;
            } catch (ign) {}
        } else {
            try {
                childCheckFlag = generateNonTxDomainFromDom(_doc, 'datapt', checkInfo);
                parentCheckFlag = (parent != _wnd) ? generateNonTxDomainFromDom(parent.document, 'datapp', checkInfo) : false;
            } catch (ign) {}
            try {
                if (parent != _wnd) {
                    generateZyjIframed(checkInfo);
                }
            } catch (ign) {}
        }
    }
    function generateZyjIframed(checkInfo) {
        var data = [];
        data.push("beframed::url");
        packZyjUrlData(data, 'beframed', checkInfo);
    }
    function packZyjUrlData(data, dataMark, checkInfo) {
        var version = '1.4'
          , cgi = 'http://zyjc.sec.qq.com/cr'
          , img = new Image();
        data.push("childUrl::" + encodeURIComponent(checkInfo.childUrl));
        data.push("parentUrl::" + encodeURIComponent(checkInfo.parentUrl));
        img.src = cgi + "?id=" + checkInfo.bid + "&d=" + dataMark + "=v" + version + "|" + data.join('|');
        return true;
    }
    function generateNonTxDomainFromDom(dom, parentMark, checkInfo) {
        var scriptData = extractNonTxScriptWorm(dom);
        var iframeData = extractNonTxIframe(dom);
        var frameData = extractNonTxFrame(dom);
        var embedData = extractNonTxEmbed(dom);
        var imgData = extractNonTxIMG(dom);
        var hacks = scriptData.concat(iframeData, frameData, imgData, embedData);
        if (hacks.length <= 0) {
            return false;
        }
        hacks = distinctZyjArray(hacks);
        packZyjUrlData(hacks, parentMark, checkInfo);
    }
    function extractNonTxScriptWorm(dom) {
        var scripts = dom.getElementsByTagName("script"), scriptData = [], tempScript, urlList, url, nonTxList, mapFunc, resultList;
        for (var i = 0; i < scripts.length; i++) {
            tempScript = scripts[i];
            if (url = tempScript.src) {
                scriptData.push(url);
            }
        }
        nonTxList = grepZyjList(scriptData, isAntiTxDomain);
        mapFunc = addTagToZyjUrlCallback('script');
        resultList = mapZyjList(nonTxList, mapFunc);
        return resultList;
    }
    function extractNonTxScript(dom) {
        var scripts = dom.getElementsByTagName("script"), scriptData = [], tempScript, urlList, url, nonTxList, mapFunc, resultList;
        for (var i = 0; i < scripts.length; i++) {
            tempScript = scripts[i];
            urlList = extractZyjUrlFromHtml(tempScript.innerHTML);
            scriptData = scriptData.concat(urlList);
            if (url = tempScript.src) {
                scriptData.push(url);
            }
        }
        nonTxList = grepZyjList(scriptData, isAntiTxDomain);
        mapFunc = addTagToZyjUrlCallback('script_worm');
        resultList = mapZyjList(nonTxList, mapFunc);
        return resultList;
    }
    function extractZyjUrlFromHtml(html) {
        var regUrl = /\bhttps?:\/\/[^\"\'\s]+/ig
          , urlList = [];
        while (url = regUrl.exec(html)) {
            urlList.push(url);
        }
        return urlList;
    }
    function grepZyjList(testList, testFunction) {
        var grepList = [];
        for (var idx = 0; idx < testList.length; ++idx) {
            var temp = testList[idx];
            if (testFunction(temp)) {
                grepList.push(temp);
            }
        }
        return grepList;
    }
    function isAntiTxDomain(sUrl) {
        var sDomain = extractZyjDomain(sUrl), regErrDom, regTxCom, regTxCn, regTxNet, regTxOther;
        if (!sDomain) {
            return false;
        }
        regErrDom = /^xui.ptlogin2?\.?$/i;
        regTxCom = /(\.|^)(qq|paipai|soso|wenwen|tenpay|macromedia|gtimg|qstatic|qqmail|paipaiimg|qqgames|pengyou|foxmail|qzoneapp|qzone|qplus|imqq|tqapp|tencent|3366|21mmo|taotao|imrworldwide|idqqimg|17roco|expo2010china|fangqq|tencentmind|tencity|yingkebicheng|zhangzhongxing|expovol|otaworld|gzyunxun|heyyo|himoral|himorale|myrtx|qqwinner|redian|sjkx|rtxonline|nbaso|paipai\.500wan|qqjapan|qq\.salewell|sogou|weiyun|flzhan)\.com$/i;
        regTxCn = /(\.|^)(qq\.com|gtimg|gtimg\.com|qlogo|foxmail\.com|gtimg\.com|url|qpic|tencent\.com|expo2010|expo|himorale\.com|nbaso\.com|qqtest\.com|qq\.ucar|rtx\.com|soso\.com|tcimage)\.cn$/i;
        regTxNet = /(\.|^)(5999|gongyi)\.net$/i;
        regTxOther = /(\.|^)(himorale\.com\.hk|tencent\.com\.hk|qq\.chinacache\.net|qq\.com\.fastcdn\.com|qq\.com\.lxdns\.com|qq\.fastcdn\.com|soso\.com\.lxdns\.com|motu\.pagechoice\.net|ope\.tanx\.com|dap\.gentags\.net)$/i;
        if (regErrDom.test(sDomain) || regTxCom.test(sDomain) || regTxCn.test(sDomain) || regTxNet.test(sDomain) || regTxOther.test(sDomain)) {
            return false;
        }
        return true;
    }
    function extractZyjDomain(sUrl) {
        var regDomain = /^https?:\/\/([\w\-]+\.[\w\-.]+)/i
          , m = regDomain.exec(sUrl);
        if (!m) {
            return;
        }
        return m[1];
    }
    function addTagToZyjUrlCallback(tag) {
        return function(url) {
            return tag + "::" + encodeURIComponent(url);
        }
        ;
    }
    function mapZyjList(testList, testFunction) {
        var mapList = [], temp, mapTemp;
        for (var idx = 0; idx < testList.length; ++idx) {
            temp = testList[idx];
            mapTemp = testFunction(temp);
            mapList.push(mapTemp);
        }
        return mapList;
    }
    function extractNonTxIframe(dom) {
        var tagName = 'IFRAME'
          , rawFunc = function(x) {
            return x.src
        }
          , mapFunc = addTagToZyjUrlCallback('iframe');
        return extractNonTxTagData(dom, tagName, rawFunc, isAntiTxDomain, mapFunc);
    }
    function extractNonTxEmbed(dom) {
        var tagName = 'EMBED'
          , rawFunc = function(x) {
            return x.src
        }
          , mapFunc = addTagToZyjUrlCallback('embed');
        return extractNonTxTagData(dom, tagName, rawFunc, isAntiTxDomain, mapFunc);
    }
    function extractNonTxTagData(dom, tag, rawFunc, grepFunc, mapFunc) {
        var tags = dom.getElementsByTagName(tag);
        var tagRaw = mapZyjList(tags, rawFunc);
        var tagData = grepZyjList(tagRaw, grepFunc);
        var tagResult = mapZyjList(tagData, mapFunc);
        return tagResult;
    }
    function extractNonTxFrame(dom) {
        var tagName = 'FRAME'
          , rawFunc = function(x) {
            return x.src
        }
          , mapFunc = addTagToZyjUrlCallback('frame');
        return extractNonTxTagData(dom, tagName, rawFunc, isAntiTxDomain, mapFunc);
    }
    function extractNonTxForm(dom) {
        var tagName = 'FORM'
          , rawFunc = function(x) {
            return x.action
        }
          , mapFunc = addTagToZyjUrlCallback('form');
        return extractNonTxTagData(dom, tagName, rawFunc, isAntiTxDomain, mapFunc);
    }
    function extractNonTxIMG(dom) {
        var tagName = 'IMG'
          , rawFunc = function(x) {
            return x.src
        }
          , mapFunc = addTagToZyjUrlCallback('img');
        return extractNonTxTagData(dom, tagName, rawFunc, isAntiTxDomain, mapFunc);
    }
    function distinctZyjArray(list) {
        var sortList = list.slice(0)
          , derivedArray = [];
        sortList.sort();
        derivedArray.push(sortList[0]);
        for (var i = 1; i < sortList.length; i += 1) {
            if (sortList[i] != sortList[i - 1]) {
                derivedArray.push(sortList[i]);
            }
        }
        return derivedArray;
    }
    _wnd.checkNonTxDomain = checkNonTxDomain;
})(window, document, location);
try {
    setTimeout(function() {
        checkNonTxDomain(0.1, 100, 1);
    }, 0);
} catch (ign) {}
try {
    setTimeout(function() {
        checkNonTxDomain(0.1, 100, 0);
    }, 3000);
} catch (ign) {}
