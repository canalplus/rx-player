# scripts/packager

This is a wrapper to both `ffmpeg` and the `shaka-packager` to package a dummy yet
functional content with audio, video and optionally subtitles.

This is mainly intended for testing, it can also be used to easily obtain a live content
to manually test the RxPlayer on a local content.

Its entry point is the `main.mjs` file, you can run it directly with an `--help` flag to
see options.

When running it `ffmpeg` has to be accessible in path, the `shaka-packager` will be
automatically installed locally if not found in path and not given as a flag.
