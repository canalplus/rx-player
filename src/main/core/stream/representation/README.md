# RepresentationStream #########################################################


## Overview ####################################################################

The `RepresentationStream` download and push segments linked to a given
Representation.

It constructs a list of segments to download, which depend on the current
playback conditions.
It then download and push them to a linked `SegmentBuffer` (the media buffer
containing the segments for later decoding).

Multiple `RepresentationStream` observables can be ran on the same
`SegmentBuffer` without problems, as long as they are linked to different
Periods of the Manifest.
This allows for example smooth transitions between multiple periods.



## Return value ################################################################

The `RepresentationStream` returns an Observable which emits multiple
notifications depending on what is happening at its core, like:

  - when segments are scheduled for download

  - when segments are pushed to the associated `SegmentBuffer`

  - when the Manifest needs to be refreshed to obtain information on possible

  - whether the `RepresentationStream` finished to load segments until the end
    of the current Period. This can for example allow the creation of a
    `RepresentationStream` for the next Period for pre-loading purposes.

  - whether there are discontinuities: holes in the stream that won't be filled
    by segments and can thus be skipped
