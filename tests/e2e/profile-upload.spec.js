const fs = require('node:fs')
const { test, expect } = require('@playwright/test')

const numericSeries = {
  start: 1,
  step: 1,
  count: 6
}

const numericValues = Array.from(
  { length: numericSeries.count },
  (_, i) => numericSeries.start + numericSeries.step * i
)

function assertNumericArray (values) {
  expect(Array.isArray(values)).toBeTruthy()
  expect(values.length).toBeGreaterThan(0)
  values.forEach((value) => {
    expect(typeof value).toBe('number')
    expect(Number.isNaN(value)).toBeFalsy()
  })
}

function calculateMean (values) {
  assertNumericArray(values)
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function calculateVariance (values, ddof = 0) {
  assertNumericArray(values)
  expect(values.length).toBeGreaterThan(ddof)

  const mean = calculateMean(values)
  const squaredDiffSum = values.reduce((sum, value) => {
    const diff = value - mean
    return sum + diff * diff
  }, 0)

  return squaredDiffSum / (values.length - ddof)
}

function calculateStd (values, ddof = 0) {
  return Math.sqrt(calculateVariance(values, ddof))
}

function calculateMin (values) {
  assertNumericArray(values)
  return values.reduce((min, value) => (value < min ? value : min), values[0])
}

function calculateMax (values) {
  assertNumericArray(values)
  return values.reduce((max, value) => (value > max ? value : max), values[0])
}

function calculateStats (values) {
  return {
    avg: calculateMean(values),
    variance: calculateVariance(values, 1),
    std: calculateStd(values, 0),
    min: calculateMin(values),
    max: calculateMax(values)
  }
}

function escapeCsvValue (value) {
  if (/[,"\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function writeSyntheticCsv (filePath) {
  const categories = ['A', 'A', 'B', 'B', 'B', 'C']
  const maybeMissing = ['foo', '', 'NA', 'bar', 'baz', '-']

  const rows = [['x_num', 'category', 'maybe_missing']]
  numericValues.forEach((value, index) => {
    rows.push([String(value), categories[index], maybeMissing[index]])
  })

  const csv = rows
    .map(cells => cells.map(escapeCsvValue).join(','))
    .join('\n')

  fs.writeFileSync(filePath, csv, 'utf8')
}

test('non-streaming numeric stats helpers work for any array', () => {
  const values = [2, -4, 7, 10, 5, 1.5]
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const squaredDiffSum = values.reduce((sum, value) => {
    const diff = value - mean
    return sum + diff * diff
  }, 0)

  expect(calculateMean(values)).toBe(mean)
  expect(calculateVariance(values, 1)).toBe(squaredDiffSum / (values.length - 1))
  expect(calculateStd(values, 0)).toBe(Math.sqrt(squaredDiffSum / values.length))
  expect(calculateMin(values)).toBe(-4)
  expect(calculateMax(values)).toBe(10)
})

test('profiles uploaded csv and renders expected output', async ({ page }, testInfo) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && url.port === '4173') {
      route.continue()
      return
    }
    route.abort()
  })

  const csvPath = testInfo.outputPath('synthetic.csv')
  writeSyntheticCsv(csvPath)

  await page.goto('/')
  await page.setInputFiles('#input', csvPath)

  const summarySection = page.locator('#output .summary')
  await expect(summarySection.locator('h2')).toHaveText('synthetic.csv')

  const summary = await summarySection.locator('dl').evaluate((container) => {
    const values = {}
    const entries = Array.from(container.querySelectorAll('dt'))
    entries.forEach((dt) => {
      const key = dt.textContent.replace(/:$/, '').trim()
      const dd = dt.nextElementSibling
      values[key] = dd ? dd.textContent.trim() : ''
    })
    return values
  })
  expect(summary['Number of variables']).toBe('3')
  expect(summary['Number of observations']).toBe(String(numericSeries.count))
  expect(summary['Number of empty lines']).toBe('0')
  expect(summary['Missing cells']).toBe('3 (16.7%)')

  await expect(page.locator('#output .datahead .title')).toHaveText(`First 5 of ${numericSeries.count} rows`)

  const profileByColumn = await page.locator('#output .block').evaluateAll((blocks) => {
    const parseDefinitionList = (container) => {
      const values = {}
      const entries = Array.from(container.querySelectorAll('dt'))
      entries.forEach((dt) => {
        const key = dt.textContent.replace(/:$/, '').trim()
        const dd = dt.nextElementSibling
        values[key] = dd ? dd.textContent.trim() : ''
      })
      return values
    }

    const parsed = {}

    blocks.forEach((block) => {
      const name = block.querySelector('.name-block h4')?.textContent.trim()
      const type = block.querySelector('.variable-type')?.textContent.trim()
      const statsList = block.querySelector('.stat-block dl')
      const stats = statsList ? parseDefinitionList(statsList) : {}
      parsed[name] = { type, stats }
    })

    return parsed
  })

  expect(profileByColumn.x_num.type).toBe('Number')
  expect(profileByColumn.category.type).toBe('String')
  expect(profileByColumn.maybe_missing.type).toBe('Mixed')

  const expectedStats = calculateStats(numericValues)

  expect(profileByColumn.x_num.stats.Avg).toBe(expectedStats.avg.toFixed(2))
  expect(profileByColumn.x_num.stats.Var).toBe(expectedStats.variance.toFixed(2))
  expect(profileByColumn.x_num.stats.Std).toBe(expectedStats.std.toFixed(2))
  expect(profileByColumn.x_num.stats.Min).toBe(String(expectedStats.min.toFixed(2)))
  expect(profileByColumn.x_num.stats.Max).toBe(String(expectedStats.max.toFixed(2)))

  expect(profileByColumn.maybe_missing.stats.Missing).toBe('3 (50.00%)')

  if (process.env.PW_KEEP_OPEN === '1') {
    await page.pause()
  }
})

