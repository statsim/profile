var fs = require('fs')
var path = require('path')
var http = require('http')
var child_process = require('child_process')

var MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function getMimeType (filePath) {
  var ext = path.extname(filePath).toLowerCase()
  return MIME_TYPES[ext] || 'application/octet-stream'
}

function openBrowser (url) {
  var cmd
  if (process.platform === 'darwin') cmd = 'open'
  else if (process.platform === 'win32') cmd = 'start'
  else cmd = 'xdg-open'
  child_process.exec(cmd + ' ' + url)
}

function startServe (result) {
  var rootDir = path.resolve(__dirname, '..', '..')
  var resultJson = JSON.stringify(result)

  var server = http.createServer(function (req, res) {
    var url
    try {
      url = new URL(req.url, 'http://' + req.headers.host)
    } catch (e) {
      res.writeHead(400)
      res.end('Bad Request')
      return
    }

    // API endpoint for the profiling result
    if (url.pathname === '/api/result') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      })
      res.end(resultJson)
      return
    }

    // Serve static files
    var pathname = url.pathname === '/' ? '/index.html' : url.pathname
    var normalizedPath = path.normalize(pathname)
      .replace(/^(\.\.[/\\])+/, '')
      .replace(/^[/\\]+/, '')
    var filePath = path.join(rootDir, normalizedPath)

    if (!filePath.startsWith(rootDir)) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html')
    }

    fs.readFile(filePath, function (err, contents) {
      if (err) {
        res.writeHead(err.code === 'ENOENT' ? 404 : 500)
        res.end(err.code === 'ENOENT' ? 'Not Found' : 'Internal Server Error')
        return
      }
      res.writeHead(200, { 'Content-Type': getMimeType(filePath) })
      res.end(contents)
    })
  })

  server.listen(0, '127.0.0.1', function () {
    var port = server.address().port
    var url = 'http://127.0.0.1:' + port
    process.stderr.write('\x1b[36m✓\x1b[0m Report ready at \x1b[1m' + url + '\x1b[0m\n')
    process.stderr.write('  Press Ctrl+C to stop\n')
    openBrowser(url)
  })

  function shutdown () {
    server.close(function () { process.exit(0) })
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

module.exports = { startServe: startServe }
