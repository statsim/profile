var test = require('tape')
var classifyValue = require('../../src/core/classify').classifyValue
var getVariableType = require('../../src/core/classify').getVariableType

test('classifyValue: numbers', function (t) {
  t.equal(classifyValue(42), 'number')
  t.equal(classifyValue(0), 'number')
  t.equal(classifyValue(-3.14), 'number')
  t.equal(classifyValue(Infinity), 'number')
  t.end()
})

test('classifyValue: NaN is missing', function (t) {
  t.equal(classifyValue(NaN), 'missing')
  t.end()
})

test('classifyValue: strings', function (t) {
  t.equal(classifyValue('hello'), 'string')
  t.equal(classifyValue('123'), 'string')
  t.end()
})

test('classifyValue: empty string is missing', function (t) {
  t.equal(classifyValue(''), 'missing')
  t.end()
})

test('classifyValue: missing markers', function (t) {
  var markers = ['NA', 'na', '-', 'NULL', 'NAN', 'NaN', 'nan']
  markers.forEach(function (m) {
    t.equal(classifyValue(m), 'missing', m + ' should be missing')
  })
  t.end()
})

test('classifyValue: other types', function (t) {
  t.equal(classifyValue(null), 'other')
  t.equal(classifyValue(undefined), 'other')
  t.equal(classifyValue(true), 'other')
  t.end()
})

test('getVariableType: Boolean (2 unique values)', function (t) {
  var countTypes = { number: 100 }
  var countValues = { '0': 50, '1': 50 }
  t.equal(getVariableType(countTypes, countValues, 100), 'Boolean')
  t.end()
})

test('getVariableType: Categorical (few unique values)', function (t) {
  var countTypes = { string: 100 }
  var countValues = { 'a': 40, 'b': 30, 'c': 30 }
  t.equal(getVariableType(countTypes, countValues, 100), 'Categorical')
  t.end()
})

test('getVariableType: Number', function (t) {
  var countTypes = { number: 80, missing: 20 }
  t.equal(getVariableType(countTypes, null, 100), 'Number')
  t.end()
})

test('getVariableType: String', function (t) {
  var countTypes = { string: 80, missing: 20 }
  t.equal(getVariableType(countTypes, null, 100), 'String')
  t.end()
})

test('getVariableType: Mixed', function (t) {
  var countTypes = { number: 30, string: 30, missing: 40 }
  t.equal(getVariableType(countTypes, null, 100), 'Mixed')
  t.end()
})
