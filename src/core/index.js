var parseStream = require('csv-parse')
var through2 = require('through2')
var initColumns = require('./columns').initColumns
var updateColumns = require('./columns').updateColumns
var finalizeResult = require('./result').finalizeResult
var HEAD_SIZE = require('./constants').HEAD_SIZE
var getVariableType = require('./classify').getVariableType
var classifyValue = require('./classify').classifyValue

function profileStream (readableStream, opts) {
  opts = opts || {}
  var delimiter = opts.delimiter || ','
  var name = opts.name || ''
  var fileSize = opts.fileSize || 0
  var onProgress = opts.onProgress || null

  var n = 0
  var columns = []
  var head = []
  var progressBytes = 0

  var byteStep = fileSize > 0 ? fileSize / 500 : 200000
  if (byteStep > 200000) byteStep = 200000

  var parser = parseStream({
    delimiter: delimiter,
    cast: true,
    columns: true,
    comment: '#',
    trim: true,
    relax_column_count: true,
    skip_empty_lines: true,
    skip_lines_with_error: true
  })

  var progress = through2(function (chunk, enc, callback) {
    progressBytes += chunk.length
    if (onProgress && fileSize > 0) {
      var percent = ((progressBytes / fileSize) * 100)
      onProgress(percent)
    }
    this.push(chunk)
    callback()
  })

  var stopped = false
  var resolve
  var reject

  var promise = new Promise(function (res, rej) {
    resolve = res
    reject = rej
  })

  function finalize () {
    var result = finalizeResult({
      n: n,
      name: name,
      head: head,
      parserInfo: parser.info || {},
      size: progressBytes,
      columns: columns
    })
    resolve(result)
  }

  readableStream
    .pipe(progress)
    .pipe(parser)
    .on('data', function (obj) {
      if (!n) {
        columns = initColumns(parser.options.columns)
      }
      if (n < HEAD_SIZE) {
        head.push(obj)
      }
      updateColumns(columns, obj, n)
      n += 1
    })
    .on('end', finalize)
    .on('error', function (err) {
      reject(err)
    })

  function stop () {
    if (!stopped) {
      stopped = true
      readableStream.destroy()
      finalize()
    }
  }

  return {
    promise: promise,
    stop: stop
  }
}

module.exports = {
  profileStream: profileStream,
  getVariableType: getVariableType,
  classifyValue: classifyValue
}
