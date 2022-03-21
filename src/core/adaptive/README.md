# `AdaptiveRepresentationSelector` #############################################

The `AdaptiveRepresentationSelector` is a function which facilitates the choice
between multiple audio/video qualities in function of the network capabilities
and other specific settings set by the client.

It does so by receiving various values such as:
  - when network requests begin, progresses or end
  - stats about the bandwidth of the user
  - the current status of the buffer (how much of the buffer is left etc.)
  - DOM events
  - user settings (maximum authorized bitrate/width etc.)
  - the available qualities

With all those variables at hand, it then proposes the quality which seems to
be the most adapted, that is the quality which:
  - will respect user settings (example: a Maximum bitrate is set)
  - will maximize the user experience (example: a quality too high for the
    network to handle would lead to excessive re-bufferings, but a too low would
    be not as pleasant to watch)

In order to estimate the quality that maximizes the playback experience, we rely
on multiple algorithms:
  1. One which picks a quality from network conditions.
  2. Another relies on buffering conditions to make its choices.
  3. A third, only used in very rare conditions, "guess" the right quality by
     progressively raising the quality until an un-maintainable one is found.

## Bandwidth-based algorithm ###################################################

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



## Buffer-based algorithm ######################################################

```
                              Qualities
                                  |
                                  |
                                  v
                       +- - - - - + - - - - - - +
    buffer gap [2]     | compute BOLA steps [1] |   maintainability score [3]
         |             +- - - - - - - - - - - - +           +
         |                        |                         |
         |                        v                         |
         |            +- - - - - - - - - - - - -+           |
         +----------> | Compute optimal quality | <---------+
                      +- - - - - - - - - - - - -+
```


[BOLA Algorithm](https://arxiv.org/pdf/1601.06748.pdf) finds optimal quality
value to minimize playback buffering and maximize buffered quality.

[1] BOLA broadly defines minimum buffer steps for which we can allow to download
a quality:

```
                ^
Bitrates (kb/s) |
                |
           3200 |                           +-------------------------+
                |                           |
           1500 |                    +------+
                |                    |
            750 |             +------+
                |             |
            300 |      +------+
                |      |
                +------+------------------------------------------------->
                       5      10     15     20

                                 Buffer gap (s)
```

[2] The BOLA estimation is computed each time a segment is appended (thus buffer
gap is updated).

The RxPlayer has a mecanism that allows to replace low-quality buffered segments
by higher quality ones if the current conditions improve.
That leads to the buffer gap not increasing when a chunk is added.
That could mislead BOLA, and cause oscillations between chosen qualities.

[3] In order to avoid this trend, we compute a maintainability score for the
currently downloaded quality. It is an [EWMA
](https://en.wikipedia.org/wiki/EWMA) of the ratio between segment duration and
segment download time. If the score points that a quality is "maintainable", the
algorithm shall not decide to decrease quality and is "allowed" to pick an upper
quality. Conversely, when a quality may not be downloadable fast enough, the
BOLA is "allowed" to decrease the estimated quality, and shall not decide to
increase it.

If no maintanaibility score is computed, then BOLA works the regular way.
