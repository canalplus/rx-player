# CoreInterface

| Consideration           | Status                                               |
| ----------------------- | ---------------------------------------------------- |
| Preferred import style  | Only through the `features` object                   |
| Multithread environment | May run in WebWorker depending on the implementation |

## Overview

This directory defines `CoreInterface` implementations, which is the link between the
RxPlayer's "main_thread" logic (which implements logic running always in main thread: the
API, decryption, subtitles rendering, track management...) to the RxPlayer's "core" logic
(which implements logic which may run in a WebWorker: manifest loading, segment loading
and parsing, adaptive...).

Depending on if playback for the current content currently relies on a single thread or
multiple ones, a different `CoreInterface` implementation will be selected.

This directory should not be imported directly by the main logic (beside types). Rather,
the RxPlayer's global `features` object should refer to the implementations currently
available instead. This is to ensure that the `CoreInterface` logic is only imported if
the application has explicitly asked for the corresponding feature.
