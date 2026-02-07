var ReadStream = require('filestream').read
var profileStream = require('../core/index').profileStream

var currentJob = null

self.onmessage = function (e) {
  var type = e.data.type
  var payload = e.data.payload

  if (type === 'start') {
    var jobId = payload.jobId
    var file = payload.file
    var delimiter = payload.delimiter || ','

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

  if (type === 'stop') {
    if (currentJob && currentJob.jobId === payload.jobId) {
      currentJob.stop()
    }
  }
}
