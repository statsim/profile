var SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
var BAR_WIDTH = 20
var CLEAR = '\x1b[2K\r'

function createProgress (name, fileSize) {
  var frame = 0
  var interval = null
  var lastPercent = -1

  function renderBar (percent) {
    var filled = Math.round(BAR_WIDTH * percent / 100)
    var empty = BAR_WIDTH - filled
    var bar = '\x1b[36m' + SPINNER[frame % SPINNER.length] + '\x1b[0m'
    bar += ' Profiling \x1b[1m' + name + '\x1b[0m  '
    bar += '['
    bar += '\x1b[36m' + '█'.repeat(filled) + '\x1b[0m'
    bar += '░'.repeat(empty)
    bar += '] ' + percent.toFixed(0) + '%'
    process.stderr.write(CLEAR + bar)
  }

  function renderSpinner () {
    var spinner = '\x1b[36m' + SPINNER[frame % SPINNER.length] + '\x1b[0m'
    process.stderr.write(CLEAR + spinner + ' Profiling \x1b[1m' + name + '\x1b[0m...')
  }

  if (!fileSize) {
    interval = setInterval(function () {
      frame++
      renderSpinner()
    }, 80)
    renderSpinner()
  }

  return {
    update: function (percent) {
      frame++
      if (fileSize) {
        var rounded = Math.round(percent)
        if (rounded !== lastPercent) {
          lastPercent = rounded
          renderBar(percent)
        }
      }
    },
    done: function () {
      if (interval) clearInterval(interval)
      process.stderr.write(CLEAR)
    }
  }
}

module.exports = { createProgress: createProgress }
