## StatSim Profile

Generate data profiles in the browser or from the command line. Data is processed locally as a stream using online algorithms, so you can handle very large files without loading them into memory.

### Features

* CSV and TSV support
* Streaming processing via Web Workers (UI stays responsive)
* Missing value detection (empty, NA, NULL, NaN, etc.)
* Descriptive statistics (min, max, mean, variance, std)
* Histograms and top-N value counts
* Variable type classification (Number, String, Boolean, Categorical, Mixed)
* Load files from URL via query param: `?file=https://example.com/data.csv`
* CLI tool for scripting: `npx statsim-profile data.csv`

### Usage

**Browser:** Open [statsim.com/profile](https://statsim.com/profile/), drag a CSV file or paste a URL.

**CLI:**
```
npx statsim-profile data.csv          # profile a file, output JSON
cat data.csv | npx statsim-profile --stdin  # read from stdin
```

### Development

```
npm install
npm run build-dev   # build browser bundles
npm test            # run unit + E2E tests
```
