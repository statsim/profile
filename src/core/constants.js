// ProfileResult schema version
var RESULT_VERSION = 1

// Values treated as missing data
var MISSING_MARKERS = ['NA', 'na', '-', 'NULL', 'NAN', 'NaN', 'nan']

// Stop counting unique values above this threshold
var MAX_UNIQUE_VALUES = 10000

// Drop numeric stats if fewer than this ratio are numbers
var MIN_NUMERIC_RATIO = 0.7

// How often (in rows) to run heuristic checks
var HEURISTIC_CHECK_INTERVAL = 100

// Number of head rows to retain
var HEAD_SIZE = 5

// Stats conventions:
// - Variance uses ddof=1 (sample variance, Bessel's correction)
// - Std uses ddof=0 (population std) — this is the existing behavior
//   because online-series passes values by custom name ('Var') which
//   doesn't match online-std's lookup key ('variance'), so Std falls
//   back to its own internal variance with default ddof=0
var VARIANCE_DDOF = 1

module.exports = {
  RESULT_VERSION: RESULT_VERSION,
  MISSING_MARKERS: MISSING_MARKERS,
  MAX_UNIQUE_VALUES: MAX_UNIQUE_VALUES,
  MIN_NUMERIC_RATIO: MIN_NUMERIC_RATIO,
  HEURISTIC_CHECK_INTERVAL: HEURISTIC_CHECK_INTERVAL,
  HEAD_SIZE: HEAD_SIZE,
  VARIANCE_DDOF: VARIANCE_DDOF
}
