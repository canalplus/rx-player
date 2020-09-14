# The Stream ###################################################################


## Overview ####################################################################

The Stream is the part of the RxPlayer choosing which segments to request and
pushing them to the corresponding SourceBuffer.

It tries to choose the optimal segments based on:

  - current network conditions

  - browser capacities

  - the current playing conditions

  - what segments it already has bufferized



## The StreamOrchestrator ######################################################

The ``StreamOrchestrator`` is the main entry point to interact with this part of
the code.

It completely takes care of segment downloading and pushing for a whole content.

To do so, it creates the right ``PeriodStream``s depending on the current
conditions.
For more information on it, you can look at [the StreamOrchestrator
documentation](./stream_orchestrator.md).



## The PeriodStream ############################################################

The ``PeriodStream`` creates and destroys ``AdaptationStream``s for a single
Manifest's Period.
If no SourceBuffer was created, it lazily creates one (this only applies to
custom SourceBuffer - not managed by the browser - like text).



## The AdaptationStream ########################################################

The ``AdaptationStream`` creates and destroys ``RepresentationStream``s for a
single manifest's Adaptation (such as a particular audio language, a video track
etc.) based on the current conditions (network bandwidth, browser
conditions...).

The ``RepresentationStream`` will then have the task to do the
segment-downloading and pushing itself.



## The RepresentationStream ####################################################

The ``RepresentationStream`` is the part that actually process which segments
should be downloaded.

You can have more information on it in [the RepresentationStream
documentation](./representation_stream.md).
