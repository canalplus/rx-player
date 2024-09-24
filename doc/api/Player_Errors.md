# Player errors and warnings

## Overview

Various errors can be triggered when playing a media content. Those can happen when:

- The network is unreachable
- The codecs are not supported
- We have no mean to decrypt the data
- ...

Some errors can be fatal to content playback in which case they will stop the player,
others act more as warnings and are more along the line of a minor problem notification.

You can know if a fatal error interrupted your playback by:

- adding an event listener to the `"error"` event (see the
  [player events](./Player_Events.md) documentation). This event listener will take the
  error directly in argument.

- calling the `getError` API if the current state is `STOPPED`. If different from `null`,
  it means that a fatal error happened (see the documentation for
  [getError](./Basic_Methods/getError.md)).

You can also be warned of any non-fatal error by:

- adding an event listener to the `"warning"` event (see the
  [player events](./Player_Events.md) documentation). The event listener will take the
  non-fatal error directly in argument.

All of those are in essence `Error` instances with added information.

Those supplementary information are described in this page.

## Structure of an Error

Each of RxPlayer's error objects have at least those properties:

- `type` (`string`): A large category for the error (e.g. `NETWORK_ERROR`,
  `ENCRYPTED_MEDIA_ERROR` ...)

- `code` (`string`): A set identification "code" for the error encountered

- `message` (`string`): A displayable, human-readable, summary of the error.

- `fatal` (`boolean`): If true, the error was fatal. Meaning that the playback was
  interrupted by it

## Types

The types are the different strings you can have as the `type` property of an error.

This chapter provides an exhaustive list of the possible type of error encountered.

### NETWORK_ERROR

A NetworkError is any Network-related error (HTTP 404, request timeout...), they all have
a `type` property equal to `"NETWORK_ERROR"`.

#### codes

An error of `type` `NETWORK_ERROR` can only have the following code (`code` property):

