var dnd = require('drag-and-drop-files')
var generateOutput = require('./render/index').generateOutput

var stopButton = document.getElementById('stop')
var drag = document.getElementById('drag')

var jobCounter = 0
var currentJobId = null
var worker = null

function initWorker () {
  if (typeof Worker === 'undefined') return null
  try {
    var w = new Worker('dist/worker-bundle.js')
    return w
  } catch (e) {
    console.warn('Worker init failed, using main thread fallback:', e)
    return null
  }
}

function processWithWorker (file, delimiter) {
  var t0 = performance.now()
  var statsEl = document.getElementById('stats')
  var progressBar = document.getElementById('progress')
  progressBar.style.display = 'initial'
  stopButton.style.display = 'initial'

  jobCounter++
  currentJobId = jobCounter

  if (!worker) {
    worker = initWorker()
  }

  if (!worker) {
    processOnMainThread(file, delimiter)
    return
  }

  var jobId = currentJobId

  worker.onmessage = function (e) {
    var type = e.data.type
    var payload = e.data.payload

    if (payload.jobId !== currentJobId) return

    if (type === 'progress') {
      var formatted = payload.percent.toFixed(1)
      statsEl.innerText = formatted + '%'
      progressBar.style.width = formatted + '%'
    }

    if (type === 'result') {
      var t1 = performance.now()
      console.log('Execution time:', t1 - t0)
      progressBar.style.display = 'none'
      stopButton.style.display = 'none'
      generateOutput(document.getElementById('output'), payload.data)
    }

    if (type === 'error') {
      progressBar.style.display = 'none'
      stopButton.style.display = 'none'
      console.error('Worker error:', payload.message)
    }
  }

  worker.postMessage({
    type: 'start',
    payload: { jobId: jobId, file: file, delimiter: delimiter }
  })

  stopButton.onclick = function () {
    worker.postMessage({
      type: 'stop',
      payload: { jobId: jobId }
    })
  }
}

function processOnMainThread (file, delimiter) {
  var t0 = performance.now()
  var ReadStream = require('filestream').read
  var profileStream = require('./core/index').profileStream

  var statsEl = document.getElementById('stats')
  var progressBar = document.getElementById('progress')

  var stream = new ReadStream(file, { chunkSize: 10240 })
  stream.setEncoding('utf8')

  var job = profileStream(stream, {
    delimiter: delimiter,
    name: file.name,
    fileSize: file.size,
    onProgress: function (percent) {
      var formatted = percent.toFixed(1)
      statsEl.innerText = formatted + '%'
      progressBar.style.width = formatted + '%'
    }
  })

  stopButton.onclick = function () {
    job.stop()
  }

  job.promise.then(function (results) {
    var t1 = performance.now()
    console.log('Execution time:', t1 - t0)
    progressBar.style.display = 'none'
    stopButton.style.display = 'none'
    generateOutput(document.getElementById('output'), results)
  })
}

function process (files) {
  var file = files[0]
  drag.style.display = 'none'

  var ext = file.name.split('.').pop().toLowerCase()
  var delimiter = ext === 'tsv' ? '\t' : ','

  processWithWorker(file, delimiter)
}

function onDragOver () {
  var col = '#C9E4FF'
  if (drag.style.background !== col) drag.style.background = col
}

function onDragLeave () {
  drag.style.background = 'white'
}

drag.addEventListener('dragover', onDragOver, false)
drag.addEventListener('dragleave', onDragLeave, false)
dnd(drag, process)

document.getElementById('input').onchange = function (e) {
  process(e.target.files)
}
