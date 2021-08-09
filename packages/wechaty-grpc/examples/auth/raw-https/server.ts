import fs from 'fs'
import https from 'https'

const server = https.createServer({
  cert: fs.readFileSync('./server.crt'),
  key: fs.readFileSync('./server.key'),
  // ca: fs.readFileSync('./rootCA.crt')
})

server.on('request', (_req, res) => {
  res.writeHead(200)
  res.end('Alive!\n')
})

server.listen(6000)
