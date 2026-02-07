var Stats = require('online-stats')
var classifyValue = require('./classify').classifyValue
var constants = require('./constants')

function initColumns (parserColumns) {
  var columns = []
  parserColumns.forEach(function (c) {
    var column = Object.assign({}, c)
    column.stats = Stats.Series([
      { stat: Stats.Mean(), name: 'Avg' },
      { stat: Stats.Variance({ddof: constants.VARIANCE_DDOF}), name: 'Var' },
      { stat: Stats.Std(), name: 'Std' },
      { stat: Stats.Min(), name: 'Min' },
      { stat: Stats.Max(), name: 'Max' }
    ])
    column.hist = Stats.Histogram(20, true)
    column.countValues = Stats.Count()
    column.countTypes = Stats.Count()
    columns.push(column)
  })
  return columns
}

function updateColumns (columns, row, n) {
  columns.forEach(function (column) {
    var val = row[column.name]
    var realType = classifyValue(val)
    column.countTypes(realType)

    if (n % constants.HEURISTIC_CHECK_INTERVAL === 0) {
      if (column.countValues && (Object.keys(column.countValues.values).length > constants.MAX_UNIQUE_VALUES)) {
        delete column.countValues
      }
      if (column.stats) {
        var numcount = column.countTypes.values['number']
        if (!numcount || (numcount / n < constants.MIN_NUMERIC_RATIO)) {
          delete column.stats
          delete column.hist
        }
      }
    }

    if (column.stats && (typeof val === 'number') && !isNaN(val)) {
      column.stats(val)
      column.hist(val)
    }

    if (column.countValues) {
      column.countValues(val)
    }
  })
}

module.exports = {
  initColumns: initColumns,
  updateColumns: updateColumns
}
