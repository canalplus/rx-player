# Content Steering implementation

__LAST UPDATE: 2022-08-04__

## Overview

Content steering is a mechanism allowing a content provider to deterministically
prioritize a, or multiple, CDN over others - even during content playback - on
the server-side when multiple CDNs are available to load a given content.

For example, a distributor may want to rebalance load between multiple servers
while final users are watching the corresponding stream, though many other use
cases and reasons exist.

As of now, content steering only exist for HLS and DASH OTT streaming
technologies.
In both cases it takes the form of a separate file, in DASH called the "DASH
Content Steering Manifest" (or DCSM), giving the current priority.
This separate file has its own syntax, semantic and refreshing logic.


## Architecture in the RxPlayer


```
               /parsers/SteeringManifest
      +----------------------------------+
      | Content Steering Manifest parser | Parse DCSM[1] into a
      +----------------------------------+ transport-agnostic steering
              ^                            Manifest structure
              |
              | Uses when parsing
              |
              |
              | /transports
      +---------------------------+
      |        Transport          |
      |                           |
      | new functions:            |
      |   - loadSteeringManifest  | Construct DCSM[1]'s URL, performs
      |   - parseSteeringManifest | requests and parses it.
      +---------------------------+
              ^
              |
              | Relies on
              |
              |
              | /core/fetchers/steering_manifest
      +-------------------------+
      | SteeringManifestFetcher | Fetches and parses a Content Steering
      +-------------------------+ Manifest in a transport-agnostic way
              ^                   + handle retries and error formatting
              |
              | Uses an instance of to load, parse and refresh the
              | Steering Manifest periodically according to its TTL[2]
              |
              |
              | /core/fetchers/cdn_prioritizer.ts
      +----------------+ Signals the priority between multiple
      | CdnPrioritizer | potential CDNs for each resource.
      +----------------+ (This is done on demand, the `CdnPrioritizer`
             ^           knows of no resource in advance).
             |
             | Asks to sort a segment's available base urls by order of
             | priority (and to filter out those that should not be
             | used).
             | Also signals when it should prevent a base url from
             | being used temporarily (e.g. due to request issues).
             |
             |
             | /core/fetchers/segment
      +----------------+
      | SegmentFetcher | Fetches and parses a segment in a
      +----------------+ transport-agnostic way
             ^           + handle retries and error formatting
             |
             | Ask to load segment(s)
             |
             | /core/stream/representation
      +----------------+
      | Representation | Logic behind finding the right segment to
      |    Stream      | load, loading it and pushing it to the buffer.
      +----------------+ One RepresentationStream is created per
                         actively-loaded Period and one per
                         actively-loaded buffer type.


[1] DCSM: DASH Content Steering Manifest
[2] TTL: Time To Live: a delay after which a Content Steering Manifest should be refreshed
```
