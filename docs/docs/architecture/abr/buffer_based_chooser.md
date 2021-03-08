---
id: bufferBasedChooser
title: Buffer based chooser
sidebar_label: Buffer based chooser
slug: architecture/abr/buffer-based-chooser
---

# ABRManager - Buffer based estimator

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
