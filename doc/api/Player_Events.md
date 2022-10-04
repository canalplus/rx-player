# Player events

## Overview

To communicate about events (like an error or the update of the current video
bitrate) the player use the event listener pattern.

As [documented in the API](./Basic_Methods/addEventListener.md), you can call
`addEventListener` to register a callback for a particular event, like:

```js
player.addEventListener("playerStateChange", (newState) => {
  console.log("the RxPlayer's state changed to:", newState);
});
```

You can unregister a callback through the `removeEventListener` API,
documented [here](./Basic_Methods/removeEventListener.md).

## Basic events

This chapter describes the most important events sent by the player.

### playerStateChange

_payload type_: `string`

Emit the current state of the player, every time it changes.

This is the event to catch if you want to know when the player is playing, is
paused, is rebuffering, is ended or is stopped.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](./Player_States.md).

### error

_payload type_: `Error`

Triggered when a fatal error happened.

A fatal error is an error that led the player to stop playing the current
content.

The payload is the corresponding error. See [the Player
Error](./Player_Errors.md) documentation for more information.

### warning

_payload type_: `Error`

Triggered each time a minor error happened.

This error won't lead the RxPlayer to stop the content. It can for example be
an HTTP request error, some minor error detected in the content or the current
position being to far below the minimum playable position.

The payload is the corresponding error. See [the Player
Error](./Player_Errors.md) documentation for more information.

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
  Might not be set for `directfile` contents.

- `maximumPosition` (`Number|undefined`): The maximum time until which
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

Triggered when the currently available audio tracks might have changed (e.g.: at
the beginning of the content, when period changes...) for the currently-playing
Period.

_The event might also rarely be emitted even if the list of available audio
tracks did not really change - as the RxPlayer might send it in situations where
there's a chance it had without thoroughly checking it._

The array emitted contains object describing each available audio track:

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setAudioTrack`.

- `language` (`string`): The language the audio track is in, as set in
  the [Manifest](../Getting_Started/Glossary.md#manifest).

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

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):

  Array listing the available audio Representations linked to this audio track.
  Each object describing a single Representation, with the following properties:
    - `id` (`string`): The id used to identify this Representation.

    - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
      per seconds.

    - `codec` (`string|undefined`): The codec of the representation

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

### availableVideoTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available video tracks might change (e.g.: at the
beginning of the content, when period changes...) for the currently-playing
Period.

_The event might also rarely be emitted even if the list of available video
tracks did not really change - as the RxPlayer might send it in situations where
there's a chance it had without thoroughly checking it._

The array emitted contains object describing each available video track:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setVideoTrack`.

- `active` (`Boolean`): Whether this track is the one currently
  active or not.

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
    per seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type
    format.

  - `frameRate` (`number|undefined`): The video framerate.

- `signInterpreted` (`Boolean`): Whether the track contains sign interpretation.

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

### availableTextTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available text tracks might change (e.g.: at the
beginning of the content, when period changes...) for the currently-playing
Period.

_The event might also rarely be emitted even if the list of available text
tracks did not really change - as the RxPlayer might send it in situations where
there's a chance it had without thoroughly checking it._