test('profiles CSV from URL via query param', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && url.port === '4173') {
      route.continue()
      return
    }
    route.abort()
  })

  const csvUrl = 'http://127.0.0.1:4173/tests/support/fixtures/test-data.csv'
  await page.goto('/?file=' + encodeURIComponent(csvUrl))

  const summarySection = page.locator('#output .summary')
  await expect(summarySection.locator('h2')).toHaveText('test-data.csv', { timeout: 10000 })

  const summary = await summarySection.locator('dl').evaluate((container) => {
    const values = {}
    Array.from(container.querySelectorAll('dt')).forEach((dt) => {
      const key = dt.textContent.replace(/:$/, '').trim()
      const dd = dt.nextElementSibling
      values[key] = dd ? dd.textContent.trim() : ''
    })
    return values
  })
  expect(summary['Number of variables']).toBe('3')
  expect(summary['Number of observations']).toBe('5')
})

test('profiles CSV from URL input field', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && url.port === '4173') {
      route.continue()
      return
    }
    route.abort()
  })

  await page.goto('/')
  const csvUrl = 'http://127.0.0.1:4173/tests/support/fixtures/test-data.csv'
  await page.fill('#url-input', csvUrl)
  await page.click('#url-load')

  const summarySection = page.locator('#output .summary')
  await expect(summarySection.locator('h2')).toHaveText('test-data.csv', { timeout: 10000 })
})

test('shows error for blocked URL', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && url.port === '4173') {
      route.continue()
      return
    }
    route.abort()
  })

  const blockedUrl = 'http://127.0.0.1:4173/blocked'
  await page.goto('/?file=' + encodeURIComponent(blockedUrl))

  const errorText = page.locator('#output p')
  await expect(errorText).toContainText('HTTP 403', { timeout: 10000 })
})

test('shows error for invalid URL protocol', async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.hostname === '127.0.0.1' && url.port === '4173') {
      route.continue()
      return
    }
    route.abort()
  })

  await page.goto('/')
  await page.fill('#url-input', 'ftp://example.com/data.csv')
  await page.click('#url-load')

  const errorText = page.locator('#output p')
  await expect(errorText).toContainText('Only http and https', { timeout: 5000 })
})
