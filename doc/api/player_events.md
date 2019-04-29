# Player events ################################################################


## Table of contents ###########################################################

- [Overview](#overview)
- [Events](#events)
    - [playerStateChange](#events-playerStateChange)
    - [positionUpdate](#events-positionUpdate)
    - [availableAudioTracksChange](#events-availableAudioTracksChange)
    - [availableTextTracksChange](#events-availableTextTracksChange)
    - [availableVideoTracksChange](#events-availableVideoTracksChange)
    - [audioTrackChange](#events-audioTrackChange)
    - [textTrackChange](#events-textTrackChange)
    - [videoTrackChange](#events-videoTrackChange)
    - [availableAudioBitratesChange](#events-availableAudioBitratesChange)
    - [availableVideoBitratesChange](#events-availableVideoBitratesChange)
    - [audioBitrateChange](#events-audioBitrateChange)
    - [videoBitrateChange](#events-videoBitrateChange)
    - [imageTrackUpdate](#events-imageTrackUpdate)
    - [fullscreenChange](#events-fullscreenChange)
    - [bitrateEstimationChange](#events-bitrateEstimationChange)
    - [warning](#events-warning)
    - [error](#events-error)
    - [nativeTextTracksChange](#events-nativeTextTracksChange)
    - [periodChange](#events-periodChange)



<a name="overview"></a>
## Overview ####################################################################

To communicate about events (like an error or the update of the current video
bitrate) the player use the event listener pattern.

As [documented in the API](./index.md#meth-addEventListener), you can call
``addEventListener`` to register a callback for a particular event, like:

```js
player.addEventListener("videoBitrateChange", (newVideoBitrate) => {
  console.log("the video bitrate changed to:", newVideoBitrate)
});
```

You can unregister a callback through the ``removeEventListener`` API,
documented [here](./index.md#meth-removeEventListener).



<a name="events"></a>
## Events ######################################################################

This chapter describes every event sent by the player. Each event generally
comes with a payload, which will also be defined here.


<a name="events-playerStateChange"></a>
### playerStateChange ##########################################################

_payload type_: ``string``

Emit the current state of the player, every time it changes.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](./states.md).


<a name="events-positionUpdate"></a>
### positionUpdate #############################################################

_payload type_: ``Object``

Emit information about the current position at most every seconds (also emits
every time various player events are received).

The object emitted as the following properties:

  - ``position`` (``Number``): The current position in the video, in seconds.

  - ``duration`` (``Number``): The duration of the content.

  - ``bufferGap`` (``Number``): The gap, in seconds, between the current
    position and the end of the current buffered range.

  -  ``playbackRate`` (``Number``): The current playback rate the content is on.

  - ``liveGap`` (``Number|undefined``): Only for live contents. The gap between
    the current position and the "live edge".

  - ``maximumBufferTime`` (``Number|undefined``): The maximum time until which
    the buffer can currently be filled. That is:

    - for static contents (like VoD), the duration.

    - for dynamic contents (like live contents), the current maximum available
      position (live edge for live contents) minus a security margin we added to
      avoid buffering ahead of it.

  - ``wallClockTime`` (``Number|undefined``): Only for live contents. The
    current time converted to wall-clock time in seconds.
    That is the real live position (and not the position as announced by the
    video element).



<a name="events-availableAudioTracksChange"></a>
### availableAudioTracksChange #################################################

_payload type_: ``Array.<Object>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the currently available audio tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available audio track:

  - ``id`` (``string``): The id used to identify the track. Use it for
    setting the track via ``setAudioTrack``.

  - ``language`` (``string``): The language the audio track is in, as set in
    the [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``audioDescription`` (``Boolean``): Whether the track is an audio
    description (for the visually impaired or not).

  - ``active`` (``Boolean``): Whether the track is the one currently active or
    not.



<a name="events-availableVideoTracksChange"></a>
### availableVideoTracksChange #################################################

_payload type_: ``Array.<Object>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the currently available video tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available video track:

  - ``id`` (``string``): The id used to identify the track. Use it for
    setting the track via ``setVideoTrack``.

  - ``active`` (``Boolean``): Whether this track is the one currently
    active or not.

  - ``representations`` (``Array.<Object>``):
    [Representations](../terms.md#representation) of this video track, with
    attributes:

    - ``id`` (``string``): The id used to identify this Representation.

    - ``bitrate`` (``Number``): The bitrate of this Representation, in bits per
      seconds.

    - ``width`` (``Number|undefined``): The width of video, in pixels.

    - ``height`` (``Number|undefined``): The height of video, in pixels.

    - ``codec`` (``string|undefined``): The codec given in standard MIME type
      format.

    - ``frameRate`` (``string|undefined``): The video framerate.



<a name="events-availableVideoTracksChange"></a>
### availableTextTracksChange ##################################################

_payload type_: ``Array.<Object>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the currently available text tracks change (e.g.: at the
beginning of the content, when period changes...).

The array emitted contains object describing each available text track:

  - ``id`` (``string``): The id used to identify the track. Use it for
    setting the track via ``setTextTrack``.

  - ``language`` (``string``): The language the text track is in, as set in the
    [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for
    the hard of hearing or not.

  - ``active`` (``Boolean``): Whether the track is the one currently active or
    not.



<a name="events-audioTrackChange"></a>
### audioTrackChange ###########################################################

_payload type_: ``Object|null``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Information about the current audio track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:
  - ``id`` (``Number|string``): The id used to identify the track.
  - ``language`` (``string``): The language the audio track is in.
  - ``audioDescription`` (``Boolean``): Whether the track is an audio
    description (for the visually impaired or not).


<a name="events-textTrackChange"></a>
### textTrackChange ############################################################

_payload type_: ``Object|null``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Information about the current text track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:
  - ``id`` (``Number|string``): The id used to identify the track.
  - ``language`` (``string``): The language the text track is in.
  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for
    the hard of hearing or not.


<a name="events-videoTrackChange"></a>
### videoTrackChange ############################################################

_payload type_: ``Object|null``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Information about the current video track, each time it changes (the last
received segment got a new one).

The payload is an object describing the new track, with the following
properties:

  - ``id`` (``string``): The id used to identify the track. Use it for setting
    the track via ``setVideoTrack``.


  - ``representations`` (``Array.<Object>``):
    [Representations](../terms.md#representation) of this video track, with
    attributes:

    - ``id`` (``string``): The id used to identify this Representation.

    - ``bitrate`` (``Number``): The bitrate of this Representation, in bits per
      seconds.

    - ``width`` (``Number|undefined``): The width of video, in pixels.

    - ``height`` (``Number|undefined``): The height of video, in pixels.

    - ``codec`` (``string|undefined``): The codec given in standard MIME type
      format.

    - ``frameRate`` (``string|undefined``): The video framerate.



<a name="events-availableAudioBitratesChange"></a>
### availableAudioBitratesChange ###############################################

_payload type_: ``Array.<Number>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the currently available audio bitrates change (e.g.: at the
beginning of the content, when switching the current audio track, when period
changes...).

The payload is an array of the different bitrates available, in bits per
seconds.


<a name="events-availableVideoBitratesChange"></a>
### availableVideoBitratesChange ###############################################

_payload type_: ``Array.<Number>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the currently available video bitrates change (e.g.: at the
beginning of the content, when switching the current video track, when period
changes...).

The payload is an array of the different bitrates available, in bits per
seconds.


<a name="events-audioBitrateChange"></a>
### audioBitrateChange #########################################################

_payload type_: ``Number``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

The payload is the new audio bitrate, in bits per seconds. It is emitted every
time it changes (based on the last received segment).

`-1` when the bitrate is not known.


<a name="events-videoBitrateChange"></a>
### videoBitrateChange #########################################################

_payload type_: ``Number``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

The payload is the new video bitrate, in bits per seconds. It is emitted every
time it changes (based on the last received segment).

`-1` when the bitrate is not known.


<a name="events-imageTrackUpdate"></a>
### imageTrackUpdate ###########################################################

_payload type_: ``Object``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered each time the current image playlist changes (has new images).

Has the following property in its payload:
  _data_ (``Array.<Object>``): Every image data.

  Each image has a structure as defined in the [Images structure
  page](./images.md#api-structure).


<a name="events-fullscreenChange"></a>
### fullscreenChange ###########################################################

---

:warning: This event is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_payload type_: ``Boolean``

Triggered each time the video player goes/exits fullscreen mode.

The payload is ``true`` if the player entered fullscreen, ``false`` if it exited
it.


<a name="events-bitrateEstimationChange"></a>
### bitrateEstimationChange ####################################################

_payload type_: ``Object``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Information about the last bitrate estimation performed, by type of buffer
(``audio``, ``video`` etc.).

Note that this event is sent only if the corresponding buffer type has multiple
[Representations](../terms.md#representation) for the given content (as bitrate
estimations are only useful in that case).

The payload is an object with the following properties:

  - ``type`` (``string``): The buffer type

  - ``bitrate`` (``Number``): The last estimated bandwidth for this buffer type,
    in bits per seconds.
    This bitrate is smoothed by doing a (complex) mean on an extended period of
    time, so it often does not link directly to the current calculated bitrate.



<a name="events-warning"></a>
### warning ####################################################################

_payload type_: ``Error``

Triggered each time a non-fatal (for content playback) error happened.

The payload is the corresponding error. See [the Player Error
documentation](./errors.md) for more information.


<a name="events-error"></a>
### error ######################################################################

_payload type_: ``Error``

Triggered each time a fatal (for content playback) error happened.

The payload is the corresponding error. See [the Player Error
documentation](./errors.md) for more information.


<a name="events-nativeTextTracksChange"></a>
### nativeTextTracksChange #####################################################

---

:warning: This event is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_payload type_: ``Array<TextTrackElement>``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered each times a new ``<track>`` element is removed or added to the video
element.

The payload is the array of ``TextTrack`` elements. The RxPlayer will only set
a single ``<track>`` when a text track is set.


<a name="events-periodChange"></a>
### periodChange ###############################################################

_payload type_: ``Object``

---

:warning: This event is not sent in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

---

Triggered when the current [Period](../terms.md#period) being seen changes.

The payload is the corresponding Period. See [the Manifest
documentation](./manifest.md#period) for more information.