The array emitted contains object describing each available text track:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setTextTrack`.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

- `forced` (`Boolean`): If `true` this text track is meant to be displayed by
  default if no other text track is selected.

  It is often used to clarify dialogue, alternate languages, texted graphics or
  location and person identification.

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

### audioTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the
currently-playing [Period](../Getting_Started/Glossary.md).

The payload is an object describing the new track, with the following
properties:

- `id` (`string`): The id used to identify the track.
- `language` (`string`): The language the audio track is in.
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
- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.
- `representations` (`Array.<Object>`):

  Array listing the available audio Representations linked to this audio track.
  Each object describing a single Representation, with the following properties:
    - `id` (`string`): The id used to identify this Representation.

    - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
      per seconds.

    - `codec` (`string|undefined`): The codec of the representation

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

### textTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the
currently-playing [Period](../Getting_Started/Glossary.md).

The payload is an object describing the new track, with the following
properties:

- `id` (`string`): The id used to identify the track.

- `language` (`string`): The language the text track is in.

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

- `forced` (`Boolean`): If `true` this text track is meant to be displayed by
  default if no other text track is selected.

  It is often used to clarify dialogue, alternate languages, texted graphics or
  location and person identification.

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

### videoTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the
currently-playing [Period](../Getting_Started/Glossary.md).

Information about the current video track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:

- `id` (`string`): The id used to identify the track. Use it for setting
  the track via `setVideoTrack`.

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
    per seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type
    format.

  - `frameRate` (`number|undefined`): The video framerate.

- `isTrickModeTrack` (`Boolean|undefined`): If set to `true`, this track
  is a trick mode track. This type of tracks proposes video content that is
  often encoded with a very low framerate with the purpose to be played more
  efficiently at a much higher speed.

  To enter or exit a mode where trickmode tracks are used instead of regular
  non-trickmode ones, you can use the `setPlaybackRate` function.

- `trickModeTracks` (`Object | undefined`): Trick mode video tracks
  attached to this video track.

  Each of those objects contain the same properties that a regular video track
  (same properties than what is documented here).

  It this property is either `undefined` or not set, then this track has no
  linked trickmode video track.

- `signInterpreted` (`Boolean`): Whether the track contains sign interpretation.

A `null` payload means that video track has been disabled.

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

<div class="warning">
In <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>),
a `null` payload may be received even if the video track is still visually
active.
This seems due to difficult-to-detect browser bugs. We recommend not disabling
video track when in directfile mode to avoid that case (this is documented
in the corresponding APIs).
</div>


## Representation selection events

This chapter describes events linked to the current audio, video or
Representation / quality.

### videoRepresentationChange

_payload type_: `Object|null`

Emitted when the current video Representation being considered by the RxPlayer
changes.

The payload is an object describing this new Representation, with the following
properties:
  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
    per seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec of the Representation.

  - `frameRate` (`number|undefined`): The video framerate.

A `null` payload means that no video track is available now.

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### audioRepresentationChange

_payload type_: `Object|null`

Emitted when the current audio Representation being considered by the RxPlayer
changes.

The payload is an object describing the new Representation, with the following
properties:
  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits
    per seconds.

  - `codec` (`string|undefined`): The codec of the representation

This event only concerns the currently-playing
[Period](../Getting_Started/Glossary.md).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

## Playback information

This chapter describes events describing miscellaneous information about the
current content.

### periodChange

_payload type_: `Object`

Triggered when the current [Period](../Getting_Started/Glossary.md#period) being seen changes.

The payload of this event is an object containing the following properties:

  - `start` (`number`): The starting position at which the Period starts, in
    seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in
    seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for
    live contents, the end might not be known for now).

  - `id` (`string`): `id` of the Period, allowing to call track and
    Representation selection APIs (such as `setAudioTrack` and
    `lockVideoRepresentations` for example) even when the Period changes.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### newAvailablePeriods

_payload type_: `Array.<Object>`

Triggered when one or multiple
[Periods](../Getting_Started/Glossary.md#period) are made available in the
current content.

This event is first sent once the Manifest has been parsed and then may be
triggered again for dynamic contents upon Manifest refresh if new Periods are
found.

The payload of this event is an array of object, each describing a single Period
in chronological order.
Those objects all contain the following properties:

  - `start` (`number`): The starting position at which the Period starts, in
    seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in
    seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for
    live contents, the end might not be known for now).

  - `id` (`string`): `id` for this Period, allowing to call track and
    Representation selection APIs (such as `setAudioTrack` and
    `lockVideoRepresentations` for example) even if that Period is not currently
    playing.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### brokenRepresentationsLock

_payload type_: `Object`

Fairly rare event triggered if representations locked through Representations
selection API such as `lockVideoRepresentations` or `lockAudioRepresentations`
all became unplayable (most likely linked to encryption reasons), in which case,
the RxPlayer "broke" that lock, i.e. it decided to remove that lock and play all
Representations instead.

This event is sent strictly before the RxPlayer had the chance to actually load
those other Representations. You can thus profit from this event by
synchronously locking Representations you wish to play and thus avoid playing
the others.

The payload for this event is an object with the following properties:
  - `period` (`Object`): Information about the concerned
    [Period](../Getting_Started/Glossary.md#period). This object contains as
    properties:

    - `start` (`number`): The starting position at which the Period starts, in
      seconds.

    - `end` (`number|undefined`): The position at which the Period ends, in
      seconds.

      `undefined` either if not known or if the Period has no end yet (e.g. for
      live contents, the end might not be known for now).

    - `id` (`string`): `id` of the Period, allowing to call track and
      Representation selection APIs (such as `setAudioTrack` and
      `lockVideoRepresentations` for example) even when the Period changes.

  - `trackType` (`string`): The type of track concerned. Can for example be
    `audio` for audio Representations or `video` for video Representations.


<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>


### autoTrackSwitch

_payload type_: `Object`

Extremely rare event triggered if a video, audio or text track set for any
[Period](../Getting_Started/Glossary.md#period) was automatically changed by the
RxPlayer, due to an unexpected event.

For now this only happens in the extremely rare situation (it was actually never
seen, but it is possible) where a refreshed content's Manifest would remove the
previously-chosen track. There, the RxPlayer will send the `autoTrackSwitch`
event and - if no new track is chosen - will automatically switch to another
track so playback can continue.

The payload for this event is an object with the following properties:
  - `trackType` (`string`): The type of track concerned. Can for example be
    `audio` for an audio track, `video` for a video track or `text` for a text
    track.

  - `period` (`Object`): Information about the concerned
    [Period](../Getting_Started/Glossary.md#period). This object contains as
    properties:

    - `start` (`number`): The starting position at which the Period starts, in
      seconds.

    - `end` (`number|undefined`): The position at which the Period ends, in
      seconds.

      `undefined` either if not known or if the Period has no end yet (e.g. for
      live contents, the end might not be known for now).

    - `id` (`string`): `id` of the Period, allowing to call track and
      Representation selection APIs (such as `setAudioTrack` and
      `lockVideoRepresentations` for example) even when the Period changes.

  - `reason` (`string`): The reason for the automatic track switch. For now,
    can only be `"missing"` indicating that the previously chosen track was
    missing from the content's refreshed Manifest.


<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

## inbandEvents

_payload type_: `Object`

Event triggered when the player encounters inband events in the stream. These
events are included in the loaded and parsed chunks, and are often used to carry
content metadata.

Each event contains :

- type (_type_: `String`) : defines the type of the event, specific to an
  inband event from a streaming protocol.
- value (_type_: `Object`) : the actual parsed content of the event.

The supported inband event types are :

- "emsg" : The emsg (Event message box) provides inband signaling for generic
  or MPEG-DASH specific events.
  One ISOBMFF media segment may contain one or several boxes. The parsed event
  contains :

  - schemeIdUri (`String`)
  - value (`String`)
  - timescale (`Number`)
  - presentationTimeDelta (`Number`)
  - eventDuration (`Number`)
  - id (`Number`)
  - messageData (`Uint8Array`)

  These attributes are documented in the ISOBMFF specification.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### streamEvent

_payload type_: `Object`

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
All possible formats are described in the [stream event
tutorial](../Getting_Started/Tutorials/EventStream_Handling.md).

Note: When an event has both a start and an end time, you can define a `onExit`
callback on the payload. That callback will automatically be triggered when the
current position goes after the end time or before the start time of that event.
The `onExit` callback will only be called a single time at most and will only
concern this iteration of the event (and not possible subsequent ones).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### streamEventSkip

_payload type_: `Object`

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
All possible formats are described in the [stream event
tutorial](../Getting_Started/Tutorials/EventStream_Handling.md).

Note that unlike `streamEvent` events, there's no point to define an `onExit`
callback on the payload of a `streamEventSkip` event. This is because this event
was not entered, and will thus not be exited.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>
