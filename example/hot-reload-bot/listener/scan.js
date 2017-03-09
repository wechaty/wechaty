exports = module.exports = function onScan (url, code) {
    let loginUrl = url.replace('qrcode', 'l');
    require('qrcode-terminal').generate(loginUrl);
    console.log(url);
}