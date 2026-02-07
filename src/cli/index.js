#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var profileStream = require('../core/index').profileStream

var args = process.argv.slice(2)
var filePath = null
var useStdin = false
var delimiter = null

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--stdin') {
    useStdin = true
  } else if (args[i] === '--delimiter' && args[i + 1]) {
    delimiter = args[i + 1]
    i++
  } else if (args[i] === '--help' || args[i] === '-h') {
    process.stdout.write(
      'Usage: statsim-profile [options] [file]\n\n' +
      'Options:\n' +
      '  --stdin          Read from stdin\n' +
      '  --delimiter <d>  Set delimiter (default: , or \\t for .tsv)\n' +
      '  -h, --help       Show this help\n'
    )
    process.exit(0)
  } else if (!args[i].startsWith('--')) {
    filePath = args[i]
  }
}

if (!filePath && !useStdin) {
  process.stderr.write('Error: provide a file path or use --stdin\n')
  process.exit(1)
}

var stream
var fileSize = 0
var name = ''

if (useStdin) {
  stream = process.stdin
  name = 'stdin'
} else {
  var resolved = path.resolve(filePath)
  var stat = fs.statSync(resolved)
  fileSize = stat.size
  name = path.basename(resolved)
  stream = fs.createReadStream(resolved)
  stream.setEncoding('utf8')
}

if (!delimiter) {
  var ext = name.split('.').pop().toLowerCase()
  delimiter = ext === 'tsv' ? '\t' : ','
}

var job = profileStream(stream, {
  delimiter: delimiter,
  name: name,
  fileSize: fileSize,
  onProgress: fileSize > 1024 * 1024 ? function (percent) {
    process.stderr.write('\rProfiling... ' + percent.toFixed(1) + '%')
  } : null
})

job.promise
  .then(function (result) {
    if (fileSize > 1024 * 1024) {
      process.stderr.write('\n')
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  })
  .catch(function (err) {
    process.stderr.write('Error: ' + err.message + '\n')
    process.exit(1)
  })
