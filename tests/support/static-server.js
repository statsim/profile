const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')

const rootDir = path.resolve(__dirname, '..', '..')
const port = Number(process.env.PORT || 4173)
const host = process.env.HOST || '127.0.0.1'

const mimeTypeByExt = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
}

function getMimeType (filePath) {
  const ext = path.extname(filePath).toLowerCase()
  return mimeTypeByExt[ext] || 'application/octet-stream'
}

function normalizeRequestPath (pathname) {
  if (pathname === '/') {
    return '/index.html'
  }
  return pathname
}

function resolveSafePath (pathname) {
  const normalizedPath = path.normalize(normalizeRequestPath(pathname))
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '')
  const absolutePath = path.join(rootDir, normalizedPath)
  if (!absolutePath.startsWith(rootDir)) {
    return null
  }
  return absolutePath
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const filePath = resolveSafePath(decodeURIComponent(url.pathname))

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  let finalPath = filePath
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    finalPath = path.join(filePath, 'index.html')
  }

  fs.readFile(finalPath, (error, contents) => {
    if (error) {
      const statusCode = error.code === 'ENOENT' ? 404 : 500
      res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end(statusCode === 404 ? 'Not Found' : 'Internal Server Error')
      return
    }

    res.writeHead(200, { 'Content-Type': getMimeType(finalPath) })
    res.end(contents)
  })
})

server.listen(port, host, () => {
  // Playwright waits for an open port; log stays useful for manual debugging.
  console.log(`Static server running at http://${host}:${port}`)
})

function shutdown () {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
