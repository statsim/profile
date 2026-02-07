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
* CLI output modes: `summary`, `json`, and `serve`
* npm package: `@statsim/profile`

### Usage

**Browser:** Open [statsim.com/profile](https://statsim.com/profile/), drag a CSV file, paste a URL, or open a prefilled link such as `?file=https://example.com/data.csv`.

**CLI:**
```
npx @statsim/profile data.csv
sprofile data.csv                       # summary (TTY)
sprofile data.csv --format json         # raw JSON
sprofile data.csv --format serve        # open local browser report
cat data.csv | sprofile --stdin         # stdin mode
```

### Development

```
npm install
npm run build-dev   # build browser bundles
npm test            # run unit + E2E tests
```
