# MSE APIs

| Consideration           | Status                                            |
| ----------------------- | ------------------------------------------------- |
| Preferred import style  | Either through `features` or mixed _[1]_          |
| Multithread environment | May run in WebWorker depending on the abstraction |

_[1]_ Some MSE abstraction implementation should generally be through the global
`features` object when available through it. Other imports may be performed through the
`mse` directory itself - if `index.ts` exports the wanted values and/or types, or from the
file/directory which does if not.

## Overview

This directory regroups abstractions over the Media Source Extensions - the set of browser
API allowing to buffer media - so a common API is provided to the rest of the RxPlayer's
code regardless of the environment (e.g. in a WebWorker without MSE API or in an
environment with MSE API).

When in a WebWorker without MSE API, the implementations provided here actually post
messages at the destination of the main thread, which will have to perform the MSE
operation itself and send back the result to the implementation through the right response
message (see multithreading-related types for the list of potential messages).

In some cases, specific implementations provided here may be importable through the
`features` object (see `features` directory), ensuring that the right implementation is
always relied on for the current environment. Though there is exceptions to this rule when
you're sure of the implementation wanted, e.g. you may directly import an MSE-backed
implementation when you know your code is running on an environment which has the
necessary MSE API (such as the main thread in a web browser environment).
