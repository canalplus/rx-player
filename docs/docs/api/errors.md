---
id: player_errors_warning
title: Player errors and warnings
sidebar_label: Player errors/warnings
slug: playerErrorsWarning
---

## Overview

Various errors can be triggered when playing a media content. Those can happen
when:

- The network is unreachable
- The codecs are not supported
- We have no mean to decrypt the data
- ...

Some errors can be fatal to content playback in which case they will stop the
player, others act more as warnings and are more along the line of a minor
problem notification.

You can know if a fatal error interrupted your playback by:

- adding an event listener to the `"error"` event (see the [player events](./events.md) documentation). This event listener will take the error
  directly in argument.

- calling the `getError` API if the current state is `STOPPED`. If
  different from `null`, it means that a fatal error happened (see the documentation for [getError](./basicMethods/getError.md)).

You can also be warned of any non-fatal error by:

- adding an event listener to the `"warning"` event (see the [player events](./events.md) documentation). The event listener will take the
  non-fatal error directly in argument.

All of those are in essence `Error` instances with added information.

Those supplementary information are described in this page.

## Structure of an Error

Each of RxPlayer's error objects have at least those properties:

- `type` (`string`): A large category for the error
  (e.g. `NETWORK_ERROR`, `ENCRYPTED_MEDIA_ERROR` ...)

- `code` (`string`): A set identification "code" for the error encountered

- `message` (`string`): A displayable, human-readable, summary of the
  error.

- `fatal` (`boolean`): If true, the error was fatal. Meaning that the
  playback was interrupted by it

## Types

The types are the different strings you can have as the `type` property of an
error.

This chapter provides an exhaustive list of the possible type of error
encountered.

### NETWORK_ERROR

A NetworkError is any Network-related error (HTTP 404, request timeout...), they
all have a `type` property equal to `"NETWORK_ERROR"`.

#### codes

A NetworkError can only have the following code (`code` property):

