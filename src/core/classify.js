var MISSING_MARKERS = require('./constants').MISSING_MARKERS

function classifyValue (val) {
  var type = typeof val
  if (type === 'number') {
    return isNaN(val) ? 'missing' : 'number'
  }
  if (type === 'string') {
    if (!val.length || MISSING_MARKERS.includes(val)) {
      return 'missing'
    }
    return 'string'
  }
  return 'other'
}

function getVariableType (countTypes, countValues, n) {
  if (countValues) {
    var k = Object.keys(countValues).length
    if (k === 2) {
      return 'Boolean'
    } else if (k < n / 2) {
      return 'Categorical'
    }
  }
  if (countTypes['number'] && (countTypes['number'] > n / 2)) {
    return 'Number'
  } else if (countTypes['string'] && (countTypes['string'] > n / 2)) {
    return 'String'
  } else {
    return 'Mixed'
  }
}

module.exports = {
  classifyValue: classifyValue,
  getVariableType: getVariableType
}
