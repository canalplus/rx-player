# Performance tests

This directory regroups tests allowing to detect RxPlayer performance regressions on some
key scenarios.

Unlike unit or integration tests, they do not check that a precise behavior happened. They
measure through `performance.now()` the time taken by some player operations and compare
results obtained with the current code to results obtained with another git branch, `dev`
by default.

Those tests are intended to automatically run in CI. They may also be run locally through:

```sh
npm run test:performance
```

Use `npm run test:performance -- --help` to list the available options. For example, the
following command compares the current code to the `stable` branch on Firefox:

```sh
npm run test:performance -- --branch stable --browser firefox
```

## Dependencies

Performance tests rely on:

- the project's JavaScript dependencies, which should first be installed through
  `npm install` or `npm ci`;

- Git and a reachable git repository. The branch to compare to is cloned in a temporary
  local `node_modules` directory. By default, the URL of the current `origin` remote is
  used, but another one can be given through the `--remote-git-url` option;

- either a Chrome or Firefox executable. Chrome is used by default;

- browser support for the codecs used by the static test contents;

- the ports `3000`, `8080` and `6789` being available by default, respectively for the
  content server, test pages server and results server. Each can be changed through a
  command line option.

Note that running those tests removes and recreates the root `dist` directory and the
`tests/performance/node_modules` directory. It also creates generated JavaScript files in
this directory. Those generated files are ignored by git.

## How tests are performed

Before running tests, `run.mjs` builds two production, minified test bundles:

- `previous.js`, relying on the RxPlayer built from the branch we want to compare to;

- `current.js`, relying on the RxPlayer built from the current working tree.

A third `control-current.js` bundle is copied from `previous.js` to perform an A/A control
where both compared slots actually use the previous RxPlayer. This allows to estimate and
remove a potential bias caused by the order in which pages are run.

Tests are then divided into an A/A control and an A/B treatment, each performed in
multiple (40 as of 2026-08-31) fresh browser processes. Their order is randomized. Inside
each browser process, the two slots alternate page loads, with half of the processes
starting with the current slot and half with the previous one.

For each scenario, `run.mjs` compares per-process mean and median differences from the A/B
treatment to those from the A/A control through a Mann-Whitney U test. A change is only
considered significant for an absolute z-score higher than `2.575829` and a corrected
difference higher than 2 milliseconds:

- a significant median regression makes the test run fail;

- a regression only visible on the mean is displayed as a warning;

- a significant median improvement is also displayed;

- everything else is indicated as not significative.

When a median regression is found, the whole run is performed a second time. The command
only exits with an error if the same scenario has a median regression in both runs.

An HTML report can optionally be written through the `--report` option.

## Tested scenarios

As of 2026-08-31, the tests measure:

- loading a DASH content in monothread mode;

- seeking in that content;

- switching the audio track with the `"reload"` switching mode;

- loading a content over an already active content;

- parsing a large multi-Period Manifest;

- cold loading in multithread mode, including Worker attachment;

- seeking and reloading an audio track in multithread mode;

- hot loading in multithread mode, once the Worker is already attached.

The more expensive loading-over-active-content and large Manifest scenarios only run for
the first four page loads of each browser process, to keep the global duration reasonable.

## Files

- `run.mjs` is the Node.js entry point. It parses command line options, clones and builds
  the compared branch, builds the current code, starts all three HTTP servers, launches
  fresh browser processes, collects samples, compares them and optionally generates a
  report.

- `src/main.js` declares the tested scenarios. New measurements should be delimited by
  calls to `testStart` and `testEnd` with the same unique name.

- `src/lib.js` contains browser-side test utilities. It registers and runs test groups,
  measures their duration, alternates between pages and sends results or errors to the
  Node.js results server.

- `current.html` and `previous.html` are the A/B treatment pages. They respectively load
  the generated `current.js` and `previous.js` bundles.

- `control-current.html` and `control-previous.html` are the A/A control pages. They load
  two copies of the generated bundle for the compared branch.

When adding a scenario, keep in mind that the same `src/main.js` file is bundled against
both revisions. It consequently has to stay compatible with the branch given to
`--branch`, including for the RxPlayer API and imported test files it relies on.
