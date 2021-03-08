---
id: fetchers-architecture
title: Fetchers
sidebar_label: Fetchers
slug: architecture/fetchers
---

# The fetchers

## Overview

The fetchers is the part of the code interacting with the transport protocol,
defined in `transports`, to download and parse:

- the Manifest
- media Segments

Each of those task is performed by a discrete component of the fetchers:

- The **Manifest fetcher** is used to download and parse the manifest file.

- The **SegmentFetcherCreator** is used to create Segment fetchers,
  allowing to download and parse media segments.

## The Manifest fetcher

The Manifest fetcher allows to download and parse the Manifest/Playlist of the
current transport protocol to return an unified Manifest object.

This is the part of the code that interacts with `transports` to perform the
request and parsing of the Manifest file.

## The SegmentFetcherCreator

The SegmentFetcherCreator allows to easily perform segment downloads for the
rest of the code.
This is the part of the code that interacts with the transport protocols -
defined in `transports` - to load and parse media segments.

To do so, the SegmentFetcherCreator creates "segment fetchers" of different
types (example: a video or audio segment fetcher) when you ask for it.
Through those fetchers, you can then schedule various segment requests with a
given priority.

The priority of this request is then corroborated with the priority of all
requests currently pending in the SegmentFetcherCreator (and not only with
those on the current segment fetcher) to know when the request should
effectively be done - more prioritary requests will be done first.

During the lifecycle of the request, the segment fetcher will communicate about
data and metrics through several means - documented in the code.

### Priorization

Each Segment request can be linked to a priorization number.
Such number will indicate which segment is needed more immediately than other
(the lower it is, the higher the priority of the segment is).

This is for example used to indicate that a very close video segment has a
higher priority than some distant audio segment (both might be scheduled at the
same time depending on the situation).

If the request has no priorization number, the lowest priorization number
(the highest priority) will be set on it: `0`

Basically, any new request will have their priorization number compared to the
one of the current request(s) done by the SegmentFetcherCreator:

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
