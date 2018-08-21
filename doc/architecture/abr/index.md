# ABRManager ###################################################################


## Overview ####################################################################

The ABRManager (ABR for Adaptive BitRate) is a class which facilitates the
choice between multiple audio/video qualities in function of the current
bandwidth, the network capacities and other specific settings set by the client.

It does so by receiving various values such as:
  - when network requests begin, progresses or end
  - stats about the bandwidth of the user
  - the current status of the buffer (how much of the buffer is left etc.)
  - DOM events
  - user settings (maximum authorized bitrate/width etc.)
  - the available qualities

With all those variables in hand, it then proposes the quality which seems to
be the most adapted, that is the quality which:
  - will respect user settings (example: a Maximum bitrate is set)
  - will maximize the user experience (example: a quality too high for the
    network to handle would lead to excessive re-bufferings, but a too low would
    be not as pleasant to watch)