- `"PIPELINE_LOAD_ERROR"`: the [Manifest](../Getting_Started/Glossary.md#manifest) or
  segment request failed.

#### more information

A NetworkError provide much more infos than this code.

Among its properties, you have:

- `url` (`string`): The url the request has been on

- `status` (`Number`): Status code of the HTTP request.

- `errorType` (`string`): Further precision about what went wrong.

  This string can either be:

  - `"TIMEOUT"`: The request timeouted.
  - `"ERROR_EVENT"`: The XMLHttpRequest has sent an error event
  - `"PARSE_ERROR"`: No data could have been extracted from this request
  - `"ERROR_HTTP_CODE"`: The request finished with a status code not in the 2xx range.

- `xhr` (`XMLHttpRequest|undefined`): The xhr associated with the request. Not defined if
  the current content has been launched in `lowLatencyMode`.

<div class="warning">
This last property is deprecated. It will disappear in the next major
release, the `v4.0.0` (see <a href="./Miscellaneous/Deprecated_APIs.md">Deprecated
APIs</a>).
</div>

### MEDIA_ERROR

Error related to the media itself. It can both come from the player itself
([Manifest](../Getting_Started/Glossary.md#manifest) parsing) or from the browser itself
(content playback).

They all have a `type` property equal to `"MEDIA_ERROR"`.

Depending on its `code` property (listed below), a `MEDIA_ERROR` may also have a
supplementary `trackInfo` property, describing the track related to the issue. The format
of that property is decribed in the chapter below listed codes, and the codes for which it
is set are indicated in the corresponding code's description below.

#### codes

An error of `type` `MEDIA_ERROR` can have the following codes (`code` property):

- `"BUFFER_APPEND_ERROR"`: A media segment could not have been added to the corresponding
  media buffer. This often happens with malformed segments.

  For those errors, you may be able to know the characteristics of the track linked to
  that segment by inspecting the error's `trackInfo` property, described below.

- `"BUFFER_FULL_ERROR"`: The needed segment could not have been added because the
  corresponding media buffer was full.

  For those errors, you may be able to know the characteristics of the track linked to
  that segment by inspecting the error's `trackInfo` property, described below.

- `"BUFFER_TYPE_UNKNOWN"`: The type of buffer considered (e.g. "audio" / "video" / "text")
  has no media buffer implementation in your build.

- `"MANIFEST_INCOMPATIBLE_CODECS_ERROR"`: An
  [Adaptation](../Getting_Started/Glossary.md#adaptation) (or track) has none of its
  [Representations](../Getting_Started/Glossary.md#representation) (read quality) in a
  supported codec.

  For those errors, you may be able to know the characteristics of the track linked to
  that codec by inspecting the error's `trackInfo` property, described below.

- `"MANIFEST_PARSE_ERROR"`: Generic error to signal than the
  [Manifest](../Getting_Started/Glossary.md#manifest) could not be parsed.

- `"MANIFEST_UNSUPPORTED_ADAPTATION_TYPE"`: One of the
  [Adaptation](../Getting_Started/Glossary.md#adaptation) has a type (e.g. "audio", "text"
  or "video" which is not managed by the RxPlayer).

- `"MEDIA_ERR_ABORTED"`: A crucial browser-side fetching operation was aborted.

- `"MEDIA_ERR_BLOCKED_AUTOPLAY"`: The current browser has a policy which forbids us to
  autoPlay the content. As a consequence, the rx-player stays in a `"LOADED"` state. This
  code is always a warning and it never causes playback interruption.

- `"MEDIA_ERR_PLAY_NOT_ALLOWED"`: A `play` call on our API (coming from you) failed
  because the current browser does not allow it. The content should still be in a paused
  state. This is in almost any case due a browser policy which prevents a content to play
  without any user interaction. In those cases, we recommend to display a UI element on
  your page inviting the final user to manually play the content.

- `"MEDIA_ERR_NOT_LOADED_METADATA"`: The current browser falsely announce having loaded
  the content's metadata. In that case, we cannot switch to the `LOADED` state directly
  (we will be blocked in either a `LOADING` or a `RELOADING` state) and you're encouraged
  to call `play` manually when you want to play the content. This is a case only
  encountered in the Samsung browser (as found in Android) when loading a content in
  "directfile" mode.

- `"MEDIA_ERR_DECODE"`: A pushed segment/media could not be decoded by the browser. This
  happens most-of-all with malformed segments.

- `"MEDIA_ERR_NETWORK"`: A browser-side request failed.

- `"MEDIA_ERR_SRC_NOT_SUPPORTED"`: The media associated to the video element is not valid.

- `"MEDIA_ERR_UNKNOWN"`: Media error impossible to characterize.

- `"MEDIA_KEYS_NOT_SUPPORTED"`: The current browser has no MediaKeys implementation and
  the content is encrypted.

- `"MEDIA_SOURCE_NOT_SUPPORTED"`: No known MediaSource API is supported by your browser
  and we need to create one.

- `"MEDIA_STARTING_TIME_NOT_FOUND"`: The provided or calculated starting time was not
  found in the corresponding media.

- `"MEDIA_TIME_BEFORE_MANIFEST"`: The current time in the media is behind what is
  currently declared in the [Manifest](../Getting_Started/Glossary.md#manifest). This can
  lead to stalling indefinitely as the player won't be able to download new segments
  arround the current time.

- `"MEDIA_TIME_AFTER_MANIFEST"`: The current time in the media is after what is currently
  declared in the [Manifest](../Getting_Started/Glossary.md#manifest). This can lead to
  stalling indefinitely as the player won't be able to download new segments arround the
  current time.

- `"DISCONTINUITY_ENCOUNTERED"`: A discontinuity (i.e. a hole in the media buffer) has
  been encontered and seeked over.

  This is rarely a problem and may be encountered at a very start of a content when the
  initial segment's start is much later than expected.

- `"NO_PLAYABLE_REPRESENTATION"`: One of the currently chosen track does not contain any
  playable Representation. This usually happens when every Representation has been
  blacklisted due to encryption limitations.

  For those errors, you may be able to know the characteristics of the corresponding track
  by inspecting the error's `trackInfo` property, described below.

- `"MANIFEST_UPDATE_ERROR"`: This error should never be emitted as it is handled
  internally by the RxPlayer. Please open an issue if you encounter it.

  This error is triggered when an incoherent version of the Manifest was received during a
  partial update. The RxPlayer should catch the error and trigger a full update instead
  when that happens.

- `"MEDIA_TIME_NOT_FOUND"`: This error should never be emitted by the RxPlayer. Please
  open an issue if you encounter it.

  It is triggered when a time we initially thought to be in the bounds of the Manifest
  actually does not link to any "Period" of the Manifest.

#### `trackInfo` property

As described in the corresponding code's documentation, A aupplementary `trackInfo`
property may be set on `MEDIA_ERROR` depending on its `code` property.

That `trackInfo` describes, when it makes sense, the characteristics of the track linked
to an error. For example, you may want to know which video track led to a
`BUFFER_APPEND_ERROR` and thus might be linked to corrupted segments.

The `trackInfo` property has itself two sub-properties:

- `type`: The type of track: `"audio"` for an audio track, `"text"` for a text track, or
  `"video"` for a video track.

- `track`: Characteristics of the track. Its format depends on the `trackInfo`'s `type`
  property and is described below.

##### For video tracks

When `trackInfo.type` is set to `"video"`, `track` describes a video track. It contains
the following properties:

- `id` (`string`): The id used to identify this track. No other video track for the same
  [Period](../Getting_Started/Glossary.md#period) will have the same `id`.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation. No other Representation
    from this track will have the same `id`.

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per seconds.

  - `width` (`Number|undefined`): The width of video, in pixels.

  - `height` (`Number|undefined`): The height of video, in pixels.

  - `codec` (`string|undefined`): The video codec the Representation is in, as announced
    in the corresponding Manifest.

  - `frameRate` (`string|undefined`): The video frame rate.

  - `hdrInfo` (`Object|undefined`) Information about the hdr characteristics of the track.
    (see [HDR support documentation](./Miscellaneous/hdr.md#hdrinfo))

- `signInterpreted` (`Boolean|undefined`): If set to `true`, this track is known to
  contain an interpretation in sign language. If set to `false`, the track is known to not
  contain that type of content. If not set or set to undefined we don't know whether that
  video track contains an interpretation in sign language.

- `isTrickModeTrack` (`Boolean|undefined`): If set to `true`, this track is a trick mode
  track. This type of tracks proposes video content that is often encoded with a very low
  framerate with the purpose to be played more efficiently at a much higher speed.

- `trickModeTracks` (`Array.<Object> | undefined`): Trick mode video tracks attached to
  this video track.

  Each of those objects contain the same properties that a regular video track (same
  properties than what is documented here).

  It this property is either `undefined` or not set, then this track has no linked
  trickmode video track.

##### For audio tracks

When `trackInfo.type` is set to `"audio"`, `track` describes an audio track. It contains
the following properties:

- `id` (`Number|string`): The id used to identify this track. No other audio track for the
  same [Period](../Getting_Started/Glossary.md#period) will have the same `id`.

- `language` (`string`): The language the audio track is in, as set in the
  [Manifest](../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-3
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

  - `bitrate` (`Number`): The bitrate of this Representation, in bits per seconds.

  - `codec` (`string|undefined`): The audio codec the Representation is in, as announced
    in the corresponding Manifest.

  - `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation has
    spatial audio.

##### For text tracks

When `trackInfo.type` is set to `"text"`, `track` describes a text track. It contains the
following properties:

- `id` (`string`): The id used to identify this track. No other text track for the same
  [Period](../Getting_Started/Glossary.md#period) will have the same `id`.

- `language` (`string`): The language the text
  trac./../Basic_Methods/loadVideo.md#transport set in the
  [Manifest](../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-3
  language codes). If the translation attempt fails (no corresponding
  ISO./../Basic_Methods/loadVideo.md#transport found), it will equal the value of
  `language`

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

- `closedCaption` (`Boolean`): Whether the track is specially adapted for the hard of
  hearing or not.

- `forced` (`Boolean`): If `true` this text track is meant to be displayed by default if
  no other text track is selected.

  It is often used to clarify dialogue, alternate languages, texted graphics or location
  and person identification.

### ENCRYPTED_MEDIA_ERROR

Those errors are linked to the "Encrypted Media Extensions" API. They concern various
DRM-related problems.

They all have a `type` property equal to `"ENCRYPTED_MEDIA_ERROR"`.

When its code is set to `KEY_STATUS_CHANGE_ERROR`, an ENCRYPTED_MEDIA_ERROR generally also
have a `keyStatuses` property, which is documented in the corresponding
`KEY_STATUS_CHANGE_ERROR` code explanation below.

#### codes

An error of `type` `ENCRYPTED_MEDIA_ERROR` can have the following codes (`code` property):

- `"INCOMPATIBLE_KEYSYSTEMS"`: None of the provided key systems was compatible with the
  current browser.

- `"INVALID_ENCRYPTED_EVENT"`: An encountered `encrypted` event was not valid.

- `"INVALID_KEY_SYSTEM"`: One of the given key system was not accepted by the RxPlayer.

- `"KEY_ERROR"`: The `MediaKeySession` emitted an error.

- `"KEY_GENERATE_REQUEST_ERROR"`: An error happened when calling the `generateRequest` API
  to generate a challenge.

- `"KEY_LOAD_ERROR"`: An error was returned by the code fetching the license.

- `"KEY_LOAD_TIMEOUT"`: The request for fetching the license had a duration of more than
  10 seconds.

- `"KEY_STATUS_CHANGE_ERROR"`: An error was detected when the `MediaKeySession` emitted a
  keyStatuseschange event (e.g. a key became `"expired"`).

  `EncryptedMediaError` having the `KEY_STATUS_CHANGE_ERROR` code will also have a
  `keyStatuses` property, which is an array of objects - each describing a problematic key
  status with the following properties:

  - `keyId` (`ArrayBuffer`): The key id concerned by the status change indicated by
    `keyStatus`
  - `keyStatus`
    ([`MediaKeyStatus`](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus)): The
    problematic key status encountered linked to the `keyId` of the same object.

  If multiple objects are found in the `keyStatuses` property, it means that multiple keys
  changed to a problematic status roughly around the same time.

- `"KEY_UPDATE_ERROR"`: An error was detected after a message (like a license was given to
  the CDM).

- `"LICENSE_SERVER_CERTIFICATE_ERROR"`: The server certificate of a `MediaKeys` could not
  be set.

- `"MEDIA_IS_ENCRYPTED_ERROR"`: The media is encrypted and no key system was given to the
  RxPlayer's APIs.

- `CREATE_MEDIA_KEYS_ERROR`: An unknown error happened when creating a CDM instance (to
  decrypt the content).

  More specifically, this error happens when the EME
  [`createMediaKeys` API](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemaccess-createmediakeys)
  throws or rejects.

  This is a relatively rare situation generally linked to an issue in the CDM.

  It has been encountered mainly on some faulty Android devices and Electron applications.
  If this happens repeatedly, try reinstalling the CDM module on your device.

- `"MULTIPLE_SESSIONS_SAME_INIT_DATA"`: This error should never be emitted by the
  RxPlayer. Please open an issue if you encounter it.

  It is emitted when the RxPlayer try to open multiple `MediaKeySession` for the same
  initialization data (instead of using the exact same `MediaKeySession`).

### OTHER_ERROR

Those errors are various other errors which does not belong to other types.

They all have a `type` property equal to `"OTHER_ERROR"`.

#### codes

An error of `type` `OTHER_ERROR` can have the following codes (`code` property):

- `"PIPELINE_LOAD_ERROR"`: The [Manifest](../Getting_Started/Glossary.md#manifest) or
  segment request failed and the request has been done through a given callback (i.e. not
  the RxPlayer's XMLHttpRequest implementation).

- `"PIPELINE_PARSE_ERROR"`: The RxPlayer's
  [Manifest](../Getting_Started/Glossary.md#manifest) or segment parsing logic failed.
  This is most likely due to a malformed Manifest or segment.

- `"INTEGRITY_ERROR"`: An integrity-checking mechanism in the RxPlayer detected that there
  was an error with some loaded data. Such mechanism can be triggered for example when the
  `checkMediaSegmentIntegrity` `transportOptions` is set to `loadVideo`.

- `"NONE"`: The error cannot be characterized.
