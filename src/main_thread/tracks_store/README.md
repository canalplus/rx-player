# Tracks Store

| Consideration           | Status                    |
| ----------------------- | ------------------------- |
| Preferred import style  | No enforced import style  |
| Multithread environment | Always run in main thread |

## Overview

The "Tracks Store" module is written specifically to facilitate the choosing of a specific
Adaptation/track and Representations/qualities through the RxPlayer API.

The job of this module is to provide a simple API with few methods allowing to choose
based on IDs while it takes care of the specificities and technical details behind the
curtains.

## `TracksStore`

`TracksStore` is the main implementation used for Manifest-based contents. It centralizes
the currently chosen tracks and qualities and exposes simple operations for the API to
switch them.

## `TrackDispatcher`

`TrackDispatcher` links track decisions to the underlying streaming logic for a given
type. It is responsible for propagating updated choices and constraints when the selected
track or representations change.

## `MediaElementTracksStore`

`MediaElementTracksStore` is the directfile-oriented counterpart. It relies on the media
element's native track APIs (`audioTracks`, `videoTracks`, `textTracks`) instead of the
Manifest-based track model used by `TracksStore`.
