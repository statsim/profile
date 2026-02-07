var RESULT_VERSION = require('./constants').RESULT_VERSION

function finalizeResult (opts) {
  var n = opts.n
  var name = opts.name
  var head = opts.head
  var parserInfo = opts.parserInfo
  var size = opts.size
  var columns = opts.columns

  return {
    version: RESULT_VERSION,
    n: n,
    name: name,
    head: head,
    comments: parserInfo.comment_lines || 0,
    empty: parserInfo.empty_lines || 0,
    invalid_length: parserInfo.invalid_field_length || 0,
    size: size,
    record_size: n > 0 ? size / n : 0,
    columns: columns.map(function (c) {
      return {
        name: c.name,
        stats: c.stats ? c.stats.values : null,
        hist: c.hist ? c.hist.value : null,
        countValues: c.countValues ? c.countValues.values : null,
        countTypes: c.countTypes ? c.countTypes.values : null
      }
    })
  }
}

module.exports = {
  finalizeResult: finalizeResult
}
