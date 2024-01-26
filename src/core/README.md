# RxPlayer core

| Consideration           | Status                                     |
| ----------------------- | ------------------------------------------ |
| Preferred import style  | Depends on the environment [1]             |
| Multithread environment | Should be runnable in a WebWorker entirely |

[1] In a Multithreading mode, only the `types` file should probably be imported
by external code (to ensure a small bundle size). In a monothreading mode,
no import strategy is enforced.

## Overview

The "core" regroups multiple modules constituting the central logic of the
RxPlayer which can optionally run in a WebWorker environment.

Those modules are:

- **the `Core Main` (\_./main)**

  Make the link between the "main thread" part of the code and the core.

  When the core runs in a WebWorker, this is the part receiving and handling
  messages from the main thread.

- **the `AdaptiveRepresentationSelector` (./adaptive)**

  Helps to choose the best quality in the current content by analyzing the
  current network, user settings and viewing conditions.

- **the `Stream` (./stream)**

  Choose which media segments to download and push them to media buffers (here
  called the `SegmentSinks`) to then be able to decode them.

- **the `SegmentSinks` (./segment_sinks)**

  Implement media sinks on which loaded segments will be pushed.
  The corresponding media data contained in them will then be decoded at the
  right time.

  Those can depend on browser buffers implementations (for example for audio
  and video contents, we rely on `SourceBuffer` JS objects) or may be
  completely defined in the code (for example, text track buffers in the
  `"html"` `textTrackMode` are entirely defined in the RxPlayer).

  Those `SegmentSinks` include an inventory which allows to retrieve the
  metadata about every segments that is still contained within it.

- **the `fetchers` (./fetchers)**

  Link the `transports` module with the rest of the code, to download
  segments, download/refresh the manifest and collect data (such as the
  user's bandwidth) for the other modules.
