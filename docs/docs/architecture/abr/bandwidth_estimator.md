---
id: bandwidthEstimator
title: Bandwidth Estimator
sidebar_label: Bandwidth Estimator
slug: architecture/abr/bandwidth-estimator
---

# ABRManager - Bandwidth estimator

```
                 Long
                 (normal mode) [2]
                         +----------+ Buffer Gap [1] +-------+
                         |                                   |
                         v                                   |Short
                     Request(s)                              |(starvation mode)
                     datas                                   |[4]
                         +                                   |
                         |                                   |
                         |                                   |
    Request time length  |                                   |
    Data size            |                                   |
                         |                                   |
+- - - - - - - - - - - + v +- - - - - - - - - - -+           v
| Short term EWMA [2a] |   | Long term EWMA [2b] |     Last request
+- - - - - - - - + - - +   +- - -+- - - - - - - -+           +
                 |               |                           |
             + - + - - - - - - - + - +       +- - - - - - - -v- - - - - - +
             | Ceil bitrate (minimum |       | Ceil bitrate               |
             | between both) [3]     |       | (bandwidth estimation from |
             + - - - - - + - - - - - +       | last request [5]           |
                         |        ^          + - - - - - - - - - -+- - - -+
                         |        |                   ^           |
                         v        |                   |           v
                      Ceiled      +---+ Available +---+      Ceiled
                      bitrate           qualities            bitrate
                         +                                       +
                         |                                       |
                         |                                       |
                         +---------> Chosen quality <------------+
```

[1] The buffer gap is the distance between the current time and the buffer time
edge.

[2] If the buffer gap is long (more than 5 seconds in default configuration):
From requests computed bandwidths (data size / request time), calculate two
[EWMA](https://en.wikipedia.org/wiki/EWMA).

[2a] The first, a fast-moving average, falls quickly when estimated bandwidth
falls suddenly.

[2b] The second, a slow-moving average, is a bandwidth mean.

[3] For quality of service, the player should adapt down quickly, to avoid
buffering situations, and grow up slowly, in order to smoothly change quality.
For this reason, the minimum between the two estimated is considered as a
bitrate threshold. The chosen quality is a quality's bitrate ceiling.

[4] If the buffer gap is too short, it is considered as "starving":

[5] An immediate bandwidth is computed from last or current request.
The quality's bitrate ceiling relies on it to return the chosen quality.
