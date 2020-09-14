# RepresentationStream #########################################################


## Overview ####################################################################

The RepresentationStream download and push segments linked to a given
Representation.

It constructs a list of segments to download, which depend on the current timing
values and parameters.
It then download and push them to a linked SourceBuffer.

Multiple RepresentationStream observables can be ran on the same
SourceBuffer without problems. This allows for example smooth transitions
between multiple periods.



## Return value ################################################################

The RepresentationStream returns an Observable which emits multiple
notifications depending on what is happening at its core.

Such events tells us when:

  - Segments are being scheduled for download

  - The RepresentationStream has no segment left for download

  - The RepresentationStream appended a new Segment to the SourceBuffer

  - The Manifest should be refreshed to allow the RepresentationStream to
    download future-needed segments.

  - A discontinuity is currently encountered



## Queue Algorithm #############################################################

The RepresentationStream depends on a central algorithm to make sure that the
right segments are scheduled for download at any time.

This algorithm constructs a queue of segments to download at any time, and
regularly checks that the segment currently downloaded still corresponds to the
currently most needed Segment.

This list of segments is based on a simple calculation between the current
position and the buffer size we want to achieve.
This list goes then through multiple filters to ensure we're not queueing them
unnecessarly. Such cases would be, for example, if the segment is already
present in the SourceBuffer at a better quality.

For a clock based on various video events, the strategy is the following:

  1. let ``segmentQueue`` be an empty array.

  2. On each clock tick, calculate ``segmentsNeeded``, an Array of needed
     segments (read: not yet downloaded) from the current time to the buffer
     size goal.

     Note that the steps _2_ to _5_ can run multiple times while waiting for
     a request - happening in step _5_ and _8_. If that happens,
     ``segmentQueue`` should equal the last value it has been given.

  3. check if there's a segment currently downloaded (launched in step _8_)

     3-1. If there is none, let segmentQueue be equal to ``segmentsNeeded``

     3-2. If there is one but for a segment different than the first element
          in ``segmentsNeeded`` or if ``segmentsNeeded`` is empty, abort
          this request and let ``segmentQueue`` be equal to ``segmentsNeeded``.

     3-3. If there is one and is for the same segment than the first element
          in ``segmentsNeeded``, let ``segmentQueue`` be equal to
          ``segmentsNeeded`` without its first element.

  4. if ``segmentQueue`` is empty, go back to _2_.

  5. check if there's a pending segment request (happening in step _8_):

     5-1. if there's no segment request, continue

     5-1. if there's a pending segment request, go back to _2_

  6. Let ``currentSegment`` be the first segment of ``segmentQueue``

  7. Remove the first segment from ``segmentQueue`` (a.k.a. ``currentSegment``)

  8. perform a request for ``currentSegment`` and wait for it to finish.
     During this time, step _2_ to _5_ can run in parallel, and as such
     ``SegmentQueue`` can be mutated during this process.

  9. Once the request is finished, run those tasks in parallel:

     9-1. Append the segment to the corresponding SourceBuffer

     9-1. go back to step _4_.
