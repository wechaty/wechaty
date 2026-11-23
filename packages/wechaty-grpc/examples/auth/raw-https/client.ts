import fs from 'fs'
import https from 'https'

console.info('faint')

https.request({
  ca: [fs.readFileSync('./rootCA.crt')],
  hostname: '127.0.0.1',
  method: 'GET',
  path: '/',
  port: 6000,
  // rejectUnauthorized: false,
}, res => {
  res.on('data', data => {
    process.stdout.write(data)
  })
}).end()
