const parseStream = require('csv-parse')
const ReadStream = require('filestream').read
const Stats = require('online-stats')
const chart = require('tui-chart')
const through2 = require('through2')
const dnd = require('drag-and-drop-files')

const chartTheme = {
  chart: {
    fontFamily: 'Roboto',
    background: {
      color: 'red',
      opacity: 0
    }
  },
  title: {
    fontSize: 20,
    fontFamily: 'Roboto',
    fontWeight: '300'
  }
}

chart.registerTheme('chartTheme', chartTheme)

function createDatasetSummary (results) {
  const container = document.createElement('div')
  container.className = 'section summary'

  const title = document.createElement('h2')
  title.innerText = results.name
  container.appendChild(title)

  let missingCells = 0
  results.columns.forEach(column => {
    missingCells += column.countTypes['missing'] ? column.countTypes['missing'] : 0
  })

  const list = document.createElement('dl')
  let summary = {
    'Number of variables': results.columns.length,
    'Number of observations': results.n,
    'Number of empty lines': results.empty,
    'Total size in memory': (results.size / 1024).toFixed(2) + ' kB',
    'Average record size': (results.record_size / 1024).toFixed(2) + ' kB',
    'Missing cells': `${missingCells} (${(100 * missingCells / (results.n * results.columns.length)).toFixed(1)}%)`
  }

  Object.keys(summary).forEach(key => {
    const dt = document.createElement('dt')
    dt.innerText = key + ':'
    list.appendChild(dt)
    const dd = document.createElement('dd')
    dd.innerText = summary[key]
    list.appendChild(dd)
  })

  container.appendChild(list)
  return container
}

function createTypeSummary (results) {
  const container = document.createElement('div')
  container.className = 'section'
  const data = {
    categories: results.columns.map(c => c.name),
    series: ['number', 'string', 'missing', 'other'].map(type => ({
      'name': type,
      'data': results.columns.map(c => c.countTypes[type] || 0)
    }))
  }
  const options = {
    chart: {
      width: 980,
      height: 600,
      title: 'Variable types',
      format: '1,000'
    },
    yAxis: {
      title: '% of samples'
    },
    legend: {
      align: 'right'
    },
    series: {
      stackType: 'percent',
      barWidth: 60
    },
    tooltip: {
      grouped: true
    }
  }
  chart.columnChart(container, data, options)
  return container
}

function createHistogram (hist) {
  const histContainer = document.createElement('div')
  histContainer.className = 'hist-chart'

  const [h, b] = hist.value
  // const bins = h.map((_, i) => b[i].toFixed(1) + '-' + b[i + 1].toFixed(1))

  const data = {
    categories: b.slice(0, -1).map(bin => bin.toFixed(1)),
    series: [{
      name: 'Values',
      data: h
    }]
  }

  const options = {
    chart: {
      width: 300,
      height: 220,
      title: 'Distribution'
    },
    theme: 'chartTheme',
    yAxis: [
      {
        title: 'Frequency',
        chartType: 'column',
        labelMargin: 5
      }
    ],
    xAxis: {
      title: 'Values'
    },
    series: {
      showDot: false,
      spline: true,
      showLabel: false,
      pointWidth: 3
    },
    legend: {
      visible: false
    },
    chartExportMenu: {
      visible: false
    },
    usageStatistics: false
  }

  chart.lineChart(histContainer, data, options)

  return histContainer
}

