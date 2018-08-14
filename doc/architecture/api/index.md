# The API ######################################################################


## Overview ####################################################################

The API is the front-facing part of the code.
It will be the only layer used by applications integrating the RxPlayer library.

As such, its main roles are to:

  - provide a comprehensive API for the user

  - translate user order into actions in the player

  - redirecting events to the user



## Subparts ####################################################################

To facilitate those actions, the API rely on multiple building blocks:

  - __the Clock__

    Provide an Observable emitting regularly the current viewing conditions for
    the Player. Many RxPlayer modules rely on a clock.


  - __the TrackManager__

    Ease up text/audio language management to provide a simple-to-use API.


  - __the option parsers__

    Parse options given to some RxPlayer API calls, to add default parameters
    and provide inteligible warnings/errors
