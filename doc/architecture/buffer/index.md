# The Buffer ###################################################################


## Overview ####################################################################

The Buffer is the part of the RxPlayer choosing which segments to request and
pushing them to the corresponding SourceBuffer.

It tries to choose the optimal segments based on:
  - current network conditions
  - browser capacities
  - the current playing conditions



## The AdaptationBufferManager #################################################

The AdaptationBufferManager allows to easily create Buffer for a single
manifest's Adaptation.

Basically, it will dynamically create and destroy RepresentationBuffer - which
are Buffers linked to a single Representation - based on the current conditions.

The RepresentationBuffer will then have the task to do the segment-downloading
and pushing itself. More information on it is available in [the
RepresentationBuffer documentation](./representation_buffer.md).
