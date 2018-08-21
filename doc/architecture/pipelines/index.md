# The Pipelines ################################################################


## Overview ####################################################################

The Pipelines is the part of the code interacting with the transport protocol,
defined in _Net_, to download and parse:
  - the Manifest
  - media Segments

Each of those task is performed by a discrete component of the Pipeline:

  - The __Manifest Pipeline__ is used to download and parse the manifest file.

  - The __SegmentPipelinesManager__ is used to create Segment pipelines,
    allowing to download and parse media segments.



## The Manifest Pipeline #######################################################

The Manifest Pipeline allows to download and parse the Manifest/Playlist of the
current transport protocol to return an unified Manifest object.

This is the part of the code that interacts with _Net_ to perform the request
and parsing  of the Manifest file.

It can also add multiple supplementary Image or Text tracks to a given Manifest.



## The SegmentPipelinesManager #################################################

The SegmentPipelineManager allows to easily perform Segment downloads for the
rest of the code.
This is the part of the code that interacts with the transport protocols -
defined in _Net_ - to load and parse media segments.

To do so, the SegmentPipelineManager creates Pipelines of different types
(example: a video or audio Pipeline) when you ask for it.
Through those Pipelines, you can then schedule various segment requests with a
given priority.

The priority of this request is then corroborated with the
priority of all requests currently pending in the SegmentPipelineManager (and
not only with those on the current pipeline) to know when the request should
effectively be done.

During the lifecycle of the request, the Pipeline will communicate about data
and metrics through several means - documented in the code.

### Priorization ###############################################################

Each Segment request can be linked to a priorization number.
Such number will indicate which segment is needed more immediately than other
(lower it is, the higher the priority of the segment is).

If the request has no priorization number, the lowest priorization number
(the highest priority) will be set on it: ``0``

Basically, any new request will have their priorization number compared to the
one of the current request(s) done by the SegmentPipelineManager:

  - if no request is already pending, we perform the request immediately

  - if (and only if) this priorization number is higher (so lower priority) than
    all current requests, this new request will be postponed to let the
    higher-priority ones finish.

  - If a new request has a priorization number lower or equal than all current
    downloads, we perform the request immediately without interrupting the
    current, lower-priority ones.

The priority of a download can be updated at any time, until this request either
has finished, was canceled or failed. The same rules apply when the priorization
number is updated (if this request is already pending, we keep it going in any
case).