- `"PIPELINE_LOAD_ERROR"`: the [Manifest](../glossary.md#manifest) or segment
  request failed.

#### more information

A NetworkError provide much more infos than this code.

Among its properties, you have:

- `url` (`string`): The url the request has been on

- `status` (`Number`): Shortcut to the status code of the xhr.

- `errorType` (`string`): Further precision about what went wrong.

  This string can either be:

  - `"TIMEOUT"`: The request timeouted.
  - `"ERROR_EVENT"`: The XMLHttpRequest has sent an error event
  - `"PARSE_ERROR"`: No data could have been extracted from this request
  - `"ERROR_HTTP_CODE"`: The request finished with a status code not in
    the 2xx range.

- `code` (`number`): The HTTP code of the request at the time of the
  error (`0` if no request has been done yet)

- `xhr` (`XMLHttpRequest|undefined`): The xhr associated with the request.
  Not defined if the current content has been launched in `lowLatencyMode`.

:::note
This last property is deprecated. It will disappear in the next major
release, the `v4.0.0` (see [Deprecated APIs](../additional_ressources/deprecated.md)).
:::

### MEDIA_ERROR

Error related to the media itself. It can both come from the player itself
([Manifest](../glossary.md#manifest) parsing) or from the browser itself (content
playback).

They all have a `type` property equal to `"MEDIA_ERROR"`.

#### codes

A MediaError can have the following codes (`code` property):

- `"BUFFER_APPEND_ERROR"`: A media segment could not have been added to the
  corresponding media buffer. This often happens with malformed segments.

- `"BUFFER_FULL_ERROR"`: The needed segment could not have been added
  because the corresponding media buffer was full.

- `"BUFFER_TYPE_UNKNOWN"`: The type of buffer considered (e.g. "audio" /
  "video" / "text") has no media buffer implementation in your build.

- `"MANIFEST_INCOMPATIBLE_CODECS_ERROR"`: An
  [Adaptation](../glossary.md#adaptation) (or track) has none of its
  [Representations](../glossary.md#representation) (read quality) in a supported
  codec.

- `"MANIFEST_PARSE_ERROR"`: Generic error to signal than the
  [Manifest](../glossary.md#manifest) could not be parsed.

- `"MANIFEST_UNSUPPORTED_ADAPTATION_TYPE"`: One of the
  [Adaptation](../glossary.md#adaptation) has a type (e.g. "audio", "text" or
  "video" which is not managed by the RxPlayer).

- `"MEDIA_ERR_ABORTED"`: A crucial browser-side fetching operation was
  aborted.

- `"MEDIA_ERR_BLOCKED_AUTOPLAY"`: The current browser has a policy which
  forbids us to autoPlay the content. As a consequence, the rx-player stays
  in a `"LOADED"` state.
  This code is always a warning and it never causes playback interruption.

- `"MEDIA_ERR_PLAY_NOT_ALLOWED"`: A `play` call on our API (coming from you)
  failed because the current browser does not allow it.
  The content should still be in a paused state.
  This is in almost any case due a browser policy which prevents a content to
  play without any user interaction.
  In those cases, we recommend to display a UI element on your page inviting
  the final user to manually play the content.

- `"MEDIA_ERR_NOT_LOADED_METADATA"`: The current browser falsely announce
  having loaded the content's metadata.
  In that case, we cannot switch to the `LOADED` state directly (we will
  be blocked in either a `LOADING` or a `RELOADING` state) and you're
  encouraged to call `play` manually when you want to play the content.
  This is a case only encountered in the Samsung browser (as found in
  Android) when loading a content in "directfile" mode.

- `"MEDIA_ERR_DECODE"`: A pushed segment/media could not be decoded by the
  browser. This happens most-of-all with malformed segments.

- `"MEDIA_ERR_NETWORK"`: A browser-side request failed.

- `"MEDIA_ERR_SRC_NOT_SUPPORTED"`: The media associated to the video element
  is not valid.

- `"MEDIA_ERR_UNKNOWN"`: Media error impossible to characterize.

- `"MEDIA_KEYS_NOT_SUPPORTED"`: The current browser has no MediaKeys
  implementation and the content is encrypted.

- `"MEDIA_SOURCE_NOT_SUPPORTED"`: No known MediaSource API is supported by
  your browser and we need to create one.

- `"MEDIA_STARTING_TIME_NOT_FOUND"`: The provided or calculated starting
  time was not found in the corresponding media.

- `"MEDIA_TIME_BEFORE_MANIFEST"`: The current time in the media is behind
  what is currently declared in the [Manifest](../glossary.md#manifest).
  This can lead to stalling indefinitely as the player won't be able to
  download new segments arround the current time.

- `"MEDIA_TIME_AFTER_MANIFEST"`: The current time in the media is after what
  is currently declared in the [Manifest](../glossary.md#manifest).
  This can lead to stalling indefinitely as the player won't be able to
  download new segments arround the current time.

- `"DISCONTINUITY_ENCOUNTERED"`: A discontinuity (i.e. a hole in the media
  buffer) has been encontered and seeked over.

  This is rarely a problem and may be encountered at a very start of a content
  when the initial segment's start is much later than expected.

- `"NO_PLAYABLE_REPRESENTATION"`: The currently chosen Adaptation does not
  contain any playable Representation. This usually happen when every
  Representation has been blacklisted due to encryption limitations.

- `"MANIFEST_UPDATE_ERROR"`: This error should never be emitted as it is
  handled internally by the RxPlayer. Please open an issue if you encounter
  it.

  This error is triggered when an incoherent version of the Manifest was
  received during a partial update. The RxPlayer should catch the error and
  trigger a full update instead when that happens.

- `"MEDIA_TIME_NOT_FOUND"`: This error should never be emitted by the
  RxPlayer. Please open an issue if you encounter it.

  It is triggered when a time we initially thought to be in the bounds of the
  Manifest actually does not link to any "Period" of the Manifest.

### ENCRYPTED_MEDIA_ERROR

Those errors are linked to the Encrypted Media Extensions. They concern various
DRM-related problems.

They all have a `type` property equal to `"ENCRYPTED_MEDIA_ERROR"`.

#### codes

An EncryptedMediaError can have the following codes (`code` property):

- `"INCOMPATIBLE_KEYSYSTEMS"`: None of the provided key systems was
  compatible with the current browser.

- `"INVALID_ENCRYPTED_EVENT"`: An encountered `encrypted` event was not
  valid.

- `"INVALID_KEY_SYSTEM"`: One of the given key system was not accepted by
  the RxPlayer.

- `"KEY_ERROR"`: The `MediaKeySession` emitted an error.

- `"KEY_GENERATE_REQUEST_ERROR"`: An error happened when calling the
  `generateRequest` API to generate a challenge.

- `"KEY_LOAD_ERROR"`: An error was returned by the code fetching the
  license.

- `"KEY_LOAD_TIMEOUT"`: The request for fetching the license had a duration
  of more than 10 seconds.

- `"KEY_STATUS_CHANGE_ERROR"`: An error was detected when the
  `MediaKeySession` emitted a keyStatuseschange event (e.g. the key
  became `"expired"`).

- `"KEY_UPDATE_ERROR"`: An error was detected after a message (like a
  license was given to the CDM).

- `"LICENSE_SERVER_CERTIFICATE_ERROR"`: The server certificate of a
  `MediaKeys` could not be set.

- `"MEDIA_IS_ENCRYPTED_ERROR"`: The media is encrypted and no key system
  was given to the RxPlayer's APIs.

- `"MULTIPLE_SESSIONS_SAME_INIT_DATA"`: This error should never be emitted
  by the RxPlayer. Please open an issue if you encounter it.

  It is emitted when the RxPlayer try to open multiple `MediaKeySession` for
  the same initialization data (instead of using the exact same
  `MediaKeySession`).

### OTHER_ERROR

Those errors are various other errors which does not belong to other types.

They all have a `type` property equal to `"OTHER_ERROR"`.

#### codes

An OtherError can have the following codes (`code` property):

- `"PIPELINE_LOAD_ERROR"`: The [Manifest](../glossary.md#manifest) or segment
  request failed and the request has been done through a given callback (i.e.
  not the RxPlayer's XMLHttpRequest implementation).

- `"PIPELINE_PARSE_ERROR"`: The RxPlayer's [Manifest](../glossary.md#manifest)
  or segment parsing logic failed. This is most likely due to a malformed
  Manifest or segment.

- `"INTEGRITY_ERROR"`: An integrity-checking mechanism in the RxPlayer
  detected that there was an error with some loaded data. Such mechanism can
  be triggered for example when the `checkMediaSegmentIntegrity`
  `transportOptions` is set to `loadVideo`.

- `"NONE"`: The error cannot be characterized.
