# Rx-Player API

## Table of Contents

- [Overview](#overview)
- [Instantiation](#instantiation)
- [Static properties](#static)
    - [ErrorTypes](#static-ErrorTypes)
    - [ErrorCodes](#static-ErrorCodes)
    - [LogLevel](#static-LogLevel)
- [Methods](#meth)
    - [loadVideo](#meth-loadVideo)
    - [getVideoElement](#meth-getVideoElement)
    - [getPlayerState](#meth-getPlayerState)
    - [addEventListener](#meth-addEventListener)
    - [removeEventListener](#meth-removeEventListener)
    - [play](#meth-play)
    - [pause](#meth-pause)
    - [stop](#meth-stop)
    - [getPosition](#meth-getPosition)
    - [getWallClockTime](#meth-getWallClockTime)
    - [getVideoDuration](#meth-getVideoDuration)
    - [getVolume](#meth-getVolume)
    - [getError](#meth-getError)
    - [seekTo](#meth-seekTo)
    - [isLive](#meth-isLive)
    - [getUrl](#meth-getUrl)
    - [isFullscreen](#meth-isFullscreen)
    - [getAvailableVideoBitrates](#meth-getAvailableVideoBitrates)
    - [getAvailableAudioBitrates](#meth-getAvailableAudioBitrates)
    - [getVideoBitrate](#meth-getVideoBitrate)
    - [getAudioBitrate](#meth-getAudioBitrate)
    - [getMaxVideoBitrate](#meth-getMaxVideoBitrate)
    - [getMaxAudioBitrate](#meth-getMaxAudioBitrate)
    - [setVideoBitrate](#meth-setVideoBitrate)
    - [setAudioBitrate](#meth-setAudioBitrate)
    - [getManualVideoBitrate](#meth-getManualVideoBitrate)
    - [getManualAudioBitrate](#meth-getManualAudioBitrate)
    - [setWantedBufferAhead](#meth-setWantedBufferAhead)
    - [getWantedBufferAhead](#meth-getWantedBufferAhead)
    - [setMaxBufferBehind](#meth-setMaxBufferBehind)
    - [getMaxBufferBehind](#meth-getMaxBufferBehind)
    - [setMaxBufferAhead](#meth-setMaxBufferAhead)
    - [getMaxBufferAhead](#meth-getMaxBufferAhead)
    - [setMaxVideoBitrate](#meth-setMaxVideoBitrate)
    - [setMaxAudioBitrate](#meth-setMaxAudioBitrate)
    - [setFullscreen](#meth-setFullscreen)
    - [exitFullscreen](#meth-exitFullscreen)
    - [setVolume](#meth-setVolume)
    - [mute](#meth-mute)
    - [unMute](#meth-unMute)
    - [isMute](#meth-isMute)
    - [getAvailableAudioTracks](#meth-getAvailableAudioTracks)
    - [getAvailableTextTracks](#meth-getAvailableTextTracks)
    - [getAudioTrack](#meth-getAudioTrack)
    - [getTextTrack](#meth-getTextTrack)
    - [setAudioTrack](#meth-setAudioTrack)
    - [setTextTrack](#meth-setTextTrack)
    - [disableTextTrack](#meth-disableTextTrack)
    - [getManifest](#meth-getManifest)
    - [getCurrentAdaptations](#meth-getCurrentAdaptations)
    - [getCurrentRepresentations](#meth-getCurrentRepresentations)
    - [dispose](#meth-dispose)
    - [getNativeTextTrack](#meth-getNativeTextTrack)
    - [getVideoLoadedTime](#meth-getVideoLoadedTime)
    - [getVideoPlayedTime](#meth-getVideoPlayedTime)
    - [getVideoBufferGap](#meth-getVideoBufferGap)
    - [getPlaybackRate](#meth-getPlaybackRate)
    - [setPlaybackRate](#meth-setPlaybackRate)
    - [getCurrentKeySystem](#meth-getCurrentKeySystem)
    - [getImageTrackData](#meth-getImageTrackData)
    - [getMinimumPosition](#meth-getMinimumPosition)
    - [getMaximumPosition](#meth-getMaximumPosition)

## <a name="overview"></a>Overview

The Rx-player has a complete API allowing you to:
  - load and stop streams
  - perform trickmodes (play, pause, seek, etc.) as a content is loaded.
  - get multiple informations on the current stream and on the player's state.
  - choose a specific audio language or subtitles track
  - set your own bitrate and buffer length
  - and more

The following pages define the entire API.

:warning: Only variables and methods defined here are considered as part of the API. Any other property or method you might find by using our library can change without notice (not considered as part of the API).

Only use the documented variables and open an issue if you think it's not enough.

## <a name="instantiation"></a>Instantiation

Instantiating a new player is straightforward:
```js
import RxPlayer from "rx-player";
const player = new RxPlayer(options);
```

The options are all... optional. They are all defined in the [Player Options page](./player_options.md).

## <a name="static"></a>Static properties

### <a name="static-ErrorTypes"></a>ErrorTypes

_type_: ``Object``

The different "types" of Error you can get on playback error,

See [the Player Error documentation](./errors.md) for more informations.

### <a name="static-ErrorCodes"></a>ErrorCodes

_type_: ``Object``

The different Error "codes" you can get on playback error,

See [the Player Error documentation](./errors.md) for more informations.

### <a name="static-LogLevel"></a>LogLevel

_type_: ``string``

_default_: ``"NONE"``

The current level of verbosity for the RxPlayer logs. Those logs all use the console.

From the less verbose to the most:
  - ``"NONE"``: no log
  - ``"ERROR"``: unexpected errors (via ``console.error``)
  - ``"WARNING"``: The previous level + minor problems encountered (via ``console.warn``)
  - ``"INFO"``: The previous levels + noteworthy events (via ``console.info``)
  - ``"DEBUG"``: The previous levels + normal events of the player (via ``console.log``)

If the value set to this property is different than those, it will be automatically set
to ``"NONE"``.

#### Example
```js
import RxPlayer from "rx-player";
RxPlayer.LogLevel = "WARNING";
```

## <a name="meth"></a>Methods

### <a name="meth-loadVideo"></a>loadVideo

_arguments_:
  - _options_ (``Object``)

Loads a new video described in the argument.

The options possible as arguments are all defined in [this page](./loadVideo_options.md).

#### Example

```js
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash"
});
```

### <a name="meth-getVideoElement"></a>getVideoElement

_return value_: ``HTMLMediaElement``

Returns the video element used by the player.

You're not encouraged to use its API, you should always prefer the Player's API.

#### Example

```js
const videoElement = player.getVideoElement();
videoElement.className = "my-video-element";
```

### <a name="meth-getPlayerState"></a>getPlayerState

_return value_: ``string``

The current player's state.
Can be either one of those strings:
  - ``"STOPPED"``: The player is idle. No content is loading nor is loaded.
  - ``"LOADING"``: The player is loading a new content.
  - ``"LOADED"``: The player can begin to play a new stream.
  - ``"PLAYING"``: The player is currently playing the stream.
  - ``"PAUSED"``: The player has paused.
  - ``"ENDED"``: The player has reached the end of the stream.
  - ``"BUFFERING"``: the player has reached the end of the buffer and is waiting for data to be appended.
  - ``"SEEKING"``: The player has reached the end of the buffer because a seek has been performed, new segments are being loaded.

State chart:

```
    -------------
    |  STOPPED  | <-----------------+
    -------------                   | stop() or "error" event
       |                            |
-------| loadVideo() -------------------------------------------------------
|      v                           -----------------------                 |
|  -----------     ------------  play()  -----------     |    -----------  |
|  | LOADING | --> |  LOADED  | ---|---> | PLAYING | ----|--> |  ENDED  |  |
|  -----------     ------------ autoPlay -----------     |    -----------  |
|                                  |         | ^         |                 |
|           ---------------        |  play() | | pause() |                 |
|           |  BUFFERING  | -----> |         v |         |                 |
|           |     or      |        |     -----------     |                 |
|           |   SEEKING   | <----- |     | PAUSED  |     |                 |
|           ---------------        |     -----------     |                 |
|                                  -----------------------                 |
----------------------------------------------------------------------------
```

#### Example

```js
switch (player.getPlayerState()) {
  case "STOPPED":
    console.log("No content is/will be playing");
    break;
  case "LOADING":
    console.log("A new content is currently loading");
    break;
  case "LOADED":
    console.log("The new content is loaded and ready to be played");
    break;
  case "PLAYING":
    console.log("The content is currently playing");
    break;
  case "PAUSED":
    console.log("The content is currently paused");
    break;
  case "BUFFERING":
    console.log("The content is buffering new data");
    break;
  case "SEEKING":
    console.log("The content is still seeking, waiting for new data");
    break;
  case "ENDED":
    console.log("The content has reached the end.");
    break;
  default:
    console.log("This is impossible (issue material!).")
    break;
}
```

### <a name="meth-addEventListener"></a>addEventListener

_arguments_:
  - _event_ (``string``): The event name.
  - _callback_ (``Function``): The callback for the event. The same callback may be used again when calling ``removeEventListener``.

Add an event listener to trigger a callback as it happens. The callback will have the event payload as a single argument.

To have the complete list of player events, consult the [Player events page](./player_events.md).

### <a name="meth-removeEventListener"></a>removeEventListener

_arguments_:
  - _event_ (``string``): The event name.
  - _callback_ (optional) (``Function``): The callback given when calling the corresponding ``addEventListener`` API.

Remove an event listener. That is, stop your registered callback (with ``addEventListener``) to be called as events happen and free up ressources.

The callback given is optional: if not given, _every_ registered callback to that event will be removed. That's why using both arguments is recommended for most usecase.

### <a name="meth-play"></a>play

Play/resume the current video. Equivalent to a video element's play method.

#### Example
```js
const resumeContent = () => {
  player.play();
};
```

### <a name="meth-pause"></a>pause

Pause the current video. Equivalent to a video element's pause method.

Note that a content can be paused even if its current state is ``BUFFERING`` or ``SEEKING``.

#### Example
```js
const pauseContent = () => {
  player.pause();
};
```

### <a name="meth-stop"></a>stop

Stop playback of the current content if one.

#### Example
```js
const stopVideo = () => {
  player.stop();
};
```

### <a name="meth-getPosition"></a>getPosition

_return value_: ``Number``

Returns the video element's current position, in seconds.

The difference with the ``getWallClockTime`` method is that for live contents the position is not re-calculated to match a live timestamp.

### <a name="meth-getWallClockTime"></a>getWallClockTime

_return value_: ``Number``

Returns the wall-clock-time of the current position in seconds.

That is:
  - for live content, get a timestamp in seconds of the current position.
  - for static content, returns the position from beginning, also in seconds.

Use this method to display the current position to the user.

### <a name="meth-getVideoDuration"></a>getVideoDuration

_return value_: ``Number``

Returns the duration of the current video, directly from the video element.

### <a name="meth-getVolume"></a>getVolume

_return value_: ``Number``

Current volume of the player, from 0 (no sound) to 1 (maximum sound). 0 if muted (different than videoElement.muted).

### <a name="meth-getError"></a>getError

_return value_: ``Error|null``

Returns the fatal error if it happened. null otherwise.

See [the Player Error documentation](./errors.md) for more informations.

### <a name="meth-seekTo"></a>seekTo

_arguments_: ``Object|Number``

Seek in the current content.

The argument can be an object with a single ``Number`` property, either:
  - ``relative``: seek relatively to the current position
  - ``position``: seek to the given absolute position (equivalent to ``player.getVideoElement().currentTime = newPosition``)
  - ``wallClockTime``: seek to the given wallClock position, as returned by ``getWallClockTime``.

The argument can also just be a ``Number`` property, which will have the same effect than the ``position`` property (absolute position).

### <a name="meth-isLive"></a>isLive

_return value_: ``Boolean``

Returns ``true`` if the content is "live". ``false`` otherwise.

Also ``false`` if no content is loaded yet.

### <a name="meth-getUrl"></a>getUrl

_return value_: ``string|undefined``

Returns the URL of the downloaded manifest.

Returns undefined if no content is loaded yet.

### <a name="meth-isFullscreen"></a>isFullscreen

_return value_: ``Boolean``

Returns ``true`` if the video element is in fullscreen mode, ``false`` otherwise.

### <a name="meth-getAvailableVideoBitrates"></a>getAvailableVideoBitrates

_return value_: ``Array.<Number>``

The different bitrates available for the current video adaptation, in bits per seconds.

### <a name="meth-getAvailableAudioBitrates"></a>getAvailableAudioBitrates

_return value_: ``Array.<Number>``

The different bitrates available for the current audio adaptation, in bits per seconds.

### <a name="meth-getVideoBitrate"></a>getVideoBitrate

_return value_: ``Number``

Returns the video bitrate of the last downloaded video segment, in bits per seconds.

### <a name="meth-getAudioBitrate"></a>getAudioBitrate

_return value_: ``Number``

Returns the audio bitrate of the last downloaded audio segment, in bits per seconds.

### <a name="meth-getMaxVideoBitrate"></a>getMaxVideoBitrate

_return value_: ``Number``

Returns the maximum set video bitrate to which switching is possible, in bits per seconds.

This only affects adaptive strategies (you can bypass this limit by calling ``setVideoBitrate``), and is set to ``Infinity`` when no limit has been set.

### <a name="meth-getMaxAudioBitrate"></a>getMaxAudioBitrate

_return value_: ``Number``

Returns the maximum set audio bitrate to which switching is possible, in bits per seconds.

This only affects adaptive strategies (you can bypass this limit by calling ``setAudioBitrate``), and is set to ``Infinity`` when no limit has been set.

### <a name="meth-setVideoBitrate"></a>setVideoBitrate

_arguments_: ``Number``

Force the current video track to be of a certain bitrate.

If a video representation is found with the exact same bitrate, this representation will be set.

If no video representation is found with the exact same bitrate, either:
  - the video representation immediately inferior to it will be chosen instead (the closest inferior)
  - if no video representation has a bitrate lower than that value, the video representation with the lowest bitrate will be chosen instead.

Set to ``-1`` to deactivate (and thus re-activate adaptive streaming for video tracks).

When active (called with a positive value), adaptive streaming for video tracks will be disabled to stay in the chosen representation.

You can use ``getAvailableVideoBitrates`` to get the list of available bitrates you can set on the current content.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same rules apply for future contents).

### <a name="meth-setAudioBitrate"></a>setAudioBitrate

_arguments_: ``Number``

Force the current audio track to be of a certain bitrate.

If an audio representation (in the current audio adaptation) is found with the exact same bitrate, this representation will be set.

If no audio representation is found with the exact same bitrate, either:
  - the audio representation immediately inferior to it will be chosen instead (the closest inferior)
  - if no audio representation has a bitrate lower than that value, the audio representation with the lowest bitrate will be chosen instead.

Set to ``-1`` to deactivate (and thus re-activate adaptive streaming for audio tracks).

When active (called with a positive value), adaptive streaming for audio tracks will be disabled to stay in the chosen representation.

You can use ``getAvailableAudioBitrates`` to get the list of available bitrates you can set on the current content.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same rules apply for future contents).

### <a name="meth-getManualVideoBitrate"></a>getManualVideoBitrate

_arguments_: ``Number``

Get the last video bitrate manually set. Either via ``setVideoBitrate`` or via the ``initialVideoBitrate`` constructor option.

This value can be different than the one returned by ``getVideoBitrate``:
  - ``getManualVideoBitrate`` returns the last bitrate set manually by the user
  - ``getVideoBitrate`` returns the actual bitrate of the current video track

``-1`` when no video bitrate is forced.

### <a name="meth-getManualAudioBitrate"></a>getManualAudioBitrate

_arguments_: ``Number``

Get the last audio bitrate manually set. Either via ``setAudioBitrate`` or via the ``initialAudioBitrate`` constructor option.

This value can be different than the one returned by ``getAudioBitrate``:
  - ``getManualAudioBitrate`` returns the last bitrate set manually by the user
  - ``getAudioBitrate`` returns the actual bitrate of the current audio track

``-1`` when no audio bitrate is forced.

### <a name="meth-setMaxVideoBitrate"></a>setMaxVideoBitrate

_arguments_: ``Number``

Set the maximum video bitrate reachable through adaptive streaming. The player will never automatically switch to a video representation with a higher bitrate.

This limit can be removed by setting it to ``Infinity``:
```js
// remove video bitrate limit
player.setMaxVideoBitrate(Infinity);
```

This only affects adaptive strategies (you can bypass this limit by calling ``setVideoBitrate``).

### <a name="meth-setMaxAudioBitrate"></a>setMaxAudioBitrate

_arguments_: ``Number``

Set the maximum audio bitrate reachable through adaptive streaming. The player will never automatically switch to a audio representation with a higher bitrate.

This limit can be removed by setting it to ``Infinity``:
```js
// remove audio bitrate limit
player.setMaxAudioBitrate(Infinity);
```

This only affects adaptive strategies (you can bypass this limit by calling ``setAudioBitrate``).

### <a name="meth-setWantedBufferAhead"></a>setWantedBufferAhead

_arguments_: ``Number``

Set the buffering goal, as a duration ahead of the current position, in seconds.
Once this size of buffer reached, the player won't try to download new video segments anymore.

### <a name="meth-getWantedBufferAhead"></a>getWantedBufferAhead

_return value_: ``Number``
_defaults_: ``30``

Returns the buffering goal, as a duration ahead of the current position, in seconds.

### <a name="meth-setMaxBufferBehind"></a>setMaxBufferBehind

_arguments_: ``Number``

Set the maximum kept past buffer, in seconds.
Everything before that limit (``currentPosition - maxBufferBehind``) will be automatically garbage collected.

This feature is not necessary as the browser is already supposed to deallocate memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint of the player, you might want to set this limit. You can set it to ``Infinity`` to remove any limit and just let the browser do this job.

### <a name="meth-getMaxBufferBehind"></a>getMaxBufferBehind

_return value_: ``Number``
_defaults_: ``Infinity``

Returns the maximum kept past buffer, in seconds.

### <a name="meth-setMaxBufferAhead"></a>setMaxBufferAhead

_arguments_: ``Number``

Set the maximum kept buffer ahead of the current position, in seconds.
Everything superior to that limit (``currentPosition + maxBufferAhead``) will be automatically garbage collected. This feature is not necessary as
the browser is already supposed to deallocate memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint of the player, you might want to set this limit. You can set it to ``Infinity`` to remove any limit and just let the browser do this job.

The minimum value between this one and the one returned by ``getWantedBufferAhead`` will be considered when downloading new segments.

:warning: Bear in mind that a too-low configuration there (e.g. inferior to ``10``) might prevent the browser to play the content at all.

### <a name="meth-getMaxBufferAhead"></a>getMaxBufferAhead

_return value_: ``Number``
_defaults_: ``Infinity``

Returns the maximum kept buffer ahead of the current position, in seconds.

### <a name="meth-setFullscreen"></a>setFullscreen

_arguments_: ``Boolean``

Switch or exit the ``<video>`` element to fullscreen mode. The argument is an optional boolean:
  - if set:
    - ``true``: enters fullscreen
    - ``false``: exit fullscreen

  - if not set: enter fullscreen

Note that __only the video element will be set to fullscreen mode__. You might prefer to implement your own method to include your controls in the final UI.

### <a name="meth-exitFullscreen"></a>exitFullscreen

Exit fullscreen mode. Same than ``setFullscreen(false)``.

### <a name="meth-setVolume"></a>setVolume

_arguments_: ``Number``

Set the new volume, from 0 (no sound) to 1 (the maximum sound level).

### <a name="meth-mute"></a>mute

Cut the volume. Basically set the volume to 0 while keeping in memory the previous volume.

### <a name="meth-unMute"></a>unMute

Restore the volume when it has been muted, to the one previous the ``mute`` call.

### <a name="meth-isMute"></a>isMute

_returns_: ``Boolean``

Returns true if the volume is muted i.e., set to 0.

### <a name="meth-getAvailableAudioTracks"></a>getAvailableAudioTracks

_returns_: ``Array.<Object>``

Returns the list of available audio tracks for the current content.

Each of the objects in the returned array have the following properties:
  - ``id`` (``Number|string``): The id used to identify the track. Use it for setting the track via ``setAudioTrack``.
  - ``language`` (``string``): The language the audio track is in, as set in the manifest.
  - ``normalized`` (``string``): An attempt to translate the ``language`` property into an ISO 639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2 language codes). If the translation attempt fails (no corresponding ISO 639-3 language code is found), it will equal the value of ``language``
  - ``audioDescription`` (``Boolean``): Whether the track is an audio description (for the visually impaired or not).
  - ``active`` (``Boolean``): Whether the track is the one currently active or not.

### <a name="meth-getAvailableTextTracks"></a>getAvailableTextTracks

_returns_: ``Array.<Object>``

Returns the list of available text tracks (subtitles) for the current content.

Each of the objects in the returned array have the following properties:
  - ``id`` (``Number|string``): The id used to identify the track. Use it for setting the track via ``setTextTrack``.
  - ``language`` (``string``): The language the text track is in, as set in the manifest.
  - ``normalized`` (``string``): An attempt to translate the ``language`` property into an ISO 639-3 language code (for now only support translations from ISO 639-1 and ISO 639-2 language codes). If the translation attempt fails (no corresponding ISO 639-3 language code is found), it will equal the value of ``language``
  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for the hard of hearing or not.
  - ``active`` (``Boolean``): Whether the track is the one currently active or not.

### <a name="meth-getAudioTrack"></a>getAudioTrack

_returns_: ``Object``

Get the audio track currently set.

The track is an object with the following properties:
  - ``id`` (``Number|string``): The id used to identify the track. Use it for setting the track via ``setAudioTrack``.
  - ``language`` (``string``): The language the audio track is in, as set in the manifest.
  - ``normalized`` (``string``): An attempt to translate the ``language`` property into an ISO 639-3 language code (for now only support translations from ISO 639-1 and ISO 639-3 language codes). If the translation attempt fails (no corresponding ISO 639-3 language code is found), it will equal the value of ``language``
  - ``audioDescription`` (``Boolean``): Whether the track is an audio description (for the visually impaired or not).

### <a name="meth-getTextTrack"></a>getTextTrack

_returns_: ``Object|null``

Get the audio track currently set. ``null`` if no text track is enabled right now.

The track is an object with the following properties:
  - ``id`` (``Number|string``): The id used to identify the track. Use it for setting the track via ``setTextTrack``.
  - ``language`` (``string``): The language the text track is in, as set in the manifest.
  - ``normalized`` (``string``): An attempt to translate the ``language`` property into an ISO 639-3 language code (for now only support translations from ISO 639-1 and ISO 639-3 language codes). If the translation attempt fails (no corresponding ISO 639-3 language code is found), it will equal the value of ``language``
  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for the hard of hearing or not.

### <a name="meth-setAudioTrack"></a>setAudioTrack

_arguments_: ``string|Number``

Set a new audio track from its id, recuperated from ``getAvailableAudioTracks``.

### <a name="meth-setTextTrack"></a>setTextTrack

_arguments_: ``string``

Set a new text track from its id, recuperated from ``getAvailableTextTracks``.

### <a name="meth-disableTextTrack"></a>disableTextTrack

Deactivate the current text track, if one.

### <a name="meth-getManifest"></a>getManifest

_return value_: ``Manifest``

Returns the current loaded Manifest if one. A manifest object structure is relatively complex and is described in the [Manifest Object structure page](./manifest.md).

### <a name="meth-getCurrentAdaptations"></a>getCurrentAdaptations

_return value_: ``Object``

Returns the adaptations being loaded per type if a manifest is loaded. The returned object will have at most a key for each type ("video", "audio", "text" and "image") which will each contain an array of Adaptation Objects.

An Adaptation object structure is relatively complex and is described in the [Manifest Object structure page](./manifest.md#adaptation).

### <a name="meth-getCurrentRepresentations"></a>getCurrentRepresentations

_return value_: ``Object``

Returns the representations being loaded per type if a manifest is loaded. The returned object will have at most a key for each type ("video", "audio", "text" and "image") which will each contain an array of Representation Objects.

An Representation object structure is relatively complex and is described in the [Manifest Object structure page](./manifest.md#representation).

### <a name="meth-dispose"></a>dispose

Free the ressources used by the player.

!warning!: The player won't work correctly after calling this method.

### <a name="meth-getNativeTextTrack"></a>getNativeTextTrack

_return value_: ``TextTrack|null``

Returns the first text track of the video's element, null if none.

This is equivalent to:
```js
const el = player.getVideoElement();
const textTrack = el.textTracks.length ? el.textTracks[0] : null;
```

### <a name="meth-getVideoLoadedTime"></a>getVideoLoadedTime

_return value_: ``Number``

Returns in seconds the difference between:
  - the start of the current contiguous loaded range.
  - the end of it.

### <a name="meth-getVideoPlayedTime"></a>getVideoPlayedTime

_return value_: ``Number``

Returns in seconds the difference between:
  - the start of the current contiguous loaded range.
  - the current time.

### <a name="meth-getVideoBufferGap"></a>getVideoBufferGap

_return value_: ``Number``

Returns in seconds the difference between:
  - the current time.
  - the end of the current contiguous loaded range.

### <a name="meth-getPlaybackRate"></a>getPlaybackRate

_return value_: ``Number``

Returns the current video normal playback rate (speed when playing). ``1`` for normal playbac , ``2`` when playing *2, etc.

### <a name="meth-setPlaybackRate"></a>setPlaybackRate

_arguments_: ``Number``

Updates the "normal" (when playing) playback rate for the video.

/!\ Our adaptive strategies do not, for the moment, take into account the playback rate.

### <a name="meth-getCurrentKeySystem"></a>getCurrentKeySystem

_return value_: ``string|undefined``

Returns the type of keySystem used for DRM-protected contents.

### <a name="meth-getImageTrackData"></a>getImageTrackData

_return value_: ``Array.<Object>|null``

The current image track's data, null if no content is loaded / no image track data is available.

The returned array follows the usual image playlist structure, defined [here](./images.md#api-structure).

### <a name="meth-getMinimumPosition"></a>getMinimumPosition

_return value_: ``Number|null``

The minimum seekable player position. Null if no content is loaded.

This is useful for live contents, where server-side buffer size are often not
infinite. This method allows thus to seek at the earliest possible time.

#### Example

```js
// seeking to the earliest position possible (beginning of the buffer for live
// contents, position '0' for non-live contents).
player.seekTo({
  position: player.getMinimumPosition()
});
```

### <a name="meth-getMaximumPosition"></a>getMaximumPosition

_return value_: ``Number|null``

The maximum seekable player position. Null if no content is loaded.

This is useful for live contents, where the buffer end updates continously.
This method allows thus to seek directly at the live edge of the content.

#### Example

```js
// seeking to the end
player.seekTo({
  position: player.getMaximumPosition()
});
```
