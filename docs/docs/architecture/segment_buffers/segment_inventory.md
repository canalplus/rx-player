---
id: segmentInventory
title: Segment Inventory
sidebar_label: Segment Inventory
slug: architecture/segment_buffer/segment-inventory
---

# SegmentInventory

## Overview

The SegmentInventory is a class which registers some information about every
segments currently present in a `SegmentBuffer`.

One of them is created for every new `SegmentBuffer`.

This helps the RxPlayer to avoid re-downloading segments unnecessarily and know
when old one have been garbage collected.
For example, we could decide not to re-download a segment in any of the
following cases:

- The same segment is already completely present in the `SegmentBuffer`

- The same segment is partially present in the `SegmentBuffer` (read: a part
  has been removed or garbage collected), but enough is still there for what
  we want to play

- Another segment is in the `SegmentBuffer` at the wanted time, but it is the
  same content in a better or samey quality

On the contrary, we need to download the segment in the following cases:

- No segment has been pushed at the given time

- A segment has been pushed, but at a lower quality than what we currently
  want

- A segment has been pushed at a sufficient quality, but we miss to much of it
  for our needs (too much has been garbage collected, removed or the segment
  is just too short).

- A segment has been pushed but is not exactly the content we want
  (example: it is in another language)

Thanks to the SegmentInventory, we can infer on which situation we are at any time.

## Implementation

The SegmentInventory is merely a "Store", meaning it will just store and
process the data you give to it, without searching for the information itself.

It contains in its state an array, the _inventory_, which stores every segments
which should be present in the `SegmentBuffer` in a chronological order.

To construct this inventory, three methods can be used:

- one to add information about a new chunk (part of a segment or the whole
  segment), which should have been pushed to the `SegmentBuffer`.

- one to indicate that every chunks from a given segment have been pushed.

- one to synchronize the currently pushed segments with what the
  `SegmentBuffer` says it has buffered (which can be different for example
  after an automatic garbage collection).

After calling the synchronization one, you should be able to tell which parts of
which segments are currently _living_ in your `SegmentBuffer`.
