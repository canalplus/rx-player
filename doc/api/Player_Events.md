# Player events

## Overview

To communicate about events (like an error or the update of the current video bitrate) the
player use the event listener pattern.

As [documented in the API](./Basic_Methods/addEventListener.md), you can call
`addEventListener` to register a callback for a particular event, like:

```js
player.addEventListener("playerStateChange", (newState) => {
  console.log("the RxPlayer's state changed to:", newState);
});
```

You can unregister a callback through the `removeEventListener` API, documented
[here](./Basic_Methods/removeEventListener.md).

## Basic events

This chapter describes the most important events sent by the player.

### playerStateChange

_payload type_: `string`

Emit the current state of the player, every time it changes.

This is the event to catch if you want to know when the player is playing, is paused, is
rebuffering, is ended or is stopped.

As it is a central part of our API and can be difficult concept to understand, we have a
special [page of documentation on player states](./Player_States.md).

### error

_payload type_: `Error`

Triggered when a fatal error happened.

A fatal error is an error that led the player to stop playing the current content.

The payload is the corresponding error. See [the Player Error](./Player_Errors.md)
documentation for more information.

### warning

_payload type_: `Error`

Triggered each time a minor error happened.

This error won't lead the RxPlayer to stop the content. It can for example be an HTTP
request error, some minor error detected in the content or the current position being to
far below the minimum playable position.

The payload is the corresponding error. See [the Player Error](./Player_Errors.md)
documentation for more information.

### positionUpdate

_payload type_: `Object`

Emit information about the current position at most every seconds (also emits every time
various player events are received).

The object emitted as the following properties:

- `position` (`Number`): The current position in the video, in seconds.

- `duration` (`Number`): The duration of the content.

- `bufferGap` (`Number`): The gap, in seconds, between the current position and the end of
  the current buffered range.

- `playbackRate` (`Number`): The current playback rate the content is on.

- `liveGap` (`Number|undefined`): Only for live contents. The gap between the current
  position and the "live edge". Might not be set for `directfile` contents.

- `maximumPosition` (`Number|undefined`): The maximum time until which the buffer can
  currently be filled. That is:

  - for static contents (like VoD), the duration.

  - for dynamic contents (like live contents), the current maximum available position
    (live edge for live contents) minus a security margin we added to avoid buffering
    ahead of it.

- `wallClockTime` (`Number|undefined`): Only for live contents. The current time converted
  to wall-clock time in seconds. That is the real live position (and not the position as
  announced by the video element).

### play

Emitted when the `RxPlayer`'s `videoElement` is no longer considered paused.

This event is generally triggered when and if the [`play`](./Basic_Methods/play.md) method
has succeeded.

