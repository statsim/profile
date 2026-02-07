var ReadStream = require('filestream').read
var through2 = require('through2')
var profileStream = require('../core/index').profileStream

var currentJob = null

function startFileJob (jobId, file, delimiter) {
  var stream = new ReadStream(file, { chunkSize: 10240 })
  stream.setEncoding('utf8')

  var job = profileStream(stream, {
    delimiter: delimiter,
    name: file.name,
    fileSize: file.size,
    onProgress: function (percent) {
      self.postMessage({
        type: 'progress',
        payload: { jobId: jobId, percent: percent }
      })
    }
  })

  currentJob = { jobId: jobId, stop: job.stop }

  job.promise
    .then(function (result) {
      self.postMessage({
        type: 'result',
        payload: { jobId: jobId, data: result }
      })
      currentJob = null
    })
    .catch(function (err) {
      self.postMessage({
        type: 'error',
        payload: { jobId: jobId, message: err.message }
      })
      currentJob = null
    })
}

function startUrlJob (jobId, url, delimiter) {
  fetch(url)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText)
      }

      var contentLength = response.headers.get('content-length')
      var fileSize = contentLength ? parseInt(contentLength, 10) : 0

      var pathname = new URL(url).pathname
      var name = pathname.split('/').pop() || 'remote.csv'

      var passthrough = through2()
      var reader = response.body.getReader()
      var decoder = new TextDecoder('utf-8', { stream: true })

      var job = profileStream(passthrough, {
        delimiter: delimiter,
        name: name,
        fileSize: fileSize,
        onProgress: fileSize > 0 ? function (percent) {
          self.postMessage({
            type: 'progress',
            payload: { jobId: jobId, percent: percent }
          })
        } : null
      })

      currentJob = { jobId: jobId, stop: job.stop }

      // Send indeterminate progress if no content-length
      if (!fileSize) {
        self.postMessage({
          type: 'progress',
          payload: { jobId: jobId, percent: null }
        })
      }

      function pump () {
        reader.read().then(function (result) {
          if (result.done) {
            var final = decoder.decode()
            if (final) passthrough.write(final)
            passthrough.end()
            return
          }
          var text = decoder.decode(result.value, { stream: true })
          passthrough.write(text)
          pump()
        }).catch(function (err) {
          passthrough.destroy(err)
        })
      }
      pump()

      job.promise
        .then(function (result) {
          self.postMessage({
            type: 'result',
            payload: { jobId: jobId, data: result }
          })
          currentJob = null
        })
        .catch(function (err) {
          self.postMessage({
            type: 'error',
            payload: { jobId: jobId, message: err.message }
          })
          currentJob = null
        })
    })
    .catch(function (err) {
      var message = err.message
      if (message.indexOf('Failed to fetch') >= 0) {
        message = 'Failed to fetch URL. The server may not allow cross-origin requests (CORS).'
      }
      self.postMessage({
        type: 'error',
        payload: { jobId: jobId, message: message }
      })
    })
}

self.onmessage = function (e) {
  var type = e.data.type
  var payload = e.data.payload

  if (type === 'start') {
    startFileJob(payload.jobId, payload.file, payload.delimiter || ',')
  }

  if (type === 'start-url') {
    startUrlJob(payload.jobId, payload.url, payload.delimiter || ',')
  }

  if (type === 'stop') {
    if (currentJob && currentJob.jobId === payload.jobId) {
      currentJob.stop()
    }
  }
}