function getVariableType (countTypes, countValues, n) {
  if (countValues) {
    const k = Object.keys(countValues).length
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

function createVariablesSummary (results) {
  const container = document.createElement('div')
  container.className = 'section'

  /*
  const title = document.createElement('h2')
  title.innerText = 'Variables'
  container.appendChild(title)
  */

  results.columns.forEach(column => {
    console.log('Create summary for column:', column.name)
    const block = document.createElement('div')
    block.className = 'block'

    const nameBlock = document.createElement('div')
    nameBlock.className = 'name-block'
    const name = document.createElement('h4')
    name.innerText = column.name
    nameBlock.appendChild(name)
    const type = document.createElement('p')
    type.className = 'variable-type'
    type.innerText = getVariableType(column.countTypes, column.countValues, results.n)
    nameBlock.appendChild(type)
    block.appendChild(nameBlock)

    const statBlock = document.createElement('div')
    statBlock.className = 'stat-block'
    const statTitle = document.createElement('h4')
    statTitle.innerText = 'Statistics'
    statBlock.appendChild(statTitle)
    const statList = document.createElement('dl')
    statBlock.appendChild(statList)
    block.appendChild(statBlock)

    const appendToList = (t, d) => {
      const dt = document.createElement('dt')
      dt.innerText = t + ':'
      statList.appendChild(dt)
      const dd = document.createElement('dd')
      dd.innerText = d
      statList.appendChild(dd)
    }

    // Show stats if exist
    if (column.stats) {
      Object.keys(column.stats)
        .filter(stat => (stat !== 'n'))
        .forEach(stat => {
          appendToList(stat, (column.stats[stat]).toFixed(2))
        })

      // If number of unique numerical values >20, show histogram/distribution
      if ((column.countValues === null) || (Object.keys(column.countValues).length > 20)) {
        let hist = createHistogram(column.hist)
        block.appendChild(hist)
      }
    }

    // Column has counter
    if (column.countValues) {
      const topNumber = 5
      const sorted = Object.keys(column.countValues).sort((a, b) => column.countValues[b] - column.countValues[a])
      console.log('Counted values:', column.countValues, sorted)

      let topValues = sorted.slice(0, topNumber)
      let dataCounter = topValues.map(v => column.countValues[v])

      appendToList('Distinct', `${sorted.length} (${(100 * sorted.length / results.n).toFixed(2)}%)`)

      if (topNumber < sorted.length) {
        let other = sorted.slice(5).reduce((a, v) => a + column.countValues[v], 0)
        topValues = topValues.concat('Other')
        dataCounter = dataCounter.concat(other)
      }

      const chartContainer = document.createElement('div')
      chartContainer.className = 'count-chart'

      const data = {
        categories: topValues,
        series: [
          {
            name: 'Count',
            data: dataCounter
          }
        ]
      }
      let options = {
        chart: {
          width: 300,
          height: 220,
          title: `Top ${topNumber < sorted.length ? topNumber : sorted.length} of ${sorted.length} values`,
          format: '1,000'
        },
        theme: 'chartTheme',
        yAxis: {
          title: 'Values'
        },
        xAxis: {
          title: 'Count',
          min: 0
        },
        series: {
          showLabel: false
        },
        legend: {
          visible: false
        },
        chartExportMenu: {
          visible: false
        },
        usageStatistics: false
      }
      chart.barChart(chartContainer, data, options)
      block.appendChild(chartContainer)
    }

    // Missing values
    if (column.countTypes['missing']) {
      appendToList('Missing', `${column.countTypes['missing']} (${(100 * column.countTypes['missing'] / results.n).toFixed(2)}%)`)
    }

    container.appendChild(block)
  })

  return container
}

function generateOutput (el, results) {
  // Clean output block
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }

  // Append results
  el.appendChild(createDatasetSummary(results))
  el.appendChild(createTypeSummary(results))
  el.appendChild(createVariablesSummary(results))
}

const stopButton = document.getElementById('stop')
const drag = document.getElementById('drag')

function process (files) {
  const file = files[0]
  const size = file.size

  // Clear body background (dnd)
  drag.style.display = 'none'

  // Initialize read stream
  const stream = new ReadStream(file, {chunkSize: 10240})
  const stats = document.getElementById('stats')
  stream.setEncoding('utf8')

  // Initialize CSV transform stream for parsing
  const parser = parseStream({
    'delimiter': ',',
    'cast': true,
    'columns': true,
    'comment': '#',
    'trim': true,
    'relax_column_count': true,
    'skip_empty_lines': true,
    'skip_lines_with_error': true
  })

  // Initialize progress bar
  let progressBytes = 0
  let progressPercents = 0
  let progressBar = document.getElementById('progress')
  progressBar.style.display = 'initial'

  let byteStep = size / 500
  byteStep = (byteStep < 200000) ? byteStep : 200000

  // Initialize through stream for stream monitoring
  const progress = through2(function (chunk, enc, callback) {
    progressBytes += chunk.length
    let prevBytes = 0
    if ((progressBytes - prevBytes) > byteStep) {
      progressPercents = ((progressBytes / size) * 100).toFixed(1)
      stats.innerText = progressPercents + '%'
      progressBar.style.width = progressPercents + '%'
      prevBytes = progressBytes
    }
    this.push(chunk)
    callback()
  })

  // Key variables
  let n = 0 // Total number of samples (rows)
  let columns = [] // Columns and their stats

  // Run when stream is ended or stopped..
  const finalize = () => {
    const results = {
      'n': n,
      'name': file.name,
      'comments': parser.info.comment_lines,
      'empty': parser.info.empty_lines,
      'invalid_length': parser.info.invalid_field_length,
      'size': progressBytes,
      'record_size': progressBytes / n,
      'columns': columns.map(c => ({
        'name': c.name,
        'stats': c.stats ? c.stats.values : null,
        'hist': c.hist ? c.hist : null,
        'countValues': c.countValues ? c.countValues.values : null,
        'countTypes': c.countTypes ? c.countTypes.values : null
      }))
    }
    progressBar.style.display = 'none'
    stopButton.style.display = 'none'
    generateOutput(document.getElementById('output'), results)
    console.log(parser, results)
  }

  // Initialize stop button
  stopButton.style.display = 'initial'
  stopButton.onclick = () => {
    stream.destroy()
    finalize()
  }

  // Read the stream
  stream
    .pipe(progress)
    .pipe(parser)
    .on('data', (obj) => {
      // console.log(obj)

      // Run that only on start (n == 0)
      if (!n) {
        parser.options.columns.forEach(c => {
          let column = Object.assign({}, c)
          /*
          let val = obj[column.name]
          if (typeof val === 'number') {
            column.type = 'number'
          } else {
            column.type = 'categorical'
          }
          */
          column.stats = Stats.Series([
            { stat: Stats.Mean(), name: 'Average' },
            { stat: Stats.Variance({ddof: 1}), name: 'Variance' },
            { stat: Stats.Std(), name: 'Stdev' },
            { stat: Stats.Min(), name: 'Min' },
            { stat: Stats.Max(), name: 'Max' }
          ])

          column.hist = Stats.Histogram(20, true)
          column.countValues = Stats.Count()
          column.countTypes = Stats.Count()

          columns.push(column)
        })
      }

      // Iterate over all variables
      columns.forEach(column => {
        let val = obj[column.name]

        // Determine type of value
        let type = typeof val
        let realType
        if (type === 'number') {
          if (isNaN(val)) {
            realType = 'missing'
          } else {
            realType = type
          }
        } else if (type === 'string') {
          if (!val.length || ['NA', 'na', '-', 'NULL', 'NAN', 'NaN', 'nan'].includes(val)) {
            realType = 'missing'
          } else {
            realType = type
          }
        } else {
          realType = 'other'
        }
        column.countTypes(realType)

        if (n % 100 === 0) {
          // Check number of values in counter
          if (column.countValues && (Object.keys(column.countValues.values).length > 10000)) {
            console.log('Stop counting (too many unique values): ', column.name)
            delete column.countValues
          }
          // Check if too much non-numbers
          if (column.stats) {
            let numcount = column.countTypes.values['number']
            if (!numcount || (numcount / n < 0.7)) {
              console.log('Stop calculating stats (not numerical variable): ', column.name)
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

      // Increment samples counter
      n += 1
    })
    .on('end', finalize)
}

// Get files from drag and drop

function onDragOver () {
  const col = '#C9E4FF'
  if (drag.style.background !== col) drag.style.background = col
}

function onDragLeave () {
  drag.style.background = 'white'
}

drag.addEventListener('dragover', onDragOver, false)
drag.addEventListener('dragleave', onDragLeave, false)
dnd(drag, process)

// Get files from file input
document.getElementById('input').onchange = (e) => {
  process(e.target.files)
}