Note that this event can be sent even if the [player's state](./Player_States.md) doesn't
currently allow playback, for example when in the `"LOADING"` or `"BUFFERING"` states,
among other. It shouldn't be sent however when the player's state is `"STOPPED"` which is
when no content is loading nor loaded.

### pause

Emitted when the `RxPlayer`'s `videoElement` is now considered paused.

This event is triggered when and if the [`pause`](./Basic_Methods/play.md) method has
succeeded, when the content has ended or due to other rare occurences: for example if we
could not automatically play after a `"LOADING"` or `"RELOADING"` state due to
[the browser's autoplay policies](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide).

Note that this event can be sent even if the [player's state](./Player_States.md) doesn't
currently allow playback, for example when in the `"LOADING"` or `"BUFFERING"` states,
among other. It shouldn't be sent however when the player's state is `"STOPPED"` which is
when no content is loading nor loaded.

### seeking

Emitted when a "seek" operation (to "move"/"skip" to another position) begins on the
currently loaded content.

### seeked

Emitted when a "seek" operation (to "move"/"skip" to another position) on the currently
loaded content has finished

## Track selection events

This chapter describes events linked to the current audio, video or text track.

### availableAudioTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available audio tracks might have changed (e.g.: at the
beginning of the content, when period changes...) for the currently-playing Period.

_The event might also rarely be emitted even if the list of available audio tracks did not
really change - as the RxPlayer might send it in situations where there's a chance it had
without thoroughly checking it._

The array emitted contains object describing each available audio track:

- `active` (`Boolean`): Whether the track is the one currently active or not.

- `id` (`string`): The id used to identify the track. Use it for setting the track via
  `setAudioTrack`.

- `language` (`string`): The language the audio track is in, as set in the
  [Manifest](../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2
  language codes). If the translation attempt fails (no corresponding ISO 639-3 language
  code is found), it will equal the value of `language`

- `audioDescription` (`Boolean`): Whether the track is an audio description of what is
  happening at the screen.

- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a "dub", meaning it
  was recorded in another language than the original. If set to `false`, we know that this
  audio track is in an original language. This property is `undefined` if we do not known
  whether it is in an original language.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation. No other Representation
    from this track will have the same `id`.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

  - `codec` (`string|undefined`): The audio codec the Representation is in, as announced
    in the corresponding Manifest.

  - `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation has
    spatial audio.

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

    `undefined` (or not set) if support of that Representation is unknown or if does not
    make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered
    (in the eventuality it had DRM-related protection).

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

  - `contentProtections` (`Object|undefined`): Encryption information linked to this
    Representation.

    If set to an Object, the Representation is known to be encrypted. If unset or set to
    `undefined` the Representation is either unencrypted or we don't know if it is.

    When set to an object, it may contain the following properties:

    - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
      Representation.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

### availableVideoTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available video tracks might change (e.g.: at the beginning
of the content, when period changes...) for the currently-playing Period.

_The event might also rarely be emitted even if the list of available video tracks did not
really change - as the RxPlayer might send it in situations where there's a chance it had
without thoroughly checking it._

The array emitted contains object describing each available video track:

- `id` (`string`): The id used to identify the track. Use it for setting the track via
  `setVideoTrack`.

- `active` (`Boolean`): Whether this track is the one currently active or not.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type format.

  - `frameRate` (`number|undefined`): The video framerate.

  - `hdrInfo` (`Object|undefined`) Information about the hdr characteristics of the track.
    (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

    `undefined` (or not set) if support of that Representation is unknown or if does not
    make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered
    (in the eventuality it had DRM-related protection).

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

  - `contentProtections` (`Object|undefined`): Encryption information linked to this
    Representation.

    If set to an Object, the Representation is known to be encrypted. If unset or set to
    `undefined` the Representation is either unencrypted or we don't know if it is.

    When set to an object, it may contain the following properties:

    - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
      Representation.

- `signInterpreted` (`Boolean`): Whether the track contains sign interpretation.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

### availableTextTracksChange

_payload type_: `Array.<Object>`

Triggered when the currently available text tracks might change (e.g.: at the beginning of
the content, when period changes...) for the currently-playing Period.

_The event might also rarely be emitted even if the list of available text tracks did not
really change - as the RxPlayer might send it in situations where there's a chance it had
without thoroughly checking it._

The array emitted contains object describing each available text track:

- `id` (`string`): The id used to identify the track. Use it for setting the track via
  `setTextTrack`.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2
  language codes). If the translation attempt fails (no corresponding ISO 639-3 language
  code is found), it will equal the value of `language`

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

- `closedCaption` (`Boolean`): Whether the track is specially adapted for the hard of
  hearing or not.

- `forced` (`Boolean`): If `true` this text track is meant to be displayed by default if
  no other text track is selected.

  It is often used to clarify dialogue, alternate languages, texted graphics or location
  and person identification.

- `active` (`Boolean`): Whether the track is the one currently active or not.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

### audioTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the currently-playing
[Period](../Getting_Started/Glossary.md).

The payload is an object describing the new track, with the following properties:

- `id` (`string`): The id used to identify the track.
- `language` (`string`): The language the audio track is in.
- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2
  language codes). If the translation attempt fails (no corresponding ISO 639-3 language
  code is found), it will equal the value of `language`
- `audioDescription` (`Boolean`): Whether the track is an audio description of what is
  happening at the screen.
- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a "dub", meaning it
  was recorded in another language than the original. If set to `false`, we know that this
  audio track is in an original language. This property is `undefined` if we do not known
  whether it is in an original language.
- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation. No other Representation
    from this track will have the same `id`.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

  - `codec` (`string|undefined`): The audio codec the Representation is in, as announced
    in the corresponding Manifest.

  - `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation has
    spatial audio.

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

    `undefined` (or not set) if support of that Representation is unknown or if does not
    make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered
    (in the eventuality it had DRM-related protection).

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

  - `contentProtections` (`Object|undefined`): Encryption information linked to this
    Representation.

    If set to an Object, the Representation is known to be encrypted. If unset or set to
    `undefined` the Representation is either unencrypted or we don't know if it is.

    When set to an object, it may contain the following properties:

    - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
      Representation.

This event only concerns the currently-playing Period. This event only concerns the
currently-playing [Period](../Getting_Started/Glossary.md).

### textTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the currently-playing
[Period](../Getting_Started/Glossary.md).

The payload is an object describing the new track, with the following properties:

- `id` (`string`): The id used to identify the track.

- `language` (`string`): The language the text track is in.

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2
  language codes). If the translation attempt fails (no corresponding ISO 639-3 language
  code is found), it will equal the value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for the hard of
  hearing or not.

- `forced` (`Boolean`): If `true` this text track is meant to be displayed by default if
  no other text track is selected.

  It is often used to clarify dialogue, alternate languages, texted graphics or location
  and person identification.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

### videoTrackChange

_payload type_: `Object|null`

Information about the current audio track, each time it changes for the currently-playing
[Period](../Getting_Started/Glossary.md).

Information about the current video track, each time it changes (the last received segment
got a new one).

The payload is an object describing the new track, with the following properties:

- `id` (`string`): The id used to identify the track. Use it for setting the track via
  `setVideoTrack`.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The codec given in standard MIME type format.

  - `frameRate` (`number|undefined`): The video framerate.

  - `hdrInfo` (`Object|undefined`) Information about the hdr characteristics of the track.
    (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

    `undefined` (or not set) if support of that Representation is unknown or if does not
    make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered
    (in the eventuality it had DRM-related protection).

    Note that because elements of the `representations` array only contains playable
    Representation, this value here cannot be set to `false` when in this array.

  - `contentProtections` (`Object|undefined`): Encryption information linked to this
    Representation.

    If set to an Object, the Representation is known to be encrypted. If unset or set to
    `undefined` the Representation is either unencrypted or we don't know if it is.

    When set to an object, it may contain the following properties:

    - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
      Representation.

- `isTrickModeTrack` (`Boolean|undefined`): If set to `true`, this track is a trick mode
  track. This type of tracks proposes video content that is often encoded with a very low
  framerate with the purpose to be played more efficiently at a much higher speed.

  To enter or exit a mode where trickmode tracks are used instead of regular non-trickmode
  ones, you can use the `setPlaybackRate` function.

- `trickModeTracks` (`Object | undefined`): Trick mode video tracks attached to this video
  track.

  Each of those objects contain the same properties that a regular video track (same
  properties than what is documented here).

  It this property is either `undefined` or not set, then this track has no linked
  trickmode video track.

- `signInterpreted` (`Boolean`): Whether the track contains sign interpretation.

A `null` payload means that video track has been disabled.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

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

This chapter describes events linked to the current audio, video or Representation /
quality.

### videoRepresentationChange

_payload type_: `Object|null`

Emitted when the current video Representation being considered by the RxPlayer changes.

The payload is an object describing this new Representation, with the following
properties:

- `id` (`string`): The id used to identify this Representation.

- `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per seconds.

  `undefined` if unknown.

- `width` (`Number|undefined`): The width of video, in pixels.

- `height` (`Number|undefined`): The height of video, in pixels.

- `codec` (`string|undefined`): The codec of the Representation.

- `frameRate` (`number|undefined`): The video framerate.

- `hdrInfo` (`Object|undefined`) Information about the hdr characteristics of the track.
  (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

- `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that Representation
  is supported by the current platform.

  Note that because elements of the `representations` array only contains playable
  Representation, this value here cannot be set to `false` when in this array.

  `undefined` (or not set) if support of that Representation is unknown or if does not
  make sense here.

- `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered (in
  the eventuality it had DRM-related protection).

  Note that because elements of the `representations` array only contains playable
  Representation, this value here cannot be set to `false` when in this array.

- `contentProtections` (`Object|undefined`): Encryption information linked to this
  Representation.

  If set to an Object, the Representation is known to be encrypted. If unset or set to
  `undefined` the Representation is either unencrypted or we don't know if it is.

  When set to an object, it may contain the following properties:

  - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
    Representation.

A `null` payload means that no video track is available now.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### audioRepresentationChange

_payload type_: `Object|null`

Emitted when the current audio Representation being considered by the RxPlayer changes.

The payload is an object describing the new Representation, with the following properties:

- `id` (`string`): The id used to identify this Representation.

- `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per seconds.

- `codec` (`string|undefined`): The codec of the representation

- `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation has
  spatial audio.

- `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that Representation
  is supported by the current platform.

  Note that because elements of the `representations` array only contains playable
  Representation, this value here cannot be set to `false` when in this array.

  `undefined` (or not set) if support of that Representation is unknown or if does not
  make sense here.

- `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered (in
  the eventuality it had DRM-related protection).

  Note that because elements of the `representations` array only contains playable
  Representation, this value here cannot be set to `false` when in this array.

- `contentProtections` (`Object|undefined`): Encryption information linked to this
  Representation.

  If set to an Object, the Representation is known to be encrypted. If unset or set to
  `undefined` the Representation is either unencrypted or we don't know if it is.

  When set to an object, it may contain the following properties:

  - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
    Representation.

This event only concerns the currently-playing [Period](../Getting_Started/Glossary.md).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

## Playback information

This chapter describes events describing miscellaneous information about the current
content.

### periodChange

_payload type_: `Object`

Triggered when the current [Period](../Getting_Started/Glossary.md#period) being seen
changes.

The payload of this event is an object containing the following properties:

- `start` (`number`): The starting position at which the Period starts, in seconds.

- `end` (`number|undefined`): The position at which the Period ends, in seconds.

  `undefined` either if not known or if the Period has no end yet (e.g. for live contents,
  the end might not be known for now).

- `id` (`string`): `id` of the Period, allowing to call track and Representation selection
  APIs (such as `setAudioTrack` and `lockVideoRepresentations` for example) even when the
  Period changes.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### newAvailablePeriods

_payload type_: `Array.<Object>`

This event is triggered when one or multiple new
[Periods](../Getting_Started/Glossary.md#period) start to be considered by the RxPlayer in
the current content.

This event mainly allows to choose the text, audio and/or video tracks as well as the
audio and/or video Representations to select for those Period(s).

This event is first sent once the content is first loaded and then may be triggered gain
everytime the RxPlayer is considering another `Period` of the content.

The payload of this event is an array of object, each describing a single Period in
chronological order. Those objects all contain the following properties:

- `start` (`number`): The starting position at which the Period starts, in seconds.

- `end` (`number|undefined`): The position at which the Period ends, in seconds.

  `undefined` either if not known or if the Period has no end yet (e.g. for live contents,
  the end might not be known for now).

- `id` (`string`): `id` for this Period, allowing to call track and Representation
  selection APIs (such as `setAudioTrack` and `lockVideoRepresentations` for example) even
  if that Period is not currently playing.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### trackUpdate

_payload type_: `Object`

Event triggered if a video, audio or text track chosen for any
[Period](../Getting_Started/Glossary.md#period) is changed by the RxPlayer.

This event is triggered just after the track is updated but before any of the
corresponding data is actually loaded, thus allowing you to edit track or Representations
settings before the RxPlayer can continue.

However keep in mind that this event is not triggered for the initial default track choice
made by the RxPlayer. If you want to react to this event instead, you can rely on the
`newAvailablePeriods` event.

Cases where the track changes include:

- when the application updates a track manually (for example through a `setAudioTrack`
  call)

- when it had to be done as a side-effect of another API (for example after enabling
  trickmode video tracks through a `setPlaybackRate` call)

- or in the extremely rare situation where the RxPlayer had to do it by itself
  automatically (one situation would be when a refreshed content's Manifest removes the
  previously-chosen track. There, the RxPlayer will send the `trackUpdate` event and - if
  no new track is chosen since - will automatically switch to that track so playback can
  continue).

The payload for this event is an object with the following properties:

- `trackType` (`string`): The type of track concerned. Can for example be `audio` for an
  audio track, `video` for a video track or `text` for a text track.

- `period` (`Object`): Information about the concerned
  [Period](../Getting_Started/Glossary.md#period). This object contains as properties:

  - `start` (`number`): The starting position at which the Period starts, in seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for live
    contents, the end might not be known for now).

  - `id` (`string`): `id` of the Period, allowing to call track and Representation
    selection APIs (such as `setAudioTrack` and `lockVideoRepresentations` for example)
    even when the Period changes.

- `reason` (`string`): The reason for the track update. For now, it can be set to:

  - `"manual"`: the track was updated because the application called a method to directly
    update it.

    This event is the direct consequence of calling `setAudioTrack`, `setTextTrack`,
    `setVideoTrack`, `disableTextTrack` or `disableVideoTrack`, so it corresponds to track
    updates you should already be aware of.

  - `"trickmode-enabled"`: The track is being updated because the application wanted to
    enable video trickmode tracks (usually by setting the `preferTrickModeTracks` option
    of the `setPlaybackRate` method to `true`).

  - `"trickmode-disabled"`: The track is being updated because the application wanted to
    disable video trickmode tracks (usually by setting the `preferTrickModeTracks` option
    of the `setPlaybackRate` method to `false`).

  - `"missing"` the previously-chosen track was missing from the content's refreshed
    Manifest.

  - `"no-playable-representation"`: the previously-chosen track had none of its
    `Representation` playable, most likely because of decipherability issues and thus the
    RxPlayer decided to switch to a new track.

  Though other reasons may be added in the future (for future reasons not covered by those
  values), so you should expect this possibility in your application's logic.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### representationListUpdate

_payload type_: `Object`

Event triggered if the list of available
[`Representation`](../Getting_Started/Glossary.md#representation) linked to the
currently-chosen video, audio or text track for any
[Period](../Getting_Started/Glossary.md#period) (for example inspectable through the
`representations` property of audio and video track objects) may have changed compared to
what it was before.

Note that you won't receive a `representationListUpdate` event the initial time the
corresponding track is selected, it is only sent when its linked list of available
`Representation`s might have dynamically changed during playback. For now, this may only
happen if at least one of the Representation in the chosen track became undecipherable (in
which case it is not available anymore) or decipherable (in which case it becomes
available again).

The main point of this event is to let you adjust your tracks and Representations choice
when they depend on the list of available Representation.

The payload for this event is an object with the following properties:

- `trackType` (`string`): The type of track concerned. Can for example be `audio` for an
  audio track, `video` for a video track or `text` for a text track.

- `period` (`Object`): Information about the concerned
  [Period](../Getting_Started/Glossary.md#period). This object contains as properties:

  - `start` (`number`): The starting position at which the Period starts, in seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for live
    contents, the end might not be known for now).

  - `id` (`string`): `id` of the Period, allowing to call track and Representation
    selection APIs (such as `setAudioTrack` and `lockVideoRepresentations` for example)
    even when the Period changes.

- `reason` (`string`): The reason for the update. For now, it can be set to:

  - `"decipherability-update"`: The list of available `Representation`s is being updated
    either because at least one of that track's `Representation` became undecipherable or
    because it became decipherable again.

  Though other reasons may be added in the future (for future reasons not covered by those
  values), so you should expect this possibility in your application's logic.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### brokenRepresentationsLock

_payload type_: `Object`

Fairly rare event triggered if representations locked through Representations selection
API such as `lockVideoRepresentations` or `lockAudioRepresentations` all became unplayable
(most likely linked to encryption reasons), in which case, the RxPlayer "broke" that lock,
i.e. it decided to remove that lock and play all Representations instead.

This event is sent strictly before the RxPlayer had the chance to actually load those
other Representations. You can thus profit from this event by synchronously locking
Representations you wish to play and thus avoid playing the others.

The payload for this event is an object with the following properties:

- `period` (`Object`): Information about the concerned
  [Period](../Getting_Started/Glossary.md#period). This object contains as properties:

  - `start` (`number`): The starting position at which the Period starts, in seconds.

  - `end` (`number|undefined`): The position at which the Period ends, in seconds.

    `undefined` either if not known or if the Period has no end yet (e.g. for live
    contents, the end might not be known for now).

  - `id` (`string`): `id` of the Period, allowing to call track and Representation
    selection APIs (such as `setAudioTrack` and `lockVideoRepresentations` for example)
    even when the Period changes.

- `trackType` (`string`): The type of track concerned. Can for example be `audio` for
  audio Representations or `video` for video Representations.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### inbandEvents

_payload type_: `Object`

Event triggered when the player encounters inband events in the stream. These events are
included in the loaded and parsed chunks, and are often used to carry content metadata.

Each event contains :

- type (_type_: `String`) : defines the type of the event, specific to an inband event
  from a streaming protocol.
- value (_type_: `Object`) : the actual parsed content of the event.

The supported inband event types are :

- "emsg" : The emsg (Event message box) provides inband signaling for generic or MPEG-DASH
  specific events. One ISOBMFF media segment may contain one or several boxes. The parsed
  event contains :

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

"Stream events" are metadata that can be defined in various streaming protocols, which
indicates that an application should trigger some action when a specific time is reached
in the content.

Those events can either have only a start time or both a start time and an end time:

- in the case where an event only has a start time, the RxPlayer will trigger a
  `streamEvent` right when the user reaches that time.

  If we return multiple time at that position (for example, when a user seeks back to it),
  you will receive a `streamEvent` as many times for that same event.

- in the case where an event has both a start and end time, the RxPlayer will trigger a
  `streamEvent` when the current position goes inside these time boundaries (between the
  start and end time). This can happen while reaching the start during regular playback
  but also when seeking at a position contained between the start and end time.

  The `streamEvent` event will not be re-sent until the current position "exits" those
  time boundaries. If the current position goes out of the boundaries of that event and
  then goes into it again (most likely due to the user seeking back into it), you will
  again receive a `streamEvent` for that same event.

The payload of a `streamEvent` depends on the source of the event. For example, it will
not have the same format when it comes from a Manifest than when it comes from the media
container. All possible formats are described in the
[stream event tutorial](../Getting_Started/Tutorials/EventStream_Handling.md).

Note: When an event has both a start and an end time, you can define a `onExit` callback
on the payload. That callback will automatically be triggered when the current position
goes after the end time or before the start time of that event. The `onExit` callback will
only be called a single time at most and will only concern this iteration of the event
(and not possible subsequent ones).

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### streamEventSkip

_payload type_: `Object`

Event triggered when the player skipped the time boundaries of a "stream event" (you can
refer to the [`streamEvent`](#streamevent) event for a definition of what a "stream event"
is).

This means that the current position the player plays at, immediately changed from a time
before the start time of a "stream event" to after its end time (or just after its end
time for "stream event" without an end time).

This is most likely due to the user seeking in the content. A "regular" content playback
which continuously plays the content without seeking shouldn't trigger any
`streamEventSkip` event.

The payload of a `streamEventSkip` is the same than for a `streamEvent` and as such
depends on the source of the event. All possible formats are described in the
[stream event tutorial](../Getting_Started/Tutorials/EventStream_Handling.md).

Note that unlike `streamEvent` events, there's no point to define an `onExit` callback on
the payload of a `streamEventSkip` event. This is because this event was not entered, and
will thus not be exited.

<div class="warning">
This event is not sent in <i>DirectFile</i> mode (see
<a href="./Loading_a_Content.md#transport">transport option</a>)
</div>

### volumeChange

_payload type_: `Object`

Notify about a change of audio volume and/or of muted status.

The sent payload contains the following properties:

- `volume` (`number`): The currently set audio volume from `0` (silent) to `1` (the
  loudest).

- `muted` (`boolean`): If `true`, the media element is currently muted (e.g. through the
  `mute` RxPlayer method), meaning that audio will be silent even if a volume higher than
  `0` is set. You can remove the `muted` status by calling the `unMute` RxPlayer method.
