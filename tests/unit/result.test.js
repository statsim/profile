var test = require('tape')
var initColumns = require('../../src/core/columns').initColumns
var updateColumns = require('../../src/core/columns').updateColumns
var finalizeResult = require('../../src/core/result').finalizeResult

test('finalizeResult produces versioned ProfileResult', function (t) {
  var cols = initColumns([{ name: 'x' }])
  for (var i = 0; i < 5; i++) {
    updateColumns(cols, { x: i + 1 }, i)
  }

  var result = finalizeResult({
    n: 5,
    name: 'test.csv',
    head: [{ x: 1 }, { x: 2 }],
    parserInfo: { comment_lines: 0, empty_lines: 1, invalid_field_length: 0 },
    size: 100,
    columns: cols
  })

  t.equal(result.version, 1, 'has version')
  t.equal(result.n, 5, 'row count')
  t.equal(result.name, 'test.csv', 'filename')
  t.equal(result.head.length, 2, 'head rows')
  t.equal(result.empty, 1, 'empty lines')
  t.equal(result.size, 100, 'size')
  t.equal(result.record_size, 20, 'record_size = size/n')

  t.equal(result.columns.length, 1)
  var col = result.columns[0]
  t.equal(col.name, 'x')
  t.ok(col.stats, 'has stats')
  t.equal(col.stats.Avg, 3, 'mean is 3')
  t.ok(col.countTypes, 'has countTypes')
  t.equal(col.countTypes.number, 5)
  t.ok(col.countValues, 'has countValues')
  t.ok(Array.isArray(col.hist), 'hist is plain array')
  t.equal(col.hist.length, 2, 'hist has [counts, boundaries]')
  t.end()
})

test('finalizeResult handles missing parserInfo', function (t) {
  var cols = initColumns([{ name: 'a' }])
  updateColumns(cols, { a: 1 }, 0)

  var result = finalizeResult({
    n: 1,
    name: 'f.csv',
    head: [{ a: 1 }],
    parserInfo: {},
    size: 10,
    columns: cols
  })

  t.equal(result.comments, 0)
  t.equal(result.empty, 0)
  t.equal(result.invalid_length, 0)
  t.end()
})

test('finalizeResult handles zero rows', function (t) {
  var result = finalizeResult({
    n: 0,
    name: 'empty.csv',
    head: [],
    parserInfo: {},
    size: 0,
    columns: []
  })

  t.equal(result.n, 0)
  t.equal(result.record_size, 0)
  t.equal(result.columns.length, 0)
  t.end()
})
