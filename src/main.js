const parseStream = require('csv-parse')
const ReadStream = require('filestream').read
const Stats = require('online-stats')
const chart = require('tui-chart')
const through2 = require('through2')

function createDatasetSummary (results) {
  const container = document.createElement('div')
  container.className = 'section'

  const title = document.createElement('h2')
  title.innerText = 'Overview'
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
      title: 'Samples'
    },
    xAxis: {
      title: 'Variables'
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

function createVariablesSummary (results) {
  const container = document.createElement('div')
  container.className = 'section'

  const title = document.createElement('h2')
  title.innerText = 'Variables'
  container.appendChild(title)

  results.columns.forEach(column => {
    const block = document.createElement('div')
    block.className = 'block'

    const blockName = document.createElement('h4')
    blockName.innerText = column.name
    block.appendChild(blockName)

    // Show stats if exist
    if (column.stats) {
      const statList = document.createElement('dl')
      Object.keys(column.stats).forEach(stat => {
        const dt = document.createElement('dt')
        dt.innerText = stat + ':'
        statList.appendChild(dt)
        const dd = document.createElement('dd')
        dd.innerText = (column.stats[stat]).toFixed(2)
        statList.appendChild(dd)
      })
      block.appendChild(statList)
    }

    if (column.countValues) {
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

document.getElementById('input').onchange = (e) => {
  // Get file from input
  const file = e.target.files[0]
  const size = file.size

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
      'comments': parser.info.comment_lines,
      'empty': parser.info.empty_lines,
      'invalid_length': parser.info.invalid_field_length,
      'size': progressBytes,
      'record_size': progressBytes / n,
      'columns': columns.map(c => ({
        'name': c.name,
        'stats': c.stats ? c.stats.values : null,
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
          column.stats = Stats.Series(
            Stats.Min(),
            Stats.Max(),
            Stats.Mean(),
            Stats.Std()
          )
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
          realType = type
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
          // Check if too much
          if (column.stats) {
            let numcount = column.countTypes.values['number']
            if (!numcount || (numcount / n < 0.7)) {
              console.log('Stop calculating stats (not numerical variable): ', column.name)
              delete column.stats
            }
          }
        }

        if (column.stats && (typeof val === 'number')) {
          column.stats(val)
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
