# The `API` ####################################################################

| Consideration           | Status                                             |
|-------------------------|----------------------------------------------------|
| Preferred import style  | Either the `types` file or the API may be imported |
| Multithread environment | Always run in main thread                          |

## Overview ####################################################################

The API is the front-facing part of the code.
It will be the only layer used by applications integrating the RxPlayer library.

As such, its main roles are to:
  - provide a comprehensive API for the user
  - translate user order into actions in the player
  - redirecting events to the user


## Subparts ####################################################################

To facilitate those actions, the API relies on multiple building blocks:

  - __the `PlaybackObserver` (./playback_observer.ts)__

    Provide multiple methods allowing to monitor the current playback conditions
    (e.g. the current position and/or the current playback rate).
    Many RxPlayer modules rely on this PlaybackObserver.

  - __the `option utils` (./option_utils.ts)__

    Parse options given to some RxPlayer API calls, to add default parameters
    and provide inteligible warnings/errors
