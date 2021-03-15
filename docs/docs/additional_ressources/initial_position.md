---
id: initial_position
title: Initial Position
sidebar_label: Initial Position
slug: initial_position
---

## Overview

When you give it a content to load, the RxPlayer has to set at one point the
starting playback position.

This documentation page explain how that position is calculated.

Basically, we can be in one of those four different situations:

- a valid `startAt` option has been set to `loadVideo`, in which case we use
  it to define the initial position.

- no `startAt` option has been set and we're playing a VoD content.

- no `startAt` option has been set and we're playing a live content.

- no `startAt` option has been set and we're playing a directfile content.

## About the minimum and maximum position

Regardless of your current situation, the minimum and maximum position of the
content might be calculated and used when defining that starting position.

Those positions are inferred directly from the Manifest (when not playing a
directfile content).
Most Manifests declare every segments currently available. In that case, we can
simply use the start of the first announced segment as a minimum position and the
end of the last one as a maximum.

In some other Manifest files, segment availability is not clearly announced.
In those cases, the minimum and maximum positions use other properties declared
in the Manifest, often by making usage of a synchronized clock between the
client and the server.

For "directfile" contents, we directly interrogate the browser to obtain the
duration of the content. The minimum position here is always inferred to be `0`
(for the moment at least).

## When a startAt option has been set

You can define yourself the start position at which we should play. This is
configurable thanks to the startAt option, documented
[here in the API documentation](../api/basicMethods/loadVideo.md#startAt).

Please note however that there is a catch: every of the possible values you
will set will be "bounded" to the maximum and minimum position actually detected
for the content.

This means that if your startAt indicate that we should start at a position of
`10` seconds but the content starts at `15` seconds, we will actually start
at `15` seconds instead.

You can check at which position we actually loaded when the player's state
(accessible either through the `getPlayerState` method or through the
`playerStateChanged` event) changed to `"LOADED"`.

## When no startAt option has been set and we're playing a VoD content

For VoD contents, we will just start to play at the minimum detected position in
the Manifest.

## When no startAt option has been set and we're playing a live content

For live contents, we have here three cases:

- In the case where we have a clock synchronization mechanism with the
  server[1] and if the current date can be seeked to (i.e. segments are
  available for that position), we will try to play close to[2] that date.

- if either we do not have a clock synchronization mechanism[1] or if we have
  one but no segment is defined for the current date, we will play close to[2]
  the maximum calculated position instead.

- Third case, if we do not have any clock synchronization mechanism[1] and if
  the Manifest does not announce clearly a maximum position, we will use the
  system clock and play close to[2] that time instead.

[1] We can obtain a synchronized clock allowing us to to know which content
should be broadcasted at which time by either of those means:

- the Manifest document defines one (e.g. `UTCTiming` elements for DASH
  contents).
- One was provided to `loadVideo` thanks to the `serverSyncInfos` transport
  option [see loadVideo
  documentation](../api/basicMethods/loadVideo.md#transportOptions).

[2] I wrote "close to" in every cases as we might substract some seconds from
that value. How much we might do, depends on:

- if the manifest suggest us a delay relative to the live, in which case we
  apply it
- if not, we set it to the default: `10` seconds

## When no startAt option has been set and we're playing a directfile content

For directfile contents, we for now just start at `0` if no `startAt` is
defined.
