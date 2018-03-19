# RepresentationBuffer #########################################################


## Overview ####################################################################

The RepresentationBuffer download and push segments linked to a given
Representation.

It constructs a list of segments to download, which depend on the current timing
values and parameters.
It then download and push them to a linked SourceBuffer.

Multiple RepresentationBuffer observables can be ran on the same
SourceBuffer without problems. This allows for example smooth transitions
between multiple periods.



## Return value ################################################################

The RepresentationBuffer returns an Observable which emits multiple
notifications depending on what is happening at its core.

Such events tells us when:

  - Segments are being scheduled for download

  - The RepresentationBuffer has no segment left for download

  - The RepresentationBuffer appended a new Segment to the SourceBuffer

  - The Manifest should be refreshed to allow the RepresentationBuffer to
    download future-needed segments.

  - A discontinuity is currently encountered in the Stream (TODO this might not
    be the job of the RepresentationBuffer)

More soon...
