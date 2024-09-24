# RxPlayer core

The "core" regroups multiple modules constituting the central logic of the RxPlayer.

Those modules are:

- **the `API` (./api)**

  Defines the public API of the RxPlayer and provides abstractions to help implementing
  it.

- **the `ContentInitializer` (\_./init)**

  Initialize playback and connects different modules between one another.

- **the `ContentDecryptor` (./decrypt)**

  Negotiate content decryption. Only used for contents with DRM (Digital Right
  Management).

- **the `AdaptiveRepresentationSelector` (./adaptive)**

  Helps to choose the best quality in the current content by analyzing the current
  network, user settings and viewing conditions.

- **the `Stream` (./stream)**

  Choose which media segments to download and push them to media buffers (here called the
  `SegmentBuffers`) to then be able to decode them.

- **the `SegmentBuffers` (./segment_buffers)**

  Implement media buffers on which loaded segments will be pushed. The corresponding media
  data contained in them will then be decoded at the right time.

  Those buffers can depend on browser implementations (for example for audio and video
  contents, we rely on `SourceBuffer` JS objects) or may be completely defined in the code
  (for example, text track buffers in the `"html"` `textTrackMode` are entirely defined in
  the RxPlayer).

  Those `SegmentBuffers` have added niceties over just being simple data buffers. For
  example, they include an inventory which allows to retrieve the metadata about every
  segments that is still contained within it.

- **the `fetchers` (./fetchers)**

  Link the `transports` module with the rest of the code, to download segments,
  download/refresh the manifest and collect data (such as the user's bandwidth) for the
  other modules.
