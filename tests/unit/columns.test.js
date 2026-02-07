var test = require('tape')
var initColumns = require('../../src/core/columns').initColumns
var updateColumns = require('../../src/core/columns').updateColumns

test('initColumns creates stats objects for each column', function (t) {
  var cols = initColumns([{ name: 'a' }, { name: 'b' }])
  t.equal(cols.length, 2)
  t.equal(cols[0].name, 'a')
  t.equal(cols[1].name, 'b')
  cols.forEach(function (c) {
    t.ok(c.stats, 'has stats')
    t.ok(c.hist, 'has hist')
    t.ok(c.countValues, 'has countValues')
    t.ok(c.countTypes, 'has countTypes')
  })
  t.end()
})

test('updateColumns accumulates numeric stats', function (t) {
  var cols = initColumns([{ name: 'x' }])
  var values = [1, 2, 3, 4, 5]
  values.forEach(function (v, i) {
    updateColumns(cols, { x: v }, i)
  })
  var stats = cols[0].stats.values
  t.equal(stats.Avg, 3, 'mean is 3')
  t.equal(stats.Min, 1, 'min is 1')
  t.equal(stats.Max, 5, 'max is 5')
  t.ok(stats.Var > 0, 'variance is positive')
  t.ok(stats.Std > 0, 'std is positive')
  t.end()
})

test('updateColumns counts types', function (t) {
  var cols = initColumns([{ name: 'x' }])
  updateColumns(cols, { x: 1 }, 0)
  updateColumns(cols, { x: 'hello' }, 1)
  updateColumns(cols, { x: '' }, 2)
  var types = cols[0].countTypes.values
  t.equal(types.number, 1)
  t.equal(types.string, 1)
  t.equal(types.missing, 1)
  t.end()
})

test('updateColumns drops stats for non-numeric columns', function (t) {
  var cols = initColumns([{ name: 'x' }])
  // Feed 100 string values to trigger heuristic at row 100
  for (var i = 0; i < 101; i++) {
    updateColumns(cols, { x: 'text' + i }, i)
  }
  t.equal(cols[0].stats, undefined, 'stats dropped')
  t.equal(cols[0].hist, undefined, 'hist dropped')
  t.end()
})

test('updateColumns counts unique values', function (t) {
  var cols = initColumns([{ name: 'x' }])
  updateColumns(cols, { x: 'a' }, 0)
  updateColumns(cols, { x: 'b' }, 1)
  updateColumns(cols, { x: 'a' }, 2)
  var cv = cols[0].countValues.values
  t.equal(cv.a, 2)
  t.equal(cv.b, 1)
  t.end()
})
