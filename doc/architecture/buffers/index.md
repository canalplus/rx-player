# The Buffers ##################################################################


## Overview ####################################################################

The Buffers is the part of the RxPlayer choosing which segments to request and
pushing them to the corresponding SourceBuffer.

It tries to choose the optimal segments based on:

  - current network conditions

  - browser capacities

  - the current playing conditions

  - what segments it already has bufferized



## The BufferOrchestrator ######################################################

The ``BufferOrchestrator`` is the main entry point to interact with the buffer.
It completely takes care of segment downloading and pushing for a whole content.

To do so, it creates the right ``PeriodBuffer``s depending on the current
conditions.
For more information on it, you can look at [the BufferOrchestrator
documentation](./buffer_orchestrator.md).



## The PeriodBuffer ############################################################

The ``PeriodBuffer`` creates and destroys ``AdaptationBuffer``s for a single
manifest's Period.
If no SourceBuffer was created, it lazily creates one (this only applies to
custom SourceBuffer - not managed by the browser - like text).



## The AdaptationBuffer ########################################################

The ``AdaptationBuffer`` creates and destroys ``RepresentationBuffer``s for a
single manifest's Adaptation (such as a particular audio language, a video track
etc.) based on the current conditions (network bandwidth, browser
conditions...).

The ``RepresentationBuffer`` will then have the task to do the
segment-downloading and pushing itself.



## The RepresentationBuffer ####################################################

The ``RepresentationBuffer`` is the part that actually calculates which segments
should be downloaded.

You can have more information on it in [the RepresentationBuffer
documentation](./representation_buffer.md).
