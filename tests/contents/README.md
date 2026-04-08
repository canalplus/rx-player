# Test contents

Some tests rely on local contents that are either dynamically packaged on demand (through
a local packager script) or just static assets that are served.

Those static assets are declared here, in the `./static` directory and then all exposed
through an associated HTTP URL and mime-type at `./static/urls.mjs`.

The packager is declared elsewhere as it may be relied on more generically than test
assets, which have been especially created for tests.

## Test content server

Both that packager and those static assets can be made accessible by running the server
script here (`./server.mjs`), which should be done before running the tests relying on
those.

See its `--help` flag for more information, a notice on how to use it is also shown when
running it.
