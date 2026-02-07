var getVariableType = require('../core/index').getVariableType

var BOLD = '\x1b[1m'
var DIM = '\x1b[2m'
var CYAN = '\x1b[36m'
var GREEN = '\x1b[32m'
var YELLOW = '\x1b[33m'
var RESET = '\x1b[0m'

function pad (str, width) {
  str = String(str)
  while (str.length < width) str += ' '
  return str
}

function padLeft (str, width) {
  str = String(str)
  while (str.length < width) str = ' ' + str
  return str
}

function formatNumber (n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function formatSummary (result, useColor) {
  if (typeof useColor === 'undefined') useColor = true
  var b = useColor ? BOLD : ''
  var d = useColor ? DIM : ''
  var c = useColor ? CYAN : ''
  var g = useColor ? GREEN : ''
  var y = useColor ? YELLOW : ''
  var r = useColor ? RESET : ''

  var lines = []

  // Dataset header
  lines.push('')
  lines.push('  ' + b + result.name + r)
  lines.push('  ' + d + '─'.repeat(Math.max(result.name.length, 30)) + r)

  // Summary stats
  var missingCells = 0
  result.columns.forEach(function (col) {
    if (col.countTypes.missing) missingCells += col.countTypes.missing
  })
  var totalCells = result.n * result.columns.length
  var missingPct = totalCells > 0 ? (100 * missingCells / totalCells).toFixed(1) : '0.0'

  lines.push('  ' + pad('Variables:', 16) + b + result.columns.length + r)
  lines.push('  ' + pad('Observations:', 16) + b + formatNumber(result.n) + r)
  if (result.empty > 0) {
    lines.push('  ' + pad('Empty lines:', 16) + b + result.empty + r)
  }
  lines.push('  ' + pad('Missing cells:', 16) + b + missingCells + r + ' (' + missingPct + '%)')
  lines.push('  ' + pad('Size:', 16) + b + (result.size / 1024).toFixed(2) + r + ' kB')
  lines.push('')

  // Column details
  var nameWidth = 4
  result.columns.forEach(function (col) {
    if (col.name.length > nameWidth) nameWidth = col.name.length
  })
  nameWidth = Math.min(nameWidth + 2, 30)

  result.columns.forEach(function (col) {
    var type = getVariableType(col.countTypes, col.countValues, result.n)
    var typeColor = type === 'Number' ? g : type === 'String' ? c : y
    var line = '  ' + b + pad(col.name, nameWidth) + r
    line += typeColor + pad(type, 14) + r

    if (col.stats) {
      var stats = col.stats
      line += d + 'min: ' + r + padLeft(stats.Min.toFixed(2), 8)
      line += d + '  max: ' + r + padLeft(stats.Max.toFixed(2), 8)
      line += d + '  avg: ' + r + padLeft(stats.Avg.toFixed(2), 8)
      line += d + '  std: ' + r + padLeft(stats.Std.toFixed(2), 8)
    }

    if (col.countValues) {
      var keys = Object.keys(col.countValues)
      line += d + 'unique: ' + r + keys.length + ' (' + (100 * keys.length / result.n).toFixed(2) + '%)'

      if (keys.length <= 20) {
        var sorted = keys.sort(function (a, b) {
          return col.countValues[b] - col.countValues[a]
        })
        line += d + '  top: ' + r + '"' + sorted[0] + '" (' + col.countValues[sorted[0]] + ')'
      }
    }

    if (col.countTypes.missing) {
      var pct = (100 * col.countTypes.missing / result.n).toFixed(2)
      line += d + '  missing: ' + r + col.countTypes.missing + ' (' + pct + '%)'
    }

    lines.push(line)
  })

  // Data head table
  if (result.head && result.head.length > 0) {
    lines.push('')
    lines.push('  ' + d + 'First ' + result.head.length + ' of ' + result.n + ' rows' + r)

    var colNames = result.columns.map(function (col) { return col.name })
    var colWidths = colNames.map(function (name) { return name.length })
    result.head.forEach(function (row) {
      colNames.forEach(function (name, i) {
        var val = String(row[name] != null ? row[name] : '')
        if (val.length > colWidths[i]) colWidths[i] = val.length
      })
    })
    colWidths = colWidths.map(function (w) { return Math.min(w, 20) })

    var top = '  ┌' + colWidths.map(function (w) { return '─'.repeat(w + 2) }).join('┬') + '┐'
    var mid = '  ├' + colWidths.map(function (w) { return '─'.repeat(w + 2) }).join('┼') + '┤'
    var bot = '  └' + colWidths.map(function (w) { return '─'.repeat(w + 2) }).join('┴') + '┘'

    var header = '  │' + colNames.map(function (name, i) {
      return ' ' + b + pad(name.slice(0, colWidths[i]), colWidths[i]) + r + ' '
    }).join('│') + '│'

    lines.push(top)
    lines.push(header)
    lines.push(mid)

    result.head.forEach(function (row) {
      var rowLine = '  │' + colNames.map(function (name, i) {
        var val = String(row[name] != null ? row[name] : '')
        return ' ' + pad(val.slice(0, colWidths[i]), colWidths[i]) + ' '
      }).join('│') + '│'
      lines.push(rowLine)
    })

    lines.push(bot)
  }

  lines.push('')
  return lines.join('\n')
}

module.exports = { formatSummary: formatSummary }
