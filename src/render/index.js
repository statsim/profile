var chart = require('tui-chart')
var getVariableType = require('../core/index').getVariableType

var chartTheme = {
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
  var container = document.createElement('div')
  container.className = 'section summary'

  var title = document.createElement('h2')
  title.innerText = results.name
  container.appendChild(title)

  var missingCells = 0
  results.columns.forEach(function (column) {
    missingCells += column.countTypes['missing'] ? column.countTypes['missing'] : 0
  })

  var list = document.createElement('dl')
  var summary = {
    'Number of variables': results.columns.length,
    'Number of observations': results.n,
    'Number of empty lines': results.empty,
    'Total size in memory': (results.size / 1024).toFixed(2) + ' kB',
    'Average record size': (results.record_size / 1024).toFixed(2) + ' kB',
    'Missing cells': missingCells + ' (' + (100 * missingCells / (results.n * results.columns.length)).toFixed(1) + '%)'
  }

  Object.keys(summary).forEach(function (key) {
    var dt = document.createElement('dt')
    dt.innerText = key + ':'
    list.appendChild(dt)
    var dd = document.createElement('dd')
    dd.innerText = summary[key]
    list.appendChild(dd)
  })

  container.appendChild(list)
  return container
}

function createTypeSummary (results) {
  var container = document.createElement('div')
  container.className = 'section'
  var data = {
    categories: results.columns.map(function (c) { return c.name }),
    series: ['number', 'string', 'missing', 'other'].map(function (type) {
      return {
        name: type,
        data: results.columns.map(function (c) { return c.countTypes[type] || 0 })
      }
    })
  }
  var options = {
    chart: {
      width: 980,
      height: 400,
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
  var histContainer = document.createElement('div')
  histContainer.className = 'hist-chart'

  var h = hist[0]
  var b = hist[1]

  var data = {
    categories: b.slice(0, -1).map(function (bin) { return bin.toFixed(1) }),
    series: [{
      name: 'Values',
      data: h
    }]
  }

  var options = {
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

function createVariablesSummary (results) {
  var container = document.createElement('div')
  container.className = 'section'

  results.columns.forEach(function (column) {
    var block = document.createElement('div')
    block.className = 'block'

    var nameBlock = document.createElement('div')
    nameBlock.className = 'name-block'
    var name = document.createElement('h4')
    name.innerText = column.name
    nameBlock.appendChild(name)
    var type = document.createElement('p')
    type.className = 'variable-type'
    type.innerText = getVariableType(column.countTypes, column.countValues, results.n)
    nameBlock.appendChild(type)
    block.appendChild(nameBlock)

    var statBlock = document.createElement('div')
    statBlock.className = 'stat-block'
    var statTitle = document.createElement('h4')
    statTitle.innerText = 'Statistics'
    statBlock.appendChild(statTitle)
    var statList = document.createElement('dl')
    statBlock.appendChild(statList)
    block.appendChild(statBlock)

    var appendToList = function (t, d) {
      var dt = document.createElement('dt')
      dt.innerText = t + ':'
      statList.appendChild(dt)
      var dd = document.createElement('dd')
      dd.innerText = d
      statList.appendChild(dd)
    }

    if (column.stats) {
      Object.keys(column.stats)
        .filter(function (stat) { return stat !== 'n' })
        .forEach(function (stat) {
          appendToList(stat, (column.stats[stat]).toFixed(2))
        })

      if ((column.countValues === null) || (Object.keys(column.countValues).length > 20)) {
        var hist = createHistogram(column.hist)
        block.appendChild(hist)
      }
    }

    if (column.countValues) {
      var topNumber = 5
      var sorted = Object.keys(column.countValues).sort(function (a, b) {
        return column.countValues[b] - column.countValues[a]
      })

      var topValues = sorted.slice(0, topNumber)
      var dataCounter = topValues.map(function (v) { return column.countValues[v] })

      appendToList('Unq', sorted.length + ' (' + (100 * sorted.length / results.n).toFixed(2) + '%)')

      if (topNumber < sorted.length) {
        var other = sorted.slice(5).reduce(function (a, v) { return a + column.countValues[v] }, 0)
        topValues = topValues.concat('Other')
        dataCounter = dataCounter.concat(other)
      }

      var chartContainer = document.createElement('div')
      chartContainer.className = 'count-chart'

      var chartData = {
        categories: topValues,
        series: [
          {
            name: 'Count',
            data: dataCounter
          }
        ]
      }
      var chartOptions = {
        chart: {
          width: 300,
          height: 220,
          title: 'Top ' + (topNumber < sorted.length ? topNumber : sorted.length) + ' of ' + sorted.length + ' values',
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
      chart.barChart(chartContainer, chartData, chartOptions)
      block.appendChild(chartContainer)
    }

    if (column.countTypes['missing']) {
      appendToList('Missing', column.countTypes['missing'] + ' (' + (100 * column.countTypes['missing'] / results.n).toFixed(2) + '%)')
    }

    container.appendChild(block)
  })

  return container
}

function createHead (results) {
  var keys = results.columns.map(function (c) { return c.name })
  var len = results.head.length

  var container = document.createElement('div')
  container.className = 'section datahead'

  var title = document.createElement('h4')
  title.innerText = 'First ' + len + ' of ' + results.n + ' rows'
  title.className = 'title'
  container.appendChild(title)

  var table = document.createElement('table')
  var headerRow = document.createElement('tr')
  keys.forEach(function (k) {
    var th = document.createElement('th')
    th.innerText = k
    headerRow.appendChild(th)
  })
  table.appendChild(headerRow)

  results.head.forEach(function (row) {
    var bodyRow = document.createElement('tr')
    keys.forEach(function (k) {
      var td = document.createElement('td')
      td.innerText = row[k]
      bodyRow.appendChild(td)
    })
    table.appendChild(bodyRow)
  })

  container.appendChild(table)
  return container
}

function generateOutput (el, results) {
  while (el.firstChild) {
    el.removeChild(el.firstChild)
  }
  el.appendChild(createDatasetSummary(results))
  el.appendChild(createTypeSummary(results))
  el.appendChild(createVariablesSummary(results))
  el.appendChild(createHead(results))
}

module.exports = {
  generateOutput: generateOutput
}
