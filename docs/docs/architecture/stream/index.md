---
id: stream-architecture
title: Overview
sidebar_label: Overview
slug: architecture/stream
---

# The Stream

## Overview

The `Stream` is the part of the RxPlayer choosing the right segments to
download, to then push them to the corresponding media buffers (called
`SegmentBuffers`) so they can later be decoded.

To do so, they receive inputs on both what the chosen track should be and on the
estimated optimal quality for those tracks. By then monitoring what has already
been buffered and the current playback conditions, they can make an educated
guess on what segments should be loaded and pushed at any given time.

## The StreamOrchestrator

The `StreamOrchestrator` is the main entry point to interact with the
`Stream`.

It completely takes care of segment downloading and pushing for a whole content.

To do so, it creates the right `PeriodStream`s depending on the current
playback conditions.
For more information on it, you can look at [the StreamOrchestrator
documentation](./stream_orchestrator.md).

## The PeriodStream

The `PeriodStream` creates and destroys `AdaptationStream`s for a single
Manifest's Period and a single type of buffer (e.g. "audio", "video", "text"
etc.).

It does so after asking through an event which Adaptation has to be chosen for
that Period and type.

It also takes care of creating the right "`SegmentBuffer`" for its associated
type, if none was already created for it.

## The AdaptationStream

The `AdaptationStream` creates and destroys `RepresentationStream`s for a
single manifest's Adaptation (such as a particular audio language, a video track
etc.) based on the current conditions (network bandwidth, browser
conditions...).

The `RepresentationStream` will then have the task to do the
segment downloading and pushing itself.

## The RepresentationStream

The `RepresentationStream` is the part that actually monitors the buffer to
deduce which segments should be downloaded, ask to download them and then give
the order to push them to the `SegmentBuffer`.

You can have more information on it in [the RepresentationStream
documentation](./representation_stream.md).
