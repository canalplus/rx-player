---
id: player_events
title: Player events
sidebar_label: Player events
slug: playerEvents
---

## Overview

To communicate about events (like an error or the update of the current video
bitrate) the player use the event listener pattern.

As [documented in the API](./basicMethods/addEventListener.md), you can call
`addEventListener` to register a callback for a particular event, like:

```js
player.addEventListener("videoBitrateChange", (newVideoBitrate) => {
  console.log("the video bitrate changed to:", newVideoBitrate);
});
```

You can unregister a callback through the `removeEventListener` API,
documented [here](./basicMethods/removeEventListener.md).

## Basic events

This chapter describes the most important events sent by the player.

### playerStateChange

_payload type_: `string`

Emit the current state of the player, every time it changes.

This is the event to catch if you want to know when the player is playing, is
paused, is rebuffering, is ended or is stopped.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](./states.md).

### error

_payload type_: `Error`

Triggered when a fatal error happened.

A fatal error is an error that led the player to stop playing the current
content.

The payload is the corresponding error. See [the Player Error](./errors.md) documentation for more information.

### warning

_payload type_: `Error`

Triggered each time a minor error happened.

This error won't lead the RxPlayer to stop the content. It can for example be
an HTTP request error, some minor error detected in the content or the current
position being to far below the minimum playable position.

The payload is the corresponding error. See [the Player Error](./errors.md) documentation for more information.

### positionUpdate

_payload type_: `Object`

Emit information about the current position at most every seconds (also emits
every time various player events are received).

The object emitted as the following properties:

- `position` (`Number`): The current position in the video, in seconds.

- `duration` (`Number`): The duration of the content.

- `bufferGap` (`Number`): The gap, in seconds, between the current
  position and the end of the current buffered range.

- `playbackRate` (`Number`): The current playback rate the content is on.

- `liveGap` (`Number|undefined`): Only for live contents. The gap between
  the current position and the "live edge".

- `maximumBufferTime` (`Number|undefined`): The maximum time until which
  the buffer can currently be filled. That is:

  - for static contents (like VoD), the duration.

  - for dynamic contents (like live contents), the current maximum available
    position (live edge for live contents) minus a security margin we added to
    avoid buffering ahead of it.

- `wallClockTime` (`Number|undefined`): Only for live contents. The
  current time converted to wall-clock time in seconds.
  That is the real live position (and not the position as announced by the
  video element).

### seeking

Emitted when a "seek" operation (to "move"/"skip" to another position) begins
on the currently loaded content.

### seeked

Emitted when a "seek" operation (to "move"/"skip" to another position) on the
currently loaded content has finished

## Track selection events

This chapter describes events linked to the current audio, video or text track.

### availableAudioTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available audio tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available audio track:

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setAudioTrack`.

- `language` (`string`): The language the audio track is in, as set in
  the [Manifest](../glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `audioDescription` (`Boolean`): Whether the track is an audio
  description of what is happening at the screen.

- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a
  "dub", meaning it was recorded in another language than the original.
  If set to `false`, we know that this audio track is in an original language.
  This property is `undefined` if we do not known whether it is in an original
  language.

This event only concerns the currently-playing Period.

### availableVideoTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available video tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available video track:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setVideoTrack`.

- `active` (`Boolean`): Whether this track is the one currently
  active or not.

