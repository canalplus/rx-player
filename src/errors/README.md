# Errors

| Consideration           | Status                                                  |
| ----------------------- | ------------------------------------------------------- |
| Preferred import style  | `./public_api` for API errors, else `./internal/` _[1]_ |
| Multithread environment | Should be runnable in both main thread and WebWorker    |

_[1]_ Errors intended to be communicated through the RxPlayer should be the ones imported
from the `errors/public_api` directory only. Errors relied on only for internal error
management are exported through `errors/internal`. Various utils can be imported directly
from `errors`.

## Overview

This directory exports `Error` subclasses, that are then used by the RxPlayer to add more
semantic values to failure cases (e.g. the URL when an error is linked to an HTTP request,
DRM information when linked to decryption errors etc.)

They are divided in two categories:

- `./public_api/` contains errors intended to be communicated through the RxPlayer API.

  Those are the errors documented in our API documentation and thus are intended to keep a
  stable structure.

- `./internal/` contains errors that **should not** be communicated through the RxPlayer
  API, but are intended for internal use only.

  Being separated that way, those errors can be update much more quickly to allow more
  features (e.g. to communicate more information through error properties), without having
  to update the API.
