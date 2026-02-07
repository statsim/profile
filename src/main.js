var dnd = require('drag-and-drop-files')
var generateOutput = require('./render/index').generateOutput

var stopButton = document.getElementById('stop')
var drag = document.getElementById('drag')
var urlError = document.getElementById('url-error')

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

function showError (message) {
  var output = document.getElementById('output')
  while (output.firstChild) output.removeChild(output.firstChild)
  var el = document.createElement('p')
  el.style.color = '#e53935'
  el.style.padding = '20px'
  el.innerText = message
  output.appendChild(el)
}

function setupWorkerHandler (t0) {
  var statsEl = document.getElementById('stats')
  var progressBar = document.getElementById('progress')

  worker.onmessage = function (e) {
    var type = e.data.type
    var payload = e.data.payload

    if (payload.jobId !== currentJobId) return

    if (type === 'progress') {
      if (payload.percent === null) {
        statsEl.innerText = 'Processing...'
        progressBar.style.width = '100%'
        progressBar.classList.add('indeterminate')
      } else {
        progressBar.classList.remove('indeterminate')
        var formatted = payload.percent.toFixed(1)
        statsEl.innerText = formatted + '%'
        progressBar.style.width = formatted + '%'
      }
    }

    if (type === 'result') {
      var t1 = performance.now()
      console.log('Execution time:', t1 - t0)
      progressBar.style.display = 'none'
      progressBar.classList.remove('indeterminate')
      stopButton.style.display = 'none'
      generateOutput(document.getElementById('output'), payload.data)
    }

    if (type === 'error') {
      progressBar.style.display = 'none'
      progressBar.classList.remove('indeterminate')
      stopButton.style.display = 'none'
      showError(payload.message)
    }
  }
}

function startJob () {
  var progressBar = document.getElementById('progress')
  progressBar.style.display = 'initial'
  stopButton.style.display = 'initial'
  jobCounter++
  currentJobId = jobCounter
  if (!worker) worker = initWorker()
  return currentJobId
}

function processWithWorker (file, delimiter) {
  var t0 = performance.now()
  var jobId = startJob()

  if (!worker) {
    processOnMainThread(file, delimiter)
    return
  }

  setupWorkerHandler(t0)

  worker.postMessage({
    type: 'start',
    payload: { jobId: jobId, file: file, delimiter: delimiter }
  })

  stopButton.onclick = function () {
    worker.postMessage({ type: 'stop', payload: { jobId: jobId } })
  }
}

function processUrl (url, delimiter) {
  // Validate URL
  var parsed
  try {
    parsed = new URL(url)
  } catch (e) {
    showError('Invalid URL: ' + url)
    return
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    showError('Only http and https URLs are supported.')
    return
  }

  // Auto-detect delimiter from extension if not provided
  if (!delimiter) {
    var ext = parsed.pathname.split('.').pop().toLowerCase()
    delimiter = ext === 'tsv' ? '\t' : ','
  }

  drag.style.display = 'none'
  if (urlError) urlError.style.display = 'none'

  var t0 = performance.now()
  var jobId = startJob()

  if (!worker) {
    showError('Web Workers are required for URL loading.')
    return
  }

  setupWorkerHandler(t0)

  worker.postMessage({
    type: 'start-url',
    payload: { jobId: jobId, url: url, delimiter: delimiter }
  })

  stopButton.onclick = function () {
    worker.postMessage({ type: 'stop', payload: { jobId: jobId } })
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

// Parse delimiter param
function parseDelimiterParam (val) {
  if (!val) return null
  if (val === 'tab' || val === '\t') return '\t'
  if (val === 'comma' || val === ',') return ','
  return null
}

// Drag and drop
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

// File input
document.getElementById('input').onchange = function (e) {
  process(e.target.files)
}

// URL input
var urlInput = document.getElementById('url-input')
var urlLoadBtn = document.getElementById('url-load')

if (urlLoadBtn && urlInput) {
  urlLoadBtn.onclick = function () {
    var val = urlInput.value.trim()
    if (!val) return
    processUrl(val)
  }
  urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var val = urlInput.value.trim()
      if (!val) return
      processUrl(val)
    }
  })
}

// Auto-load from query param
var params = new URLSearchParams(window.location.search)
var fileParam = params.get('file')
if (fileParam) {
  var delimParam = parseDelimiterParam(params.get('delimiter'))
  processUrl(fileParam, delimParam)
}
