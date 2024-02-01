# RepresentationStream

| Consideration           | Status                            |
| ----------------------- | --------------------------------- |
| Preferred import style  | Directory-only _[1]_              |
| Multithread environment | Should be runnable in a WebWorker |

_[1]_ Only the `representation` directory itself should be imported and relied on by the
rest of the code, not its inner files (thus `./index.ts` should export everything that may
be imported by outside code).

## Overview

The `RepresentationStream` download and push segments linked to a given Representation.

It constructs a list of segments to download, which depend on the current playback
conditions. It then download and push them to a linked `SegmentSink` (the media buffer
containing the segments for later decoding).

Multiple `RepresentationStream` can be ran on the same `SegmentSink` without problems, as
long as they are linked to different Periods of the Manifest. This allows for example
smooth transitions between multiple periods.
