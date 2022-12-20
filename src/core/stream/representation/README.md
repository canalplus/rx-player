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
