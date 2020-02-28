# RxPlayer API ################################################################


## Table of Contents ###########################################################

- [Overview](#overview)
- [Instantiation](#instantiation)
- [Static properties](#static)
    - [version](#static-version)
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
    - [setVolume](#meth-setVolume)
    - [mute](#meth-mute)
    - [unMute](#meth-unMute)
    - [isMute](#meth-isMute)
    - [getAvailableAudioTracks](#meth-getAvailableAudioTracks)
    - [getAvailableTextTracks](#meth-getAvailableTextTracks)
    - [getAvailableVideoTracks](#meth-getAvailableVideoTracks)
    - [getAudioTrack](#meth-getAudioTrack)
    - [getTextTrack](#meth-getTextTrack)
    - [getVideoTrack](#meth-getVideoTrack)
    - [setAudioTrack](#meth-setAudioTrack)
    - [setTextTrack](#meth-setTextTrack)
    - [disableTextTrack](#meth-disableTextTrack)
    - [setVideoTrack](#meth-setVideoTrack)
    - [setPreferredAudioTracks](#meth-setPreferredAudioTracks)
    - [getPreferredAudioTracks](#meth-getPreferredAudioTracks)
    - [setPreferredTextTracks](#meth-setPreferredTextTracks)
    - [getPreferredTextTracks](#meth-getPreferredTextTracks)
    - [getCurrentAdaptations](#meth-getCurrentAdaptations)
    - [getCurrentRepresentations](#meth-getCurrentRepresentations)
    - [dispose](#meth-dispose)
    - [getVideoLoadedTime](#meth-getVideoLoadedTime)
    - [getVideoPlayedTime](#meth-getVideoPlayedTime)
    - [getVideoBufferGap](#meth-getVideoBufferGap)
    - [getPlaybackRate](#meth-getPlaybackRate)
    - [setPlaybackRate](#meth-setPlaybackRate)
    - [getCurrentKeySystem](#meth-getCurrentKeySystem)
    - [getMinimumPosition](#meth-getMinimumPosition)
    - [getMaximumPosition](#meth-getMaximumPosition)
    - [getImageTrackData (deprecated)](#meth-getImageTrackData)
    - [setFullscreen (deprecated)](#meth-setFullscreen)
    - [exitFullscreen (deprecated)](#meth-exitFullscreen)
    - [isFullscreen (deprecated)](#meth-isFullscreen)
    - [getNativeTextTrack (deprecated)](#meth-getNativeTextTrack)
- [Tools](#tools)
    - [Experimental - MediaCapabilitiesProber](#tools-mediaCapabilitiesProber)
    - [Experimental - TextTrackRenderer](#tools-textTrackRenderer)
    - [Experimental - parseBifThumbnails](#tools-parseBifThumbnails)
    - [Experimental - createMetaplaylist](#tools-createMetaplaylist)



<a name="overview"></a>
## Overview ####################################################################

The RxPlayer has a complete API allowing you to:
  - load and stop video or audio contents
  - perform trickmodes (play, pause, seek, etc.) as a content is loaded.
  - get multiple information on the current content and on the player's state.
  - choose a specific audio language or subtitles track
  - set your own bitrate and buffer length
  - and more

The following pages define the entire API.

:warning: Only variables and methods defined here are considered as part of the
API. Any other property or method you might find by using our library can change
without notice (not considered as part of the API).

Only use the documented variables and open an issue if you think it's not
enough.

_Note: As some terms used here might be too foreign or slightly different than
the one you're used to, we also wrote a list of terms and definitions used by
the RxPlayer [here](../terms.md)._



<a name="instantiation"></a>
## Instantiation ##############################################################

Instantiating a new player is straightforward:
```js
import RxPlayer from "rx-player";
const player = new RxPlayer(options);
```

The options are all... optional. They are all defined in the [Player Options
page](./player_options.md).



<a name="static"></a>
## Static properties ###########################################################

<a name="static-version"></a>
### version ####################################################################

_type_: ``Number``

The current version of the RxPlayer.


<a name="static-ErrorTypes"></a>
### ErrorTypes #################################################################

_type_: ``Object``

The different "types" of Error you can get on playback error,

See [the Player Error documentation](./errors.md) for more information.


<a name="static-ErrorCodes"></a>
### ErrorCodes #################################################################

_type_: ``Object``

The different Error "codes" you can get on playback error,

See [the Player Error documentation](./errors.md) for more information.


<a name="static-LogLevel"></a>
### LogLevel ###################################################################

_type_: ``string``

_default_: ``"NONE"``

The current level of verbosity for the RxPlayer logs. Those logs all use the
console.

From the less verbose to the most:

  - ``"NONE"``: no log

  - ``"ERROR"``: unexpected errors (via ``console.error``)

  - ``"WARNING"``: The previous level + minor problems encountered (via
    ``console.warn``)

  - ``"INFO"``: The previous levels + noteworthy events (via ``console.info``)

  - ``"DEBUG"``: The previous levels + normal events of the player (via
    ``console.log``)


If the value set to this property is different than those, it will be
automatically set to ``"NONE"``.

#### Example
```js
import RxPlayer from "rx-player";
RxPlayer.LogLevel = "WARNING";
```



<a name="meth"></a>
## Methods #####################################################################

<a name="meth-loadVideo"></a>
### loadVideo ##################################################################

_arguments_:
  - _options_ (``Object``)

Loads a new video described in the argument.

The options possible as arguments are all defined in [this
page](./loadVideo_options.md).

#### Example
```js
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```


<a name="meth-getVideoElement"></a>
### getVideoElement ############################################################

_return value_: ``HTMLMediaElement``

Returns the video element used by the player.

You're not encouraged to use its API, you should always prefer the Player's API.

#### Example
```js
const videoElement = player.getVideoElement();
videoElement.className = "my-video-element";
```


<a name="meth-getPlayerState"></a>
### getPlayerState #############################################################

_return value_: ``string``

The current player's state.
Can be either one of those strings:

  - ``"STOPPED"``: The player is idle. No content is loading nor is loaded.

  - ``"LOADING"``: The player is loading a new content.
    Most APIs related to the current content are not yet available while the
    content is loading.

  - ``"LOADED"``: The player has loaded the new content, it is now ready to
    play.
    From this point onward you can use APIs interacting with the current content
    such as ``seekTo`` or ``setAudioTrack``.

  - ``"PLAYING"``: The player is currently playing the content.

  - ``"PAUSED"``: The player has paused.

  - ``"ENDED"``: The player has reached the end of the current content.

  - ``"BUFFERING"``: the player has reached the end of the buffer and is waiting
    for data to be appended.

  - ``"SEEKING"``: The player has reached the end of the buffer because a seek
    has been performed, new segments are being loaded.

  - ``"RELOADING"``: The player needs to reload its current (for example, when
    switching the current video track).
    While this state is active, most API related to the currently playing
    content are not available. This state should be treated like the ``LOADING``
    state.

As it is a central part of our API and can be difficult concept to understand,
we have a special [page of documentation on player states](./states.md).

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
  case "RELOADING":
    console.log("The content is currently reloading");
    break;
  default:
    console.log("This is impossible (issue material!).")
    break;
}
```


<a name="meth-addEventListener"></a>
### addEventListener ###########################################################

_arguments_:

  - _event_ (``string``): The event name.

  - _callback_ (``Function``): The callback for the event.
    The same callback may be used again when calling ``removeEventListener``.


Add an event listener to trigger a callback as it happens. The callback will
have the event payload as a single argument.

To have the complete list of player events, consult the [Player events
page](./player_events.md).

#### Example
```js
player.addEventListener("Error", function(err) {
  console.log(`The player crashed: ${err.message}`);
});
```


<a name="meth-removeEventListener"></a>
### removeEventListener ########################################################

_arguments_:
  - _event_ (``string``): The event name.
  - _callback_ (optional) (``Function``): The callback given when calling the
    corresponding ``addEventListener`` API.

Remove an event listener. That is, stop your registered callback (with
``addEventListener``) to be called as events happen and free up ressources.

The callback given is optional: if not given, _every_ registered callback to
that event will be removed. That's why using both arguments is recommended for
most usecase.

#### Example
```js
player.removeEventListener("playerStateChange", listenerCallback);
```


<a name="meth-play"></a>
### play #######################################################################

_return value_: ``Promise.<void>``

Play/resume the current video. Equivalent to a video element's play method.

The returned Promise informs you on the result:

  - if playback succeeds, the Promise is fulfilled

  - if playback fails, the Promise is rejected along with an error message
    explaining the failure - coming directly from the browser.

    Such failure can for example be due to your browser's policy, which may
    forbid to call play on a media element without any user interaction.
    Please note that in that case, you will also receive a
    [warning event](./errors.md) containing a `MEDIA_ERROR` with the code:
    `MEDIA_ERR_PLAY_NOT_ALLOWED`.

Note: On browsers which do not support Promises natively (such as Internet
Explorer 11), a JavaScript implementation is provided instead. This
implementation has the exact same implementation than [ES2015
Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).

#### Example
```js
const resumeContent = () => {
  player.play();
};
```


<a name="meth-pause"></a>
### pause ######################################################################

Pause the current video. Equivalent to a video element's pause method.

Note that a content can be paused even if its current state is ``BUFFERING`` or
``SEEKING``.

#### Example
```js
const pauseContent = () => {
  player.pause();
};
```


<a name="meth-stop"></a>
### stop #######################################################################

Stop playback of the current content if one.

#### Example
```js
const stopVideo = () => {
  player.stop();
};
```


<a name="meth-getPosition"></a>
### getPosition ################################################################

_return value_: ``Number``

Returns the video element's current position, in seconds.

The difference with the ``getWallClockTime`` method is that for live contents
the position is not re-calculated to match a live timestamp.

#### Example
```js
const pos = player.getPosition();
console.log(`The video element's current position is: ${pos} second(s)`);
```


<a name="meth-getWallClockTime"></a>
### getWallClockTime ###########################################################

_return value_: ``Number``

Returns the wall-clock-time of the current position in seconds.

That is:
  - for live content, get a timestamp in seconds of the current position.
  - for static content, returns the position from beginning, also in seconds.

Use this method to display the current position to the user.

#### Example
```js
const wallClockTime = player.getWallClockTime();
const nowInSeconds = Date.now() / 1000;
const delta = nowInSeconds - wallClockTime;

if (delta < 5) { // (5 seconds of margin)
  console.log("You're playing live");
} else {
  console.log(`You're playing ${delta} seconds behind the live content`);
}
```


<a name="meth-getVideoDuration"></a>
### getVideoDuration ###########################################################

_return value_: ``Number``

Returns the duration of the current video, directly from the video element.

#### Example
```js
const pos = player.getPosition();
const dur = player.getVideoDuration();

console.log(`current position: ${pos} / ${dur}`);
```


<a name="meth-getVolume"></a>
### getVolume ##################################################################

_return value_: ``Number``

Current volume of the player, from 0 (no sound) to 1 (maximum sound). 0 if muted
(different than videoElement.muted).

#### Example
```js
const volume = player.getVolume();

if (volume === 1) {
  console.log("You're playing at maximum volume");
} else if (volume === 0) {
  console.log("You're playing at no volume");
} else if (volume > 0.5) {
  console.log("You're playing at a high volume");
} else {
  console.log("You're playing at a low volume");
}
```


<a name="meth-getError"></a>
### getError ###################################################################

_return value_: ``Error|null``

Returns the fatal error if it happened. null otherwise.

See [the Player Error documentation](./errors.md) for more information.

#### Example
```js
const error = player.getError();

if (!error) {
  console.log("The player did not crash");
} else if (error.code === "PIPELINE_LOAD_ERROR") {
  console.error("The player crashed due to a failing request");
} else {
  console.error(`The player crashed: ${error.code}`);
}
```


<a name="meth-seekTo"></a>
### seekTo #####################################################################

_arguments_: ``Object|Number``

Seek in the current content.

The argument can be an object with a single ``Number`` property, either:

  - ``relative``: seek relatively to the current position

  - ``position``: seek to the given absolute position (equivalent to
    ``player.getVideoElement().currentTime = newPosition``)

  - ``wallClockTime``: seek to the given wallClock position, as returned by
    ``getWallClockTime``.

The argument can also just be a ``Number`` property, which will have the same
effect than the ``position`` property (absolute position).

#### Example
```js
// seeking to 54 seconds from the start of the content
player.seekTo({ position: 54 });

// equivalent to just:
player.seekTo(54);

// seeking 5 seconds after the current position
player.seekTo({ relative: 5 });

// seeking 5 seconds before the current position
player.seekTo({ relative: -5 });

// seeking to live content
player.seekTo({ wallClockTime: Date.now() / 1000 });
```


<a name="meth-isLive"></a>
### isLive #####################################################################

_return value_: ``Boolean``

Returns ``true`` if the content is a "live" content (e.g. a live TV Channel).
``false`` otherwise.

Also ``false`` if no content is loaded yet.

#### Example
```js
if (player.isLive()) {
  console.log("We're playing a live content");
}
```


<a name="meth-getUrl"></a>
### getUrl #####################################################################

_return value_: ``string|undefined``

Returns the URL of the downloaded [Manifest](../terms.md#manifest).

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns the URL of the content
being played.

Returns ``undefined`` if no content is loaded yet.

#### Example
```js
const url = player.getUrl();
if (url) {
  console.log("We are playing the following content:", url);
}
```


<a name="meth-getAvailableVideoBitrates"></a>
### getAvailableVideoBitrates ##################################################

_return value_: ``Array.<Number>``

The different bitrates available for the current video
[Adaptation](../terms.md#adaptation), in bits per seconds.

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns an empty Array.

#### Example
```js
const videoBitrates = player.getAvailableVideoBitrates();
if (videoBitrates.length) {
  console.log(
    "The current video is available in the following bitrates",
    videoBitrates.join(", ")
  );
}
```


<a name="meth-getAvailableAudioBitrates"></a>
### getAvailableAudioBitrates ##################################################

_return value_: ``Array.<Number>``

The different bitrates available for the current audio
[Adaptation](../terms.md#adaptation), in bits per seconds.

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns an empty Array.

#### Example
```js
const audioBitrates = player.getAvailableAudioBitrates();
if (audioBitrates.length) {
  console.log(
    "The current audio is available in the following bitrates",
    audioBitrates.join(", ")
  );
}
```


<a name="meth-getVideoBitrate"></a>
### getVideoBitrate ############################################################

_return value_: ``Number|undefined``

Returns the video bitrate of the last downloaded video segment, in bits per
seconds.

Returns ``undefined`` if no content is loaded.

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns ``undefined``.


<a name="meth-getAudioBitrate"></a>
### getAudioBitrate ############################################################

_return value_: ``Number|undefined``

Returns the audio bitrate of the last downloaded audio segment, in bits per
seconds.

Returns ``undefined`` if no content is loaded.

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns ``undefined``.


<a name="meth-getMaxVideoBitrate"></a>
### getMaxVideoBitrate #########################################################

_return value_: ``Number|undefined``

Returns the maximum set video bitrate to which switching is possible, in bits
per seconds.

This only affects adaptive strategies (you can bypass this limit by calling
``setVideoBitrate``), and is set to ``Infinity`` when no limit has been set.


<a name="meth-getMaxAudioBitrate"></a>
### getMaxAudioBitrate #########################################################

_return value_: ``Number"undefined``

Returns the maximum set audio bitrate to which switching is possible, in bits
per seconds.

This only affects adaptive strategies (you can bypass this limit by calling
``setAudioBitrate``), and is set to ``Infinity`` when no limit has been set.


<a name="meth-setVideoBitrate"></a>
### setVideoBitrate ############################################################

_arguments_: ``Number``

Force the current video track to be of a certain bitrate.

If an video [Representation](../terms.md#representation) (in the current video
[Adaptation](../terms.md#adaptation)) is found with the exact same bitrate, this
Representation will be set.

If no video Representation is found with the exact same bitrate, either:

  - the video Representation immediately inferior to it will be chosen instead
    (the closest inferior)

  - if no video Representation has a bitrate lower than that value, the video
    Representation with the lowest bitrate will be chosen instead.


Set to ``-1`` to deactivate (and thus re-activate adaptive streaming for video
tracks).

When active (called with a positive value), adaptive streaming for video tracks
will be disabled to stay in the chosen Representation.

You can use ``getAvailableVideoBitrates`` to get the list of available bitrates
you can set on the current content.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same
rules apply for future contents).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-setAudioBitrate"></a>
### setAudioBitrate ############################################################

_arguments_: ``Number``

Force the current audio track to be of a certain bitrate.

If an audio [Representation](../terms.md#representation) (in the current audio
[Adaptation](../terms.md#adaptation)) is found with the exact same bitrate, this
Representation will be set.

If no audio Representation is found with the exact same bitrate, either:

  - the audio Representation immediately inferior to it will be chosen instead
    (the closest inferior)

  - if no audio Representation has a bitrate lower than that value, the audio
    Representation with the lowest bitrate will be chosen instead.


Set to ``-1`` to deactivate (and thus re-activate adaptive streaming for audio
tracks).

When active (called with a positive value), adaptive streaming for audio tracks
will be disabled to stay in the chosen Representation.

You can use ``getAvailableAudioBitrates`` to get the list of available bitrates
you can set on the current content.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same
rules apply for future contents).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-getManualVideoBitrate"></a>
### getManualVideoBitrate ######################################################

_arguments_: ``Number``

Get the last video bitrate manually set. Either via ``setVideoBitrate`` or via
the ``initialVideoBitrate`` constructor option.

This value can be different than the one returned by ``getVideoBitrate``:
  - ``getManualVideoBitrate`` returns the last bitrate set manually by the user
  - ``getVideoBitrate`` returns the actual bitrate of the current video track

``-1`` when no video bitrate is forced.


<a name="meth-getManualAudioBitrate"></a>
### getManualAudioBitrate ######################################################

_arguments_: ``Number``

Get the last audio bitrate manually set. Either via ``setAudioBitrate`` or via
the ``initialAudioBitrate`` constructor option.

This value can be different than the one returned by ``getAudioBitrate``:
  - ``getManualAudioBitrate`` returns the last bitrate set manually by the user
  - ``getAudioBitrate`` returns the actual bitrate of the current audio track

``-1`` when no audio bitrate is forced.


<a name="meth-setMaxVideoBitrate"></a>
### setMaxVideoBitrate #########################################################

_arguments_: ``Number``

Set the maximum video bitrate reachable through adaptive streaming. The player
will never automatically switch to a video
[Representation](../terms.md#representation) with a higher bitrate.

This limit can be removed by setting it to ``Infinity``:
```js
// remove video bitrate limit
player.setMaxVideoBitrate(Infinity);
```

This only affects adaptive strategies (you can bypass this limit by calling
``setVideoBitrate``).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-setMaxAudioBitrate"></a>
### setMaxAudioBitrate #########################################################

_arguments_: ``Number``

Set the maximum audio bitrate reachable through adaptive streaming. The player
will never automatically switch to a audio
[Representation](../terms.md#representation) with a higher bitrate.

This limit can be removed by setting it to ``Infinity``:
```js
// remove audio bitrate limit
player.setMaxAudioBitrate(Infinity);
```

This only affects adaptive strategies (you can bypass this limit by calling
``setAudioBitrate``).

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-setWantedBufferAhead"></a>
### setWantedBufferAhead #######################################################

_arguments_: ``Number``

Set the buffering goal, as a duration ahead of the current position, in seconds.
Once this size of buffer reached, the player won't try to download new video
segments anymore.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-getWantedBufferAhead"></a>
### getWantedBufferAhead #######################################################

_return value_: ``Number``
_defaults_: ``30``

returns the buffering goal, as a duration ahead of the current position, in
seconds.


<a name="meth-setMaxBufferBehind"></a>
### setMaxBufferBehind #########################################################

_arguments_: ``Number``

Set the maximum kept past buffer, in seconds.
Everything before that limit (``currentPosition - maxBufferBehind``) will be
automatically garbage collected.

This feature is not necessary as the browser is already supposed to deallocate
memory from old segments if/when the memory is scarce.

However on some custom targets, or just to better control the memory imprint
of the player, you might want to set this limit. You can set it to
``Infinity`` to remove any limit and just let the browser do this job.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-getMaxBufferBehind"></a>
### getMaxBufferBehind #########################################################

_return value_: ``Number``
_defaults_: ``Infinity``

Returns the maximum kept past buffer, in seconds.


<a name="meth-setMaxBufferAhead"></a>
### setMaxBufferAhead ##########################################################

_arguments_: ``Number``

Set the maximum kept buffer ahead of the current position, in seconds.
Everything superior to that limit (``currentPosition + maxBufferAhead``) will
be automatically garbage collected. This feature is not necessary as
the browser is already supposed to deallocate memory from old segments if/when
the memory is scarce.

However on some custom targets, or just to better control the memory imprint of
the player, you might want to set this limit. You can set it to ``Infinity`` to
remove any limit and just let the browser do this job.

The minimum value between this one and the one returned by
``getWantedBufferAhead`` will be considered when downloading new segments.

:warning: Bear in mind that a too-low configuration there (e.g. inferior to
``10``) might prevent the browser to play the content at all.

---

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).

---


<a name="meth-getMaxBufferAhead"></a>
### getMaxBufferAhead ##########################################################

_return value_: ``Number``
_defaults_: ``Infinity``

Returns the maximum kept buffer ahead of the current position, in seconds.


<a name="meth-setVolume"></a>
### setVolume ##################################################################

_arguments_: ``Number``

Set the new volume, from 0 (no sound) to 1 (the maximum sound level).


<a name="meth-mute"></a>
### mute #######################################################################

Cut the volume. Basically set the volume to 0 while keeping in memory the
previous volume.


<a name="meth-unMute"></a>
### unMute #####################################################################

Restore the volume when it has been muted, to the one previous the ``mute``
call.


<a name="meth-isMute"></a>
### isMute #####################################################################

_returns_: ``Boolean``

Returns true if the volume is muted i.e., set to 0.


<a name="meth-getAvailableAudioTracks"></a>
### getAvailableAudioTracks ####################################################

_returns_: ``Array.<Object>``

Returns the list of available audio tracks for the current content.

Each of the objects in the returned array have the following properties:

  - ``active`` (``Boolean``): Whether the track is the one currently active or
    not.

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

  - ``dub`` (``Boolean|undefined``): If set to `true`, this audio track is a
    "dub", meaning it was recorded in another language than the original.
    If set to `false`, we know that this audio track is in an original language.
    This property is `undefined` if we do not known whether it is in an original
    language.


In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there are
no supported tracks in the file or no track management API : returns an empty
Array.


<a name="meth-getAvailableTextTracks"></a>
### getAvailableTextTracks #####################################################

_returns_: ``Array.<Object>``

Returns the list of available text tracks (subtitles) for the current content.

Each of the objects in the returned array have the following properties:

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


In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there are
no supported tracks in the file or no track management API : returns an empty
Array.


<a name="meth-getAvailableVideoTracks"></a>
### getAvailableVideoTracks ####################################################

_returns_: ``Array.<Object>``

Returns the list of available video tracks for the current content.

Each of the objects in the returned array have the following properties:

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


In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there are
no supported tracks in the file or no track management API : returns an empty
Array.


<a name="meth-getAudioTrack"></a>
### getAudioTrack ##############################################################

_returns_: ``Object|null|undefined``

Get the audio track currently set. ``null`` if no audio track is enabled right
now.

The track is an object with the following properties:

  - ``id`` (``Number|string``): The id used to identify the track. Use it for
    setting the track via ``setAudioTrack``.

  - ``language`` (``string``): The language the audio track is in, as set in the
    [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``audioDescription`` (``Boolean``): Whether the track is an audio
    description (for the visually impaired or not).

  - ``dub`` (``Boolean|undefined``): If set to `true`, this audio track is a
    "dub", meaning it was recorded in another language than the original.
    If set to `false`, we know that this audio track is in an original language.
    This property is `undefined` if we do not known whether it is in an original
    language.


``undefined`` if no content has been loaded yet.

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no audio tracks API in the browser, return ``undefined``.

<a name="meth-getTextTrack"></a>
### getTextTrack ###############################################################

_returns_: ``Object|null``

Get the audio track currently set. ``null`` if no text track is enabled right
now.

The track is an object with the following properties:

  - ``id`` (``Number|string``): The id used to identify the track. Use it for
    setting the track via ``setTextTrack``.

  - ``language`` (``string``): The language the text track is in, as set in the
    [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for
    the hard of hearing or not.


``undefined`` if no content has been loaded yet.

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no text tracks API in the browser, return ``undefined``.


<a name="meth-getVideoTrack"></a>
### getVideoTrack ##############################################################

_returns_: ``Object|null|undefined``

Get the video track currently set. ``null`` if no video track is enabled right
now.

The track is an object with the following properties:

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

``undefined`` if no content has been loaded yet.


In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no video tracks API in the browser, return ``undefined``.


<a name="meth-setAudioTrack"></a>
### setAudioTrack ##############################################################

_arguments_: ``string|Number``

Set a new audio track from its id, recuperated from ``getAvailableAudioTracks``.

---

:warning: If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :
- The HLS defines variants, groups of tracks that may be read together
- Safari may decide to enable a track for accessibility or user language
convenience (e.g. Safari may switch subtitle to your OS language if you pick
another audio language)
The user may know through the [videoTrackChange]
(./player_events.md#events-videoTrackChange) event that the track has changed.

---


<a name="meth-setTextTrack"></a>
### setTextTrack ###############################################################

_arguments_: ``string``

Set a new text track from its id, recuperated from ``getAvailableTextTracks``.

---

:warning: If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :
- The HLS defines variants, groups of tracks that may be read together
- Safari may decide to enable a track for accessibility or user language
convenience (e.g. Safari may switch subtitle to your OS language if you pick
another audio language)
The user may know through the [audioTrackChange]
(./player_events.md#events-audioTrackChange) event that the track has changed.

---


<a name="meth-disableTextTrack"></a>
### disableTextTrack ###########################################################

Deactivate the current text track, if one.


<a name="meth-setVideoTrack"></a>
### setVideoTrack ##############################################################

_arguments_: ``string|Number``

Set a new video track from its id, recuperated from ``getAvailableVideoTracks``.

Setting a new video track when a previous one was already playing can lead the
rx-player to "reload" this content.

During this period of time:
  - the player will have the state ``RELOADING``
  - Multiple APIs linked to the current content might not work.
    Most notably:
      - ``play`` will not work
      - ``pause`` will not work
      - ``seekTo`` will not work
      - ``getPosition`` will return 0
      - ``getWallClockTime`` will return 0
      - ``getVideoDuration`` will return ``NaN``
      - ``getAvailableAudioTracks`` will return an empty array
      - ``getAvailableTextTracks`` will return an empty array
      - ``getAvailableVideoTracks`` will return an empty array
      - ``getTextTrack`` will return ``null``
      - ``getAudioTrack`` will return ``null``
      - ``setAudioTrack`` will throw
      - ``setTextTrack`` will throw

---

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No audio track API was supported on the current browser
- The media file tracks are not supported on the browser

---


<a name="meth-setPreferredAudioTracks"></a>
### setPreferredAudioTracks ####################################################

_arguments_: ``Array.<Object>``

Update the audio language preferences at any time.

This method takes an array of objects describing the languages wanted:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  audioDescription: false // {Boolean} Whether the audio track should be an
                          // audio description for the visually impaired
}
```

All elements in that Array should be set in preference order: from the most
preferred to the least preferred.

When encountering a new Period or a new content, the RxPlayer will then try to
choose its audio track by comparing what is available with your current
preferences (i.e. if the most preferred is not available, it will look if the
second one is etc.).

Please note that those preferences will only apply either to the next loaded
content or to the next newly encountered Period.
Simply put, once set this preference will be applied to all contents but:

  - the current Period being played (or the current loaded content, in the case
    of Smooth streaming). In that case, the current audio preference will stay
    in place.

  - the Periods which have already been played in the current loaded content.
    Those will keep the last set audio preference at the time it was played.

To update the current audio track in those cases, you should use the
`setAudioTrack` method.

#### Example

Let's imagine that you prefer to have french or italian over all other audio
languages. If not found, you want to fallback to english.
You will thus call ``setPreferredAudioTracks`` that way.

```js
player.setPreferredAudioTracks([
  { language: "fra", audioDescription: false },
  { language: "ita", audioDescription: false },
  { language: "eng", audioDescription: false }
])
```

---

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No audio track API was supported on the current browser
- The media file tracks are not supported on the browser

---


<a name="meth-getPreferredAudioTracks"></a>
### getPreferredAudioTracks ####################################################

_return value_: ``Array.<Object>``

Returns the current list of preferred audio tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredAudioTracks` constructor option or the last `setPreferredAudioTracks`
if it was called:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  audioDescription: false // {Boolean} Whether the audio track should be an
                          // audio description for the visually impaired
}
```


<a name="meth-setPreferredTextTracks"></a>
### setPreferredTextTracks #####################################################

_arguments_: ``Array.<Object|null>``

Update the text track (or subtitles) preferences at any time.

This method takes an array of objects describing the languages wanted:
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

All elements in that Array should be set in preference order: from the most
preferred to the least preferred. You can set `null` for no subtitles.

When encountering a new Period or a new content, the RxPlayer will then try to
choose its text track by comparing what is available with your current
preferences (i.e. if the most preferred is not available, it will look if the
second one is etc.).

Please note that those preferences will only apply either to the next loaded
content or to the next newly encountered Period.
Simply put, once set this preference will be applied to all contents but:

  - the current Period being played (or the current loaded content, in the case
    of Smooth streaming). In that case, the current text track preference will
    stay in place.

  - the Periods which have already been played in the current loaded content.
    Those will keep the last set text track preference at the time it was
    played.

To update the current text track in those cases, you should use the
`setTextTrack` method.

#### Example

Let's imagine that you prefer to have french or italian subtitles.If not found,
you want no subtitles at all.

You will thus call ``setPreferredTextTracks`` that way.

```js
player.setPreferredTextTracks([
  { language: "fra", closedCaption: false },
  { language: "ita", closedCaption: false },
  null
])
```

---

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No text track API was supported on the current browser
- The media file tracks are not supported on the browser

---


<a name="meth-getPreferredTextTracks"></a>
### getPreferredTextTracks #####################################################

_return value_: ``Array.<Object|null>``

Returns the current list of preferred text tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredTextTracks` constructor option or the last `setPreferredTextTracks` if
it was called:

```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```


<a name="meth-getManifest"></a>
### getManifest ################################################################

_return value_: ``Manifest|null``

Returns the current loaded [Manifest](../terms.md#manifest) if one.
The Manifest object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md).

``null`` if the player is either stopped or not loaded.

``null`` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).

The Manifest will be available before the player reaches the ``"LOADED"`` state.


<a name="meth-getCurrentAdaptations"></a>
### getCurrentAdaptations ######################################################

_return value_: ``Object|null``

Returns the [Adaptations](../terms.md#adaptation) being loaded per type if a
[Manifest](../terms.md#manifest) is loaded. The returned object will have at
most a key for each type ("video", "audio", "text" and "image") which will each
contain an array of Adaptation Objects.

The Adaptation object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md#adaptation).

``null`` if the current Adaptations are not known yet.

``null`` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).


<a name="meth-getCurrentRepresentations"></a>
### getCurrentRepresentations ##################################################

_return value_: ``Object|null``

Returns the [Representations](../terms.md#representation) being loaded per type
if a [Manifest](../terms.md#manifest) is loaded. The returned object will have
at most a key for each type ("video", "audio", "text" and "image") which will
each contain an array of Representation Objects.

An Representation object structure is relatively complex and is described in the
[Manifest Object structure page](./manifest.md#representation).

``null`` if the current Representations are not known yet.

``null`` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).


<a name="meth-dispose"></a>
### dispose ####################################################################

Free the ressources used by the player.

!warning!: The player won't work correctly after calling this method.


<a name="meth-getVideoLoadedTime"></a>
### getVideoLoadedTime #########################################################

_return value_: ``Number``

Returns in seconds the difference between:
  - the start of the current contiguous loaded range.
  - the end of it.


<a name="meth-getVideoPlayedTime"></a>
### getVideoPlayedTime #########################################################

_return value_: ``Number``

Returns in seconds the difference between:
  - the start of the current contiguous loaded range.
  - the current time.


<a name="meth-getVideoBufferGap"></a>
### getVideoBufferGap ##########################################################

_return value_: ``Number``

Returns in seconds the difference between:
  - the current time.
  - the end of the current contiguous loaded range.


<a name="meth-getPlaybackRate"></a>
### getPlaybackRate ############################################################

_return value_: ``Number``

Returns the current video normal playback rate (speed when playing). ``1`` for
normal playback, ``2`` when playing *2, etc.


<a name="meth-setPlaybackRate"></a>
### setPlaybackRate ############################################################

_arguments_: ``Number``

Updates the "normal" (when playing) playback rate for the video.


<a name="meth-getCurrentKeySystem"></a>
### getCurrentKeySystem ########################################################

_return value_: ``string|undefined``

Returns the type of keySystem used for DRM-protected contents.


<a name="meth-getMinimumPosition"></a>
### getMinimumPosition #########################################################

_return value_: ``Number|null``

The minimum seekable player position. ``null`` if no content is loaded.

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


<a name="meth-getMaximumPosition"></a>
### getMaximumPosition #########################################################

_return value_: ``Number|null``

The maximum seekable player position. ``null`` if no content is loaded.

This is useful for live contents, where the buffer end updates continously.
This method allows thus to seek directly at the live edge of the content.

#### Example
```js
// seeking to the end
player.seekTo({
  position: player.getMaximumPosition()
});
```


<a name="meth-getImageTrackData"></a>
### getImageTrackData ##########################################################

---

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_return value_: ``Array.<Object>|null``

The current image track's data, null if no content is loaded / no image track
data is available.

The returned array follows the usual image playlist structure, defined
[here](./images.md#api-structure).

``null`` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).


<a name="meth-setFullscreen"></a>
### setFullscreen ##############################################################

---

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_arguments_: ``Boolean``

Switch or exit the ``<video>`` element to fullscreen mode. The argument is an
optional boolean:
  - if set:
    - ``true``: enters fullscreen
    - ``false``: exit fullscreen

  - if not set: enter fullscreen

Note that __only the video element will be set to fullscreen mode__. You might
prefer to implement your own method to include your controls in the final UI.


<a name="meth-exitFullscreen"></a>
### exitFullscreen #############################################################

---

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

Exit fullscreen mode. Same than ``setFullscreen(false)``.


<a name="meth-isFullscreen"></a>
### isFullscreen ###############################################################

---

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_return value_: ``Boolean``

Returns ``true`` if the video element is in fullscreen mode, ``false``
otherwise.

#### Example
```js
if (player.isFullscreen()) {
  console.log("The player is in fullscreen mode");
}
```


<a name="meth-getNativeTextTrack"></a>
### getNativeTextTrack #########################################################

---

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

---

_return value_: ``TextTrack|null``

Returns the first text track of the video's element, null if none.

This is equivalent to:
```js
const el = player.getVideoElement();
const textTrack = el.textTracks.length ? el.textTracks[0] : null;
```



<a name="tools"></a>
## Tools #######################################################################


<a name="tools-mediaCapabilitiesProber"></a>
### MediaCapabilitiesProber ####################################################

---

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

---


An experimental tool to probe browser media capabilities:
  - Decoding capabilities
  - DRM support
  - HDCP support
  - Display capabilities

You can find its documentation [here](./mediaCapabilitiesProber.md).


<a name="tools-textTrackRenderer"></a>
### TextTrackRenderer ##########################################################

---

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

---

The TextTrackRenderer allows to easily render subtitles synchronized to a video
element.

It allows easily to dynamically add subtitles (as long as it is in one of the
following format: srt, ttml, webVTT or SAMI) to a played video.

This tool is documented [here](./TextTrackRenderer.md).


<a name="tools-parseBifThumbnails"></a>
### parseBifThumbnails #########################################################

---

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

---

The `parseBifThumbnails` function parses BIF files, which is a format created by
Canal+ to declare thumbnails linked to a given content.

This tool is documented [here](./parseBifThumbnails.md).

<a name="tools-createMetaplaylist"></a>
### createMetaplaylist #########################################################

---

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

---

The `createMetaplaylist` function build a metaplaylist object from given
informations about contents.

This tool is documented [here](./createMetaplaylist.md).
