# Player events

## Table of contents

- [Overview](#overview)
- [Events](#events)
    - [playerStateChange](#events-playerStateChange)
    - [positionUpdate](#events-positionUpdate)
    - [audioTrackChange](#events-audioTrackChange)
    - [textTrackChange](#events-textTrackChange)
    - [audioBitrateChange](#events-audioBitrateChange)
    - [videoBitrateChange](#events-videoBitrateChange)
    - [imageTrackUpdate](#events-imageTrackUpdate)
    - [fullscreenChange](#events-fullscreenChange)
    - [bitrateEstimationChange](#events-bitrateEstimationChange)
    - [warning](#events-warning)
    - [error](#events-error)
    - [nativeTextTracksChange](#events-nativeTextTracksChange)

## <a name="overview"></a>Overview

To communicate about events (like an error or the update of the current video bitrate) the player use the event listener pattern.

As [documented in the API](./index.md#meth-addEventListener), you can call ``addEventListener`` to register a callback for a particular event, like:
```js
player.addEventListener("videoBitrateChange", (newVideoBitrate) => {
  console.log("the video bitrate changed to:", newVideoBitrate)
});
```

You can unregister a callback through the ``removeEventListener`` API, documented [here](./index.md#meth-removeEventListener).

## <a name="events"></a>Events

This chapter describes every event sent by the player. Each event generally comes with a payload, which will also be defined here.

### <a name="events-playerStateChange"></a>playerStateChange

_payload type_: ``string``

Emit the current state of the player, every time it changes. Find the different possible states [here](./index.md#meth-getPlayerState).

### <a name="events-positionUpdate"></a>positionUpdate

_payload type_: ``Object``

Emit informations about the current position at most every seconds (also emits every time various player events are received).

The object emitted as the following properties:
  - ``position`` (``Number``): The current position in the video, in seconds.
  - ``duration`` (``Number``): The duration of the content.
  - ``bufferGap`` (``Number``): The gap, in seconds, between the current position and the end of the current buffered range.
  -  ``playbackRate`` (``Number``): The current playback rate the content is on.
  - ``liveGap`` (``Number|undefined``): Only for live contents. The gap between the current position and the "live edge".
  - ``maximumBufferTime`` (``Number|undefined``): The maximum time until which the buffer can currently be filled. That is:
    - for non-live contents, the duration.
    - for live contents, the live edge minus a security margin we added to avoid buffering ahead of it.
  - ``wallClockTime`` (``Number|undefined``): Only for live contents. The current time converted to wall-clock time in seconds. That is the real live position (and not the position as announced by the video element).

### <a name="events-audioTrackChange"></a>audioTrackChange

_payload type_: ``Object``

Information about the current audio track, each time it changes (the last received segment got a new one).

The payload is an object describing the new track, with the following properties:
  - ``id`` (``Number|string``): The id used to identify the track.
  - ``language`` (``string``): The language the audio track is in.
  - ``audioDescription`` (``Boolean``): Whether the track is an audio description (for the visually impaired or not).

### <a name="events-textTrackChange"></a>textTrackChange

_payload type_: ``Object``

Information about the current text track, each time it changes (the last received segment got a new one).

The payload is an object describing the new track, with the following properties:
  - ``id`` (``Number|string``): The id used to identify the track.
  - ``language`` (``string``): The language the text track is in.
  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for the hard of hearing or not.

### <a name="events-audioBitrateChange"></a>audioBitrateChange

_payload type_: ``Number``

The payload is the new audio bitrate, in bits per seconds. It is emitted every time it changes (based on the last received segment).

### <a name="events-videoBitrateChange"></a>videoBitrateChange

_payload type_: ``Number``

The payload is the new video bitrate, in bits per seconds. It is emitted every time it changes (based on the last received segment).

### <a name="events-imageTrackUpdate"></a>imageTrackUpdate

_payload type_: ``Object``

Triggered each time the current image playlist changes (has new images).

Has the following property in its payload:
  _data_ (``Array.<Object>``): Every image data.

  Each image has a structure as defined in the [Images structure page](./images.md#api-structure).

### <a name="events-fullscreenChange"></a>fullscreenChange

_payload type_: ``Boolean``

Triggered each time the video player goes/exits fullscreen mode.

The payload is ``true`` if the player entered fullscreen, ``false`` if it exited it.

### <a name="events-bitrateEstimationChange"></a>bitrateEstimationChange

_payload type_: ``Object``

Information about the last bitrate estimation performed, by type of buffer (``audio``, ``video`` etc.).

Note that this event is sent only if the corresponding buffer type has multiple representation for the given content (as bitrate estimations are only useful in that case).

The payload is an object with the following properties:
  - ``type`` (``string``): The buffer type
  - ``bitrate`` (``Number``): The last estimated bandwidth for this buffer type, in bits per seconds. This bitrate is smoothed by doing a (complex) mean on an extended period of time, so it often does not link directly to the current calculated bitrate.

### <a name="events-warning"></a>warning

_payload type_: ``Error``

Triggered each time a non-fatal (for content playback) error happened.

The payload is the corresponding error. See [the Player Error documentation](./errors.md) for more informations.

### <a name="events-error"></a>error

_payload type_: ``Error``

Triggered each time a fatal (for content playback) error happened.

The payload is the corresponding error. See [the Player Error documentation](./errors.md) for more informations.

### <a name="events-nativeTextTracksChange"></a>nativeTextTracksChange

_payload type_: ``Array<TextTrackElement>``

Triggered each times a new ``<track>`` element is removed or added to the video element.

The payload is the array of ``TextTrack`` elements. The RxPlayer will only set a single ``<track>`` when a text track is set.
