# The Buffer ###################################################################


## Overview ####################################################################

The Buffer is the part of the RxPlayer choosing which segments to request and
pushing them to the corresponding SourceBuffer.

It tries to choose the optimal segments based on:

  - current network conditions

  - browser capacities

  - the current playing conditions

  - what segments it already has bufferized



## The PeriodBufferManager #####################################################

The ``PeriodBufferManager`` is the main entry point to interact with the buffer.
It completely takes care of segment downloading and pushing for a whole content.

To do so, it creates the right ``AdaptationBuffer``s at the right time. For more
informations on it, you can look at [the PeriodBufferManager
documentation](./period_buffer_manager.md).



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

You can have more informations on it in [the RepresentationBuffer
documentation](./representation_buffer.md).



## The SegmentBookkeeper #######################################################

The ``SegmentBookkeeper`` keeps track of which segments is currently bufferized
to avoid unnecessary re-downloadings of them.

You can have more informations on it in [the SegmentBookkeeper
documentation](./segment_bookkeeper.md).