- `representations` (`Array.<Object>`):
  [Representations](../glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type
    format.

  - `frameRate` (`string|undefined`): The video framerate.

This event only concerns the currently-playing Period.

### availableTextTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available text tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available text track:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setTextTrack`.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

This event only concerns the currently-playing Period.

### audioTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:

- `id` (`Number|string`): The id used to identify the track.
- `language` (`string`): The language the audio track is in.
- `audioDescription` (`Boolean`): Whether the track is an audio
  description of what is happening at the screen.
- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a
  "dub", meaning it was recorded in another language than the original.
  If set to `false`, we know that this audio track is in an original language.
  This property is `undefined` if we do not known whether it is in an original
  language.

This event only concerns the currently-playing Period.

### textTrackChange

_payload type_: `Object|null`

Information about the current text track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:

- `id` (`Number|string`): The id used to identify the track.
- `language` (`string`): The language the text track is in.
- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

This event only concerns the currently-playing Period.

### videoTrackChange

_payload type_: `Object|null`

Information about the current video track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:

- `id` (`string`): The id used to identify the track. Use it for setting
  the track via `setVideoTrack`.

- `representations` (`Array.<Object>`):
  [Representations](../glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per
    seconds.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type
    format.

  - `frameRate` (`string|undefined`): The video framerate.

A `null` payload means that video track has been disabled.

This event only concerns the currently-playing Period.

:::caution

In _DirectFile_ mode, a `null` payload may be received even if the
video track is still visually active.
This seems due to difficult-to-detect browser bugs. We recommend not disabling
video track when in directfile mode to avoid that case (this is documented
in the corresponding APIs).

:::

## Bitrate selection events

This chapter describes events linked to audio and/or video bitrates and quality.

### availableAudioBitratesChange

_payload type_: `Array.<Number>`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered when the currently available audio bitrates change (e.g.: at the
beginning of the content, when switching the current audio track, when period
changes...).

The payload is an array of the different bitrates available, in bits per
seconds.

This event only concerns the currently-playing Period.

### availableVideoBitratesChange

_payload type_: `Array.<Number>`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered when the currently available video bitrates change (e.g.: at the
beginning of the content, when switching the current video track, when period
changes...).

The payload is an array of the different bitrates available, in bits per
seconds.

This event only concerns the currently-playing Period.

### audioBitrateChange

_payload type_: `Number`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

The payload is the new audio bitrate, in bits per seconds. It is emitted every
time it changes (based on the last received segment).

`-1` when the bitrate is not known.

This event only concerns the currently-playing Period.

### videoBitrateChange

_payload type_: `Number`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

The payload is the new video bitrate, in bits per seconds. It is emitted every
time it changes (based on the last received segment).

`-1` when the bitrate is not known.

This event only concerns the currently-playing Period.

### bitrateEstimationChange

_payload type_: `Object`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Information about the last bitrate estimation performed, by type of buffer
(`audio`, `video` etc.).

Note that this event is sent only if the corresponding buffer type has multiple
[Representations](../glossary.md#representation) for the given content (as bitrate
estimations are only useful in that case).

The payload is an object with the following properties:

- `type` (`string`): The buffer type

- `bitrate` (`Number`): The last estimated bandwidth for this buffer type,
  in bits per seconds.
  This bitrate is smoothed by doing a (complex) mean on an extended period of
  time, so it often does not link directly to the current calculated bitrate.

## Playback information

This chapter describes events describing miscellaneous information about the
current content.

### periodChange

_payload type_: `Object`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered when the current [Period](../glossary.md#period) being seen changes.

The payload is the corresponding Period. See [the Manifest documentation](./additional_ressources/manifest.md#period) for more information.

### decipherabilityUpdate

_payload type_: `Array.<Object>`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered when a or multiple Representation's decipherability status were
updated. Which means either:

- A Representation is found to be undecipherable (e.g. the key or license
  request is refused)
- A Representation is found to be decipherable
- A Representation's decipherability becomes undefined

At this time, this event is only triggered if:

- the current content is an encrypted content
- Either the `fallbackOnLastTry` property was set to `true` on a rejected
  `getLicense` call or one of the `fallbackOn` properties was set to true in
  the `keySystems` loadVideo option.

Following this event, the RxPlayer might remove from the current buffers any
data linked to undecipherable Representation(s) (the video might twitch a little
or reload) and update the list of available bitrates.

The payload of this event is an Array of objects, each representating a
Representation whose decipherability's status has been updated.

Each of those objects have the following properties:

- `representation`: The Representation concerned (more information on its
  structure [in the Manifest documentation](../additional_ressources/manifest.md#structure-of-a-representation-object)).
- `adaptation`: The Adaptation linked to that Representation (more information
  on its structure [in the Manifest documentation](../additional_ressources/manifest.md#structure-of-an-adaptation-object)).
- `period`: The Period linked to that Representation (more information on its
  structure [in the Manifest documentation](../additional_ressources/manifest.md#structure-of-an-adaptation-object)).
- `manifest`: The current Manifest (more information on its structure [in the
  Manifest documentation](../additional_ressources/manifest.md#structure-of-a-manifest-object)).

You can then know if any of those Representations are becoming decipherable or
not through their `decipherable` property.

### streamEvent

_payload type_: `Object`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Event triggered when the player enters the time boundaries of a "stream event".

"Stream events" are metadata that can be defined in various streaming protocols,
which indicates that an application should trigger some action when a specific
time is reached in the content.

Those events can either have only a start time or both a start time and an end
time:

- in the case where an event only has a start time, the RxPlayer will trigger
  a `streamEvent` right when the user reaches that time.

  If we return multiple time at that position (for example, when a user seeks
  back to it), you will receive a `streamEvent` as many times for that same
  event.

- in the case where an event has both a start and end time, the RxPlayer will
  trigger a `streamEvent` when the current position goes inside these time
  boundaries (between the start and end time).
  This can happen while reaching the start during regular playback but also
  when seeking at a position contained between the start and end time.

  The `streamEvent` event will not be re-sent until the current position
  "exits" those time boundaries. If the current position goes out of the
  boundaries of that event and then goes into it again (most likely due to the
  user seeking back into it), you will again receive a `streamEvent` for that
  same event.

The payload of a `streamEvent` depends on the source of the event. For example,
it will not have the same format when it comes from a Manifest than when it
comes from the media container.
All possible formats are described in the [stream event tutorial](../tutorials/listen_stream_events.md).

Note: When an event has both a start and an end time, you can define a `onExit`
callback on the payload. That callback will automatically be triggered when the
current position goes after the end time or before the start time of that event.
The `onExit` callback will only be called a single time at most and will only
concern this iteration of the event (and not possible subsequent ones).

### streamEventSkip

_payload type_: `Object`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Event triggered when the player skipped the time boundaries of a "stream event"
(you can refer to the [`streamEvent`](#streamevent) event for a
definition of what a "stream event" is).

This means that the current position the player plays at, immediately changed
from a time before the start time of a "stream event" to after its end time (or
just after its end time for "stream event" without an end time).

This is most likely due to the user seeking in the content. A "regular" content
playback which continuously plays the content without seeking shouldn't trigger
any `streamEventSkip` event.

The payload of a `streamEventSkip` is the same than for a `streamEvent` and as
such depends on the source of the event.
All possible formats are described in the [stream event tutorial](../tutorials/listen_stream_events.md).

Note that unlike `streamEvent` events, there's no point to define an `onExit`
callback on the payload of a `streamEventSkip` event. This is because this event
was not entered, and will thus not be exited.

## Deprecated

The following events are deprecated. They are still supported but we advise
users to not use those as they might become not supported in the future.

### imageTrackUpdate

:::caution
This event is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../additional_ressources/deprecated.md)).
:::

_payload type_: `Object`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered each time the current image playlist changes (has new images).

Has the following property in its payload:
_data_ (`Array.<Object>`): Every image data.

Each image has a structure as defined in the [Images structure page](./images.md).

### fullscreenChange

:::caution
This event is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../additional_ressources/deprecated.md)).
:::

_payload type_: `Boolean`

Triggered each time the video player goes/exits fullscreen mode.

The payload is `true` if the player entered fullscreen, `false` if it exited
it.

### nativeTextTracksChange

:::caution
This event is deprecated, it will disappear in the next major
release `v4.0.0` (see [Deprecated APIs](../additional_ressources/deprecated.md)).
:::

_payload type_: `Array.<TextTrackElement>`

:::caution
This event is not sent in _DirectFile_ mode (see [loadVideo options](./basicMethods/loadVideo.md#transport)).
:::

Triggered each times a new `<track>` element is removed or added to the video
element.

The payload is the array of `TextTrack` elements. The RxPlayer will only set
a single `<track>` when a text track is set.
