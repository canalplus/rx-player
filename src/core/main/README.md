# Core Main

| Consideration           | Status                                     |
| ----------------------- | ------------------------------------------ |
| Preferred import style  | Depends on the environment [1]             |
| Multithread environment | Should be runnable in a WebWorker entirely |

[1] In a Multithreading mode, no file from that directory should ever be imported by
external code but the `WorkerMain` to generate the worker bundle. In a monothreading mode,
any files may be directly imported.

## Overview

The Core Main serves as the entry point of the `core` code, which may optionally runs in a
WebWorker.

When in monothreading mode, files declared here may be imported directly to make the link
with the core code (which between other things allows to load and push segments).
