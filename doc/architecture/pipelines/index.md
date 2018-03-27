# The Pipelines ################################################################


## Overview ####################################################################

The Pipelines is the part of the code interacting with the transport protocol,
defined in _Net_, to download and parse:
  - the Manifest
  - media Segments

Each of those task is performed by a discrete component of the Pipeline:

  - [The Manifest Pipeline](./manifest_pipeline.md) is used to download and
    parse the manifest file.

  - [The SegmentPipelinesManager](./segment_pipeline_manager.md) is used to
    download and parse media segments.
