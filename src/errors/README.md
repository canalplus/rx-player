# Errors

| Consideration           | Status                                               |
| ----------------------- | ---------------------------------------------------- |
| Preferred import style  | Directory-only _[1]_                                 |
| Multithread environment | Should be runnable in both main thread and WebWorker |

_[1]_ Only the `errors` directory itself should be imported and relied on by the rest of
the code, not its inner files (thus `./index.ts` should export everything that may be
imported by outside code).

## Overview

This directory exports `Error` subclasses, that are then used by the RxPlayer, most often
for the public API.

All errors can be directly importable from `index.ts`.
