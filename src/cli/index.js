#!/usr/bin/env node

var fs = require('fs')
var path = require('path')
var profileStream = require('../core/index').profileStream
var createProgress = require('./progress').createProgress
var formatSummary = require('./format-summary').formatSummary
var startServe = require('./serve').startServe

var args = process.argv.slice(2)
var filePath = null
var useStdin = false
var delimiter = null
var format = null

for (var i = 0; i < args.length; i++) {
  if (args[i] === '--stdin') {
    useStdin = true
  } else if (args[i] === '--delimiter' && args[i + 1]) {
    delimiter = args[i + 1]
    i++
  } else if (args[i] === '--format' && args[i + 1]) {
    format = args[i + 1]
    i++
  } else if (args[i] === '--help' || args[i] === '-h') {
    process.stdout.write(
      'Usage: sprofile [options] [file]\n\n' +
      'Options:\n' +
      '  --format <fmt>   Output format: json, summary, serve (default: auto)\n' +
      '  --stdin          Read from stdin\n' +
      '  --delimiter <d>  Set delimiter (default: , or \\t for .tsv)\n' +
      '  -h, --help       Show this help\n\n' +
      'Examples:\n' +
      '  sprofile data.csv                  # terminal summary\n' +
      '  sprofile data.csv --format json    # raw JSON\n' +
      '  sprofile data.csv --format serve   # open report in browser\n' +
      '  sprofile data.csv --format json | jq \'.columns[0]\'\n' +
      '  cat data.csv | sprofile --stdin\n'
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

// Auto-detect format: summary for TTY, json for piped
if (!format) {
  format = process.stdout.isTTY ? 'summary' : 'json'
}

if (['json', 'summary', 'serve'].indexOf(format) === -1) {
  process.stderr.write('Error: unknown format "' + format + '". Use json, summary, or serve\n')
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

var isTTY = process.stderr.isTTY
var progress = isTTY ? createProgress(name, fileSize) : null

var job = profileStream(stream, {
  delimiter: delimiter,
  name: name,
  fileSize: fileSize,
  onProgress: progress ? function (percent) {
    progress.update(percent)
  } : null
})

job.promise
  .then(function (result) {
    if (progress) progress.done()

    if (format === 'json') {
      process.stdout.write(JSON.stringify(result, null, 2) + '\n')
    } else if (format === 'summary') {
      process.stdout.write(formatSummary(result, process.stdout.isTTY) + '\n')
    } else if (format === 'serve') {
      startServe(result)
    }
  })
  .catch(function (err) {
    if (progress) progress.done()
    process.stderr.write('Error: ' + err.message + '\n')
    process.exit(1)
  })
