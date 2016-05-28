var apiai = require('apiai')
 
var app = apiai('7217d7bce18c4bcfbe04ba7bdfaf9c08')
 
var request = app.textRequest('Hello')
 
request.on('response', function(response) {
    console.log(response)
})
 
request.on('error', function(error) {
    console.log(error)
})
 
request.end()
