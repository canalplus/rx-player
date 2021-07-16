# RxPlayer API ################################################################

## Quick links ################################################################

- [Player Events](./player_events.md)
- [Player errors and warning](./errors.md)
- [Player Constructor options](./player_options.md)
- [`loadVideo` options](./loadVideo_options.md)


## Table of Contents ###########################################################

- [Overview](#overview)
- [Instantiation](#instantiation)
- [Basic methods](#meth-group-basic)
    - [loadVideo](#meth-loadVideo)
    - [reload](#meth-reload)
    - [getPlayerState](#meth-getPlayerState)
    - [addEventListener](#meth-addEventListener)
    - [removeEventListener](#meth-removeEventListener)
    - [play](#meth-play)
    - [pause](#meth-pause)
    - [stop](#meth-stop)
    - [getPosition](#meth-getPosition)
    - [getWallClockTime](#meth-getWallClockTime)
    - [seekTo](#meth-seekTo)
    - [getMinimumPosition](#meth-getMinimumPosition)
    - [getMaximumPosition](#meth-getMaximumPosition)
    - [getMediaDuration](#meth-getMediaDuration)
    - [getError](#meth-getError)
    - [getMediaElement](#meth-getMediaElement)
    - [dispose](#meth-dispose)
 - [Speed control and trickmodes](#meth-group-speed-control)
    - [setPlaybackRate](#meth-setPlaybackRate)
    - [getPlaybackRate](#meth-getPlaybackRate)
    - [areTrickModeTracksEnabled](#meth-areTrickModeTracksEnabled)
 - [Volume control](#meth-group-volume-control)
    - [setVolume](#meth-setVolume)
    - [getVolume](#meth-getVolume)
    - [mute](#meth-mute)
    - [unMute](#meth-unMute)
    - [isMute](#meth-isMute)
  - [Track selection](#meth-track-selection)
    - [getAudioTrack](#meth-getAudioTrack)
    - [getTextTrack](#meth-getTextTrack)
    - [getVideoTrack](#meth-getVideoTrack)
    - [getAvailableAudioTracks](#meth-getAvailableAudioTracks)
    - [getAvailableTextTracks](#meth-getAvailableTextTracks)
    - [getAvailableVideoTracks](#meth-getAvailableVideoTracks)
    - [setAudioTrack](#meth-setAudioTrack)
    - [setTextTrack](#meth-setTextTrack)
    - [disableTextTrack](#meth-disableTextTrack)
    - [setVideoTrack](#meth-setVideoTrack)
    - [disableVideoTrack](#meth-disableVideoTrack)
    - [setPreferredAudioTracks](#meth-setPreferredAudioTracks)
    - [getPreferredAudioTracks](#meth-getPreferredAudioTracks)
    - [setPreferredTextTracks](#meth-setPreferredTextTracks)
    - [getPreferredTextTracks](#meth-getPreferredTextTracks)
    - [setPreferredVideoTracks](#meth-setPreferredVideoTracks)
    - [getPreferredVideoTracks](#meth-getPreferredVideoTracks)
 - [Bitrate selection](#meth-group-bitrate-selection)
    - [getAvailableVideoBitrates](#meth-getAvailableVideoBitrates)
    - [getAvailableAudioBitrates](#meth-getAvailableAudioBitrates)
    - [getVideoBitrate](#meth-getVideoBitrate)
    - [getAudioBitrate](#meth-getAudioBitrate)
    - [setMinVideoBitrate](#meth-setMinVideoBitrate)
    - [setMinAudioBitrate](#meth-setMinAudioBitrate)
    - [getMinVideoBitrate](#meth-getMinVideoBitrate)
    - [getMinAudioBitrate](#meth-getMinAudioBitrate)
    - [setMaxVideoBitrate](#meth-setMaxVideoBitrate)
    - [setMaxAudioBitrate](#meth-setMaxAudioBitrate)
    - [getMaxVideoBitrate](#meth-getMaxVideoBitrate)
    - [getMaxAudioBitrate](#meth-getMaxAudioBitrate)
    - [setVideoBitrate](#meth-setVideoBitrate)
    - [setAudioBitrate](#meth-setAudioBitrate)
    - [getManualVideoBitrate](#meth-getManualVideoBitrate)
    - [getManualAudioBitrate](#meth-getManualAudioBitrate)
  - [Buffer control](#meth-group-buffer-control)
    - [setWantedBufferAhead](#meth-setWantedBufferAhead)
    - [getWantedBufferAhead](#meth-getWantedBufferAhead)
    - [setMaxBufferBehind](#meth-setMaxBufferBehind)
    - [getMaxBufferBehind](#meth-getMaxBufferBehind)
    - [setMaxBufferAhead](#meth-setMaxBufferAhead)
    - [getMaxBufferAhead](#meth-getMaxBufferAhead)
 - [Buffer information](#meth-group-buffer-info)
    - [getCurrentBufferGap](#meth-getCurrentBufferGap)
 - [Content information](#meth-group-content-info)
    - [isLive](#meth-isLive)
    - [getUrl](#meth-getUrl)
    - [getCurrentKeySystem](#meth-getCurrentKeySystem)
 - [Deprecated](#meth-group-deprecated)
    - [getImageTrackData (deprecated)](#meth-getImageTrackData)
- [Static properties](#static)
    - [version](#static-version)
    - [ErrorTypes](#static-ErrorTypes)
    - [ErrorCodes](#static-ErrorCodes)
    - [LogLevel](#static-LogLevel)
- [Tools](#tools)
    - [StringUtils](#tools-string-parsing)
    - [TextTrackRenderer](#tools-textTrackRenderer)
    - [Experimental - VideoThumbnailLoader](#tools-VideoThumbnailLoader)
    - [Experimental - MediaCapabilitiesProber](#tools-mediaCapabilitiesProber)
    - [Experimental - parseBifThumbnails](#tools-parseBifThumbnails)
    - [Experimental - createMetaplaylist](#tools-createMetaplaylist)



<a name="overview"></a>
## Overview ####################################################################

The RxPlayer has a complete API allowing you to:
  - load and stop contents containing video and/or audio media data
  - control playback (play, pause, seek, etc.) when a content is loaded.
  - get multiple information on the current content and on the player's state.
  - choose a specific audio language, subtitles track video track
  - force a given bitrate
  - update the wanted buffer length to reach
  - and more

The following pages define the entire API.

:warning: Only variables and methods defined here are considered as part of the
API. Any other property or method you might find in any other way are not
considered as part of the API and can thus change without notice.

_Note: As some terms used here might be too foreign or slightly different than
the one you're used to, we also wrote a list of terms and definitions used by
the RxPlayer [here](../terms.md)._



<a name="instantiation"></a>
## Instantiation ##############################################################

Instantiating a new RxPlayer is necessary before being able to load a content.
Doing so is straightforward:
```js
import RxPlayer from "rx-player";
const player = new RxPlayer(options);
```

The options are all... optional. They are all defined in the [Player Options
page](./player_options.md).



<a name="meth-group-basic"></a>
## Basic methods ###############################################################

In this chapter, we will go through the basic methods you will need to use when
playing a content through the RxPlayer.

<a name="meth-loadVideo"></a>
### loadVideo ##################################################################

--

__syntax__: `player.loadVideo(options)`

__arguments__:
  - _options_ (``Object``): Content you want to load and associated options.

--

Loads the content described in the argument.

This is the central method to use when you want to play a new content.
The options possible as arguments are all defined in [this
page](./loadVideo_options.md).

Despite its name, this method can also load audio-only content.

#### Example

```js
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```

<a name="meth-reload"></a>
### reload #####################################################################

--

__syntax__: `player.reload()` / `player.reload(options)`

__arguments__:
  - _options_ (``Object | undefined``): Optional requirements, e.g. at which
    position the player should reload.

--

Re-load the last loaded content as fast as possible.

This API can be called at any time after a content has been loaded (the LOADED
state has been reached), even if the player has been stopped since and even if
it was due to a fatal error.

The user may need to call this API in several cases. For example, it may be used
in case of an error that will not reproduce or inversely when the error is
consistent at a certain playback time (e.g. due to a specific chunk defect).

The options argument is an object containing :
- _reloadAt_ (``Object | undefined``): The object contain directives about
the starting playback position :
  - _relative_ (``string | undefined``) : start playback relatively from the
  last playback position (last played position before entering into STOPPED or
  ENDED state).
  - _position_ (`string`|`undefined`) : absolute position at which we should
  start playback

If no reload position is defined, start playback at the last playback position.

Note that despite this method's name, the player will not go through the
`RELOADING` state while reloading the content but through the regular `LOADING`
state - as if `loadVideo` was called on that same content again.

#### Example

```js
player.addEventListener("error", (error) => {
  if (error.code === "BUFFER_APPEND_ERROR") {
    // Try to reload after the last playback position, in case of defectuous
    // media content at current time.
    player.reload({ reloadAt: { relative: +5 }});
  } else {
    // Try to reload at the last playback position
    player.reload();
  }
});
```


<a name="meth-getPlayerState"></a>
### getPlayerState #############################################################

--

__syntax__: `const state = player.getPlayerState()`

__return value__: ``string``

--

Returns the "state" the player is currently in.
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

--

__syntax__: `player.addEventListener(event, callback)`

__arguments__:

  - _event_ (``string``): The event name.

  - _callback_ (``Function``): The callback for the event.
    The same callback may be used again when calling ``removeEventListener``.

--

Add an event listener to trigger a callback as it happens. The callback will
have the event payload as a single argument.

The RxPlayer API is heavily event-based. As an example: to know when a content
is loaded, the most straightforward way is to add an event listener for the
`"playerStateChange"` event. This can be done only through this method.

To have the complete list of player events, consult the [Player events
page](./player_events.md).

#### Example

```js
player.addEventListener("error", function(err) {
  console.log(`The player crashed: ${err.message}`);
});
```


<a name="meth-removeEventListener"></a>
### removeEventListener ########################################################

--

__syntax__: `player.removeEventListener(event)` /
`player.removeEventListener(event, callback)`

__arguments__:

  - _event_ (``string``): The event name.

  - _callback_ (optional) (``Function``): The callback given when calling the
    corresponding ``addEventListener`` API.

--

Remove an event listener.
That is, remove a callback previously registered with ``addEventListener`` from
being triggered on the corresponding event. This also free-up the corresponding
ressources.

The callback given is optional: if not given, _every_ registered callback to
that event will be removed.

#### Example

```js
player.removeEventListener("playerStateChange", listenerCallback);
```


<a name="meth-play"></a>
### play #######################################################################

--

__syntax__: `player.play()`

__return value__: ``Promise.<void>``

--

Play/resume the current loaded video. Equivalent to a video element's play
method.

You might want to call that method either to start playing (when the content is
in the `"LOADED"` state and auto-play has not been enabled in the last
`loadVideo` call) or to resume when the content has been paused.

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

You might want for a content to be loaded before being able to play (the
current state has to be different than `LOADING`, `RELOADING` or `STOPPED`).

#### Example

```js
const resumeContent = () => {
  player.play();
};
```


<a name="meth-pause"></a>
### pause ######################################################################

--

__syntax__: `player.pause()`

--

Pause the current loaded video. Equivalent to a video element's pause method.

Note that a content can be paused even if its current state is ``BUFFERING`` or
``SEEKING``.

You might want for a content to be loaded before being able to pause (the
current state has to be different than `LOADING`, `RELOADING` or `STOPPED`).

#### Example

```js
const pauseContent = () => {
  player.pause();
};
```


<a name="meth-stop"></a>
### stop #######################################################################

--

__syntax__: `player.stop()`

--

Stop playback of the current content if one.

This will totaly un-load the current content.
To re-start playing the same content, you can either call the `reload` method
or just call `loadVideo` again.

#### Example

```js
const stopVideo = () => {
  player.stop();
};
```


<a name="meth-getPosition"></a>
### getPosition ################################################################

--

__syntax__: `const position = player.getPosition()`

__return value__: ``Number``

--

Returns the current media element's playing position, in seconds.

For live contents, the returned position will not be re-scaled to correspond to
a live timestamp. If you want that behavior, you can call `getWallClockTime`
instead.

This is the only difference between the two. Generally, you can follow the
following rule:

  - if you want to use that current position to use it with the other APIs
    (like `seekTo`, `getMinimumPosition`, `getMaximumPosition`
    etc.) use `getPosition` - as this is the real position in the media.

  - if you want to display the current position to the viewer/listener, use
    `getWallClockTime` instead - as it will be set in the proper scale for
    live contents to display the right live time.

#### Example

```js
const pos = player.getPosition();
console.log(`The video element's current position is: ${pos} second(s)`);
```


<a name="meth-getWallClockTime"></a>
### getWallClockTime ###########################################################

--

__syntax__: `const wallClockTime = player.getWallClockTime()`

__return value__: ``Number``

--

Returns the current "wall-clock" playing position in seconds.

That is:

  - for live contents, this is the current position scaled to correspond to a
    live timestamp, in seconds.

  - for non-live contents, returns the position from the absolute beginning time
    of the content, also in seconds. In the absolute majority of cases this will
    be equal to the value returned by `getPosition`.

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


<a name="meth-seekTo"></a>
### seekTo #####################################################################

--

__syntax__: `player.seekTo(position)`

__arguments__:
  - _position_ (``Object|Number``): The position you want to seek to.

__

Seek in the current content (i.e. change the current position).

The argument can be an object with a single ``Number`` property, either:

  - ``relative``: seek relatively to the current position

  - ``position``: seek to the given absolute position (equivalent to
    ``player.getMediaElement().currentTime = newPosition``)

  - ``wallClockTime``: seek to the given wallClock position, as returned by
    ``getWallClockTime``.

The argument can also just be a ``Number`` property, which will have the same
effect than the ``position`` property (absolute position).

Seeking should only be done when a content is loaded (i.e. the player isn't
in the `STOPPED`, `LOADING` or `RELOADING` state).

The seek operation will start as soon as possible, in almost every cases
directly after this method is called.

You will know when the seek is being performed and has been performed
respectively by listening to the `seeking` and `seeked` player events (see the
[player events page](./player_events.md)). While seeking, the RxPlayer might
also switch to the `SEEKING` state.

#### Examples

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


<a name="meth-getMinimumPosition"></a>
### getMinimumPosition #########################################################

--

__syntax__: `const minimumPosition = player.getMinimumPosition()`

__return value__: ``Number|null``

--

Returns the minimum seekable player position.
Returns ``null`` if no content is loaded.

This is useful for live contents, where the earliest time at which it is
possible to seek usually evolves over time.
This method allows to know the earliest possible time a seek can be performed
at any point in time.

As the given position is the absolute minimum position, you might add a security
margin (like a few seconds) when seeking to this position in a live content.
Not doing so could led to the player being behind the minimum position after
some time (e.g. because of buffering or decoding issues), and thus unable to
continue playing.

You will be alerted if the player's position fell behind the minimum possible
position by receiving a `warning` event (see the [player events
page](./player_events.md)) with an error having a `MEDIA_TIME_BEFORE_MANIFEST`
`code` property (see the [player errors page](./errors.md)).
Note that you can also have those warnings without any seek operation, e.g. due
to buffering for too long.

For VoD contents, as the minimum position normally doesn't change, seeking at
the minimum position should not cause any issue.

#### Example

```js
// Seeking close to the minimum position (with a 5 seconds security margin)
player.seekTo({ position: player.getMinimumPosition() + 5 });
```


<a name="meth-getMaximumPosition"></a>
### getMaximumPosition #########################################################

--

__syntax__: `const maximumPosition = player.getMaximumPosition()`

__return value__: ``Number|null``

--

Returns the maximum seekable player position.
Returns ``null`` if no content is loaded.

This is useful for live contents, where this position might be updated
continously as new content is generated.
This method allows thus to seek directly at the live edge of the content.

Please bear in mind that seeking exactly at the maximum position is rarely a
good idea:
  - for VoD contents, the playback will end
  - for live contents, the player will then need to wait until it can build
    enough buffer.

As such, we advise to remove a few seconds from that position when seeking.

#### Example

```js
// seeking 5 seconds before the end (or the live edge for live contents)
player.seekTo({
  position: player.getMaximumPosition() - 5
});
```


<a name="meth-getMediaDuration"></a>
### getMediaDuration ###########################################################

--

__syntax__: `const duration = player.getMediaDuration()`

__return value__: ``Number``

--

Returns the duration of the current content as taken from the media element.

:warning: This duration is in fact the maximum position possible for the
content. As such, for contents not starting at `0`, this value will not be equal
to the difference between the maximum and minimum possible position, as would
normally be expected from a property named "duration".


#### Example


```js
const pos = player.getPosition();
const dur = player.getMediaDuration();

console.log(`current position: ${pos} / ${dur}`);
```


<a name="meth-getError"></a>
### getError ###################################################################

--

__syntax__: `const currentError = player.getError()`

__return value__: ``Error|null``

--

Returns the current "fatal error" if one happenned for the last loaded content.
Returns `null` otherwise.

A "fatal error" is an error which led the current loading/loaded content to
completely stop.
Such errors are usually also sent through the `"error"` event when they happen.

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


<a name="meth-getMediaElement"></a>
### getMediaElement ############################################################

--

__syntax__: `const elt = player.getMediaElement()`

__return value__: ``HTMLMediaElement``

--

Returns the media element used by the RxPlayer.

You're not encouraged to use its APIs as they can enter in conflict with the
RxPlayer's API.

Despite its name, this method can also return an audio element if the RxPlayer
was instantiated with one.

#### Example

```js
const videoElement = player.getMediaElement();
videoElement.className = "my-video-element";
```


<a name="meth-dispose"></a>
### dispose ####################################################################

--

__syntax__: `player.dispose()`

--

Free the ressources used by the player.

You can call this method if you know you won't need the RxPlayer anymore.

:warning: The player won't work correctly after calling this method.



<a name="meth-group-speed-control"></a>
## Speed control ###############################################################

The following methods allows to update the current speed of playback (also
called the "playback rate").


<a name="meth-setPlaybackRate"></a>
### setPlaybackRate ############################################################

--

__syntax__: `player.setPlaybackRate(speed)` /
`player.setPlaybackRate(speed, { preferTrickModeTracks })`

__arguments__:
  - _speed_ (``Number``): The speed / playback rate you want to set.
  - _options_ (``Object|undefined``): Options related to the speed update.

--

Updates the current playback rate, i.e. the speed at which contents are played.

As its name hints at, the value indicates the rate at which contents play:

  - Setting it to `2` allows to play at a speed multiplied by 2 relatively to
    regular playback.

  - Setting that value to `1` reset the playback rate to its "normal" rythm.

  - Setting it to `0.5` allows to play at half the speed relatively to regular
    playback.

  - etc.

This method's effect is persisted from content to content, and can be called
even when no content is playing (it will still have an effect for the next
contents).

If you want to reverse effects provoked by `setPlaybackRate` before playing
another content, you will have to call `setPlaybackRate` first with the
default settings you want to set.

As an example, to reset the speed to "normal" (x1) speed and to disable
trickMode video tracks (which may have been enabled by a previous
`setPlaybackRate` call), you can call:
```js
player.setPlaybackRate(1, { preferTrickModeTracks: false });
```

--

This method can be used to switch to or exit from "trickMode" video tracks,
which are tracks specifically defined to mimic the visual aspect of a VCR's
fast forward/rewind feature, by only displaying a few video frames during
playback.

This behavior is configurable through the second argument, by adding a
property named `preferTrickModeTracks` to that object.

You can set that value to `true` to switch to trickMode video tracks when
available, and set it to `false` when you want to disable that logic.
Note that like any configuration given to `setPlaybackRate`, this setting
is persisted through all future contents played by the player.

If you want to stop enabling trickMode tracks, you will have to call
`setPlaybackRate` again with `preferTrickModeTracks` set to `false`.

You can know at any moment whether this behavior is enabled by calling
the `areTrickModeTracksEnabled` method. This will only means that the
RxPlayer will select in priority trickmode video tracks, not that the
currently chosen video tracks is a trickmode track (for example, some
contents may have no trickmode tracks available).

If you want to know about the latter instead, you can call `getVideoTrack`
and/or listen to `videoTrackChange` events. The track returned may have an
`isTrickModeTrack` property set to `true`, indicating that it is a
trickmode track.

Note that switching to or getting out of a trickmode video track may
lead to the player being a brief instant in a `"RELOADING"` state (notified
through `playerStateChange` events and the `getPlayerState` method). When in
that state, a black screen may be displayed and multiple RxPlayer APIs will
not be usable.

This method can be called at any time, even when no content is loaded and is
persisted from content to content.

You can set it to `1` to reset its value to the "regular" default.

It is possible to try to enable the trick mode track by setting the second
argument to `true` (and disable it when setting `false`). If available, the
RxPlayer will switch the current video track to the trick mode one. The trick
mode track proposes video content that is often encoded with a very low
framerate because the content is not intended to be played at regular framerate
and because the chunks must be faster to load for the client.

#### Examples

```js
// plays three times faster than normal
player.setPlaybackRate(3);
```

```js
// plays five times faster than normal, and enable trickmode tracks if they exist
player.setPlaybackRate(5, { preferTrickModeTracks: true });
```

```js
// reset the speed to "normal" (x1) speed and to disable trickMode video tracks
player.setPlaybackRate(1, { preferTrickModeTracks: false });
```


<a name="meth-getPlaybackRate"></a>
### getPlaybackRate ############################################################

--

__syntax__: `const rate = player.getPlaybackRate()`

__return value__: ``Number``

--

Returns the current playback rate, that may have been updated through a previous
`setPlaybackRate` call.

``1`` for normal playback, ``2`` when playing at double the speed, etc.

#### Example

```js
const currentPlaybackRate = player.getPlaybackRate();
console.log(`Playing at a x${currentPlaybackRate}} speed`);
```

<a name="meth-setPlaybackRate"></a>
### areTrickModeTracksEnabled ##################################################

--

__syntax__: `const areEnabled = player.areTrickModeTracksEnabled()`

__return value__: ``boolean``

--

Returns `true` if trickmode playback is active (it is usually enabled through
the `setPlaybackRate` method), which means that the RxPlayer selects "trickmode"
video tracks in priority.

Returns `false` in other cases.

Note that this doesn't mean that the player is currently playing a trickmode
track nor that it is even playing a content, only that it selects trickmode
tracks in priority.

To switch on or off this mode, you can use the `setPlaybackRate` method.



<a name="meth-group-volume-control"></a>
## Volume control ##############################################################

Those methods allows to have control over the current audio volume of playing
contents.


<a name="meth-setVolume"></a>
### setVolume ##################################################################

--

__syntax__: `player.setVolume(volume)`

__arguments__:
  - _volume_ (``Number``): Volume from 0 to 1.

--

Set the current volume, from 0 (no sound) to 1 (the maximum sound level).

Note that the volume set here is persisted even when loading another content.
As such, this method can also be called when no content is currently playing.

#### Example

```js
// set the full volume
player.setVolume(1);
```


<a name="meth-getVolume"></a>
### getVolume ##################################################################

--

__syntax__: `const volume = player.getVolume()`

__return value__: ``Number``

--

Current volume of the player, from 0 (no sound) to 1 (maximum sound).
0 if muted through the `mute` API.

As the volume is not dependent on a single content (it is persistent), this
method can also be called when no content is playing.

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


<a name="meth-mute"></a>
### mute #######################################################################

--

__syntax__: `player.mute()`

--

Mute the volume.

Basically set the volume to 0 while keeping in memory the previous volume to
reset it at the next `unMute` call.

As the volume is not dependent on a single content (it is persistent), this
method can also be called when no content is playing.

#### Example

```js
// mute the current volume
player.mute();
```


<a name="meth-unMute"></a>
### unMute #####################################################################

--

__syntax__: `player.unMute()`

--

When muted, restore the volume to the one previous to the last ``mute`` call.

When the volume is already superior to `0`, this call won't do anything.

As the volume is not dependent on a single content (it is persistent), this
method can also be called when no content is playing.

#### Example

```js
// mute the current volume
player.mute();

// unmute and restore the previous volume
player.unMute();
```


<a name="meth-isMute"></a>
### isMute #####################################################################

--

__syntax__: `const isMute = player.isMute()`

__return value__: ``Boolean``

--

Returns true if the volume is set to `0`.

#### Example

```js
if (player.isMute()) {
  console.log("The content plays with no sound.");
}
```



<a name="meth-group-track-selection"></a>
## Track selection #############################################################

The following methods allows to choose the right video audio or text track and
to obtain information about the currently playing tracks.


<a name="meth-getAudioTrack"></a>
### getAudioTrack ##############################################################

--

__syntax__: `const audioTrack = player.getAudioTrack()`

__return value__: ``Object|null|undefined``

--

Get information about the audio track currently set.
``null`` if no audio track is enabled right now.

If an audio track is set and information about it is known, this method will
return an object with the following properties:

  - ``id`` (``Number|string``): The id used to identify this track. No other
    audio track for the same [Period](../terms.md#period) will have the
    same `id`.

    This can be useful when setting the track through the `setAudioTrack`
    method.

  - ``language`` (``string``): The language the audio track is in, as set in the
    [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``audioDescription`` (``Boolean``): Whether the track is an audio
    description of what is happening at the screen.

  - ``dub`` (``Boolean|undefined``): If set to `true`, this audio track is a
    "dub", meaning it was recorded in another language than the original.
    If set to `false`, we know that this audio track is in an original language.
    This property is `undefined` if we do not known whether it is in an original
    language.

  - ``representations`` (``Array.<Object>``):
    [Representations](../terms.md#representation) of this video track, with
    attributes:

    - ``id`` (``string``): The id used to identify this Representation.
      No other Representation from this track will have the same `id`.

    - ``bitrate`` (``Number``): The bitrate of this Representation, in bits per
      seconds.

    - ``codec`` (``string|undefined``): The audio codec the Representation is
      in, as announced in the corresponding Manifest.


``undefined`` if no audio content has been loaded yet or if its information is
unknown.

--

Note for multi-Period contents:

This method will only return the chosen audio track for the
[Period](../terms.md#period) that is currently playing.

__

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no audio tracks API in the browser, this method will return ``undefined``.


<a name="meth-getTextTrack"></a>
### getTextTrack ###############################################################

--

__syntax__: `const textTrack = player.getTextTrack()`

__return value__: ``Object|null|undefined``

--

Get information about the text track currently set.
``null`` if no audio track is enabled right now.

If a text track is set and information about it is known, this method will
return an object with the following properties:

  - ``id`` (``Number|string``): The id used to identify this track. No other
    text track for the same [Period](../terms.md#period) will have the same
    `id`.

    This can be useful when setting the track through the `setTextTrack` method.

  - ``language`` (``string``): The language the text track is in, as set in the
    [Manifest](../terms.md#manifest).

  - ``normalized`` (``string``): An attempt to translate the ``language``
    property into an ISO 639-3 language code (for now only support translations
    from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
    fails (no corresponding ISO 639-3 language code is found), it will equal the
    value of ``language``

  - ``closedCaption`` (``Boolean``): Whether the track is specially adapted for
    the hard of hearing or not.


``undefined`` if no text content has been loaded yet or if its information is
unknown.

--

Note for multi-Period contents:

This method will only return the chosen text track for the
[Period](../terms.md#period) that is currently playing.

__

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no text tracks API in the browser, this method will return ``undefined``.


<a name="meth-getVideoTrack"></a>
### getVideoTrack ##############################################################

--

__syntax__: `const videoTrack = player.getVideoTrack()`

__return value__: ``Object|null|undefined``

--

Get information about the video track currently set.

``null`` if no video track is enabled right now.
``undefined`` if no video content has been loaded yet or if its information is
unknown.

If a video track is set and information about it is known, this method will
return an object with the following properties:

  - ``id`` (``Number|string``): The id used to identify this track. No other
    video track for the same [Period](../terms.md#period) will have the same
    `id`.

    This can be useful when setting the track through the `setVideoTrack`
    method.

  - ``representations`` (``Array.<Object>``):
    [Representations](../terms.md#representation) of this video track, with
    attributes:

    - ``id`` (``string``): The id used to identify this Representation.
      No other Representation from this track will have the same `id`.

    - ``bitrate`` (``Number``): The bitrate of this Representation, in bits per
      seconds.

    - ``width`` (``Number|undefined``): The width of video, in pixels.

    - ``height`` (``Number|undefined``): The height of video, in pixels.

    - ``codec`` (``string|undefined``): The video codec the Representation is
      in, as announced in the corresponding Manifest.

    - ``frameRate`` (``string|undefined``): The video frame rate.

    - ``hdrInfo`` (``Object|undefined``) Information about the hdr
      characteristics of the track.
      (see [HDR support documentation](./hdr.md#hdrinfo))

  - ``signInterpreted`` (``Boolean|undefined``): If set to `true`, this track is
    known to contain an interpretation in sign language.
    If set to `false`, the track is known to not contain that type of content.
    If not set or set to undefined we don't know whether that video track
    contains an interpretation in sign language.

  - ``isTrickModeTrack`` (``Boolean|undefined``): If set to `true`, this track
    is a trick mode track. This type of tracks proposes video content that is
    often encoded with a very low framerate with the purpose to be played more
    efficiently at a much higher speed.

    To enter or exit a mode where trickmode tracks are used instead of regular
    non-trickmode ones, you can use the `setPlaybackRate` function.

  - ``trickModeTracks`` (``Object | undefined``): Trick mode video tracks
    attached to this video track.

    Each of those objects contain the same properties that a regular video track
    (same properties than what is documented here).

    It this property is either `undefined` or not set, then this track has no
    linked trickmode video track.

--

Note for multi-Period contents:

This method will only return the chosen video track for the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)), if there is
no video tracks API in the browser, this method will return ``undefined``.


<a name="meth-getAvailableAudioTracks"></a>
### getAvailableAudioTracks ####################################################

--

__syntax__: `const audioTracks = player.getAvailableAudioTracks()`

__return value__: ``Array.<Object>``

--

Returns the list of available audio tracks for the current content.

Each of the objects in the returned array have the following properties:

  - ``active`` (``Boolean``): Whether the track is the one currently active or
    not. Only maximum one audio track can be active at a time.

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
    description of what is happening at the screen.

  - ``dub`` (``Boolean|undefined``): If set to `true`, this audio track is a
    "dub", meaning it was recorded in another language than the original.
    If set to `false`, we know that this audio track is in an original language.
    This property is `undefined` if we do not known whether it is in an original
    language.

  - ``representations`` (``Array.<Object>``):
    [Representations](../terms.md#representation) of this video track, with
    attributes:

    - ``id`` (``string``): The id used to identify this Representation.

    - ``bitrate`` (``Number``): The bitrate of this Representation, in bits per
      seconds.

    - ``codec`` (``string|undefined``): The audio codec the Representation is
      in, as announced in the corresponding Manifest.


--

Note for multi-Period contents:

This method will only return the available tracks of the
[Period](../terms.md#period) that is currently playing.

--


In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), if there are no supported
tracks in the file or no track management API this method will return an empty
Array.


<a name="meth-getAvailableTextTracks"></a>
### getAvailableTextTracks #####################################################

--

__syntax__: `const textTracks = player.getAvailableTextTracks()`

__return value__: ``Array.<Object>``

--

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

--

Note for multi-Period contents:

This method will only return the available tracks of the
[Period](../terms.md#period) that is currently playing.

--


In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), if there are no supported
tracks in the file or no track management API this method will return an empty
Array.


<a name="meth-getAvailableVideoTracks"></a>
### getAvailableVideoTracks ####################################################

--

__syntax__: `const videoTracks = player.getAvailableVideoTracks()`

__return value__: ``Array.<Object>``

--

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

    - ``codec`` (``string|undefined``): The video codec the Representation is
      in, as announced in the corresponding Manifest.

    - ``frameRate`` (``string|undefined``): The video framerate.

    - ``hdrInfo`` (``Object|undefined``) Information about the hdr
      characteristics of the track.
      (see [HDR support documentation](./hdr.md#hdrinfo))

  - ``signInterpreted`` (``Boolean|undefined``): If set to `true`, the track is
    known to contain an interpretation in sign language.
    If set to `false`, the track is known to not contain that type of content.
    If not set or set to undefined we don't know whether that video track
    contains an interpretation in sign language.


  - ``trickModeTracks`` (``Object | undefined``): Trick mode video tracks
    attached to this video track.

    Each of those objects contain the same properties that a regular video track
    (same properties than what is documented here).

    It this property is either `undefined` or not set, then this track has no
    linked trickmode video track.

--

Note for multi-Period contents:

This method will only return the available tracks of the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), if there are no supported
tracks in the file or no track management API this method will return an empty
Array.


<a name="meth-setAudioTrack"></a>
### setAudioTrack ##############################################################

--

__syntax__: `player.setAudioTrack(audioTrackId)`

__arguments__:
  - _audioTrackId_ (``string|Number``): The `id` of the track you want to set

--

Change the current audio track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
``getAvailableAudioTracks`` method.

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.
If you want to update the track for other Periods as well, you might want to
either:
  - update the current audio track once a `"periodChange"` event has been
    received.
  - update first the preferred audio tracks through the
    [setPreferredAudioTracks](#meth-setPreferredAudioTracks) method.

--

:warning: If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :
- The HLS defines variants, groups of tracks that may be read together
- Safari may decide to enable a track for accessibility or user language
convenience (e.g. Safari may switch subtitle to your OS language if you pick
another audio language)
You can know if another track has changed by listening to the corresponding
events that the tracks have changed.



<a name="meth-setTextTrack"></a>
### setTextTrack ###############################################################

--

__syntax__: `player.setTextTrack(textTrackId)`

__arguments__:
  - _textTrackId_ (``string|Number``): The `id` of the track you want to set

--

Change the current text (subtitles) track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
``getAvailableTextTracks`` method.

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.
If you want to update the track for other Periods as well, you might want to
either:
  - update the current text track once a `"periodChange"` event has been
    received.
  - update first the preferred text tracks through the
    [setPreferredTextTracks](#meth-setPreferredTextTracks) method.


--

:warning: If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :
- The HLS defines variants, groups of tracks that may be read together
- Safari may decide to enable a track for accessibility or user language
convenience (e.g. Safari may switch subtitle to your OS language if you pick
another audio language)
You can know if another track has changed by listening to the corresponding
events that the tracks have changed.


<a name="meth-disableTextTrack"></a>
### disableTextTrack ###########################################################

--

__syntax__: `player.disableTextTrack()`

--

Disable the current text track, if one.

After calling that method, no subtitles track will be displayed until
`setTextTrack` is called.

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.

If you want to disable the text track for other Periods as well, you might want
to call [setPreferredVideoTracks](#meth-setPreferredVideoTracks) instead. With
this method, you can globally apply a `null` text track preference - which means
that you would prefer having no text track - by setting its second argument to
`true`.

More information can be found on that API's documentation.


<a name="meth-setVideoTrack"></a>
### setVideoTrack ##############################################################

--

__syntax__: `player.setVideoTrack(videoTrackId)`

__arguments__:
  - _videoTrackId_ (``string|Number``): The `id` of the track you want to set

--

Change the current video track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
``getAvailableVideoTracks`` method.

If trickmode tracks are enabled (usually through the corresponding
`setPlaybackRate` method option) and if that new video track is linked to
trickmode tracks, one of the trickmode tracks will be loaded instead.

Note that trickmode tracks cannot be forced through the `setVideoTrack` method
by giving directly the trickmode tracks' id.

If you want to enable or disable trickmode tracks, you should use
`setPlaybackRate` instead.

--

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
      - ``getMediaDuration`` will return ``NaN``
      - ``getAvailableAudioTracks`` will return an empty array
      - ``getAvailableTextTracks`` will return an empty array
      - ``getAvailableVideoTracks`` will return an empty array
      - ``getTextTrack`` will return ``null``
      - ``getAudioTrack`` will return ``null``
      - ``setAudioTrack`` will throw
      - ``setTextTrack`` will throw

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.
If you want to update the track for other Periods as well, you might want to
either:
  - update the current video track once a `"periodChange"` event has been
    received.
  - update first the preferred video tracks through the
    [setPreferredVideoTracks](#meth-setPreferredVideoTracks) method.

--

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No video track API is supported on the current browser
- The media file tracks are not supported on the browser


<a name="meth-disableVideoTrack"></a>
### disableVideoTrack ##########################################################

--

__syntax__: `player.disableVideoTrack()`

--

Disable the current video track, if one.

Might enter in `RELOADING` state for a short period after calling this API.

--

Note for multi-Period contents:

This method will only have an effect on the [Period](../terms.md#period) that is
currently playing.

If you want to disable the video track for other Periods as well, you might want
to call [setPreferredVideoTracks](#meth-setPreferredVideoTracks) instead. With
this method, you can globally apply a `null` video track preference - which means
that you would prefer having no video track - by setting its second argument to
`true`.

More information can be found on that API's documentation.

--

:warning: This option may have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)).
The directfile mode is a special case here because when in it, the RxPlayer
depends for track selection on the [corresponding HTML
standard](https://html.spec.whatwg.org/multipage/media.html) as implemented by
the different browsers.
Though this standard says nothing about not being able to disable the video
track (or to stay more in line with their terms: to not select any video track),
no browser implementation actually seem to be able to do it, even when the
corresponding browser APIs show that no video track is currently selected.
This might be a bug on their parts.

Due to this fact, we do not recommend using this API in directfile mode for
now. You might even receive a reassuring `videoTrackChange` event (with a `null`
payload) while the video track is still actually active.


<a name="meth-setPreferredAudioTracks"></a>
### setPreferredAudioTracks ####################################################

--

__syntax__: `player.setPreferredAudioTracks(preferences)` /
`player.setPreferredAudioTracks(preferences, shouldApply)`

__arguments__:

  - _preferences_ (`Array.<Object>`): wanted audio track configurations by
    order of preference.

  - _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
    content being played.

--

Allows the RxPlayer to choose an initial audio track, based on language
preferences, codec preferences or both.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

--

The first argument should be set as an array of objects, each object describing
constraints an audio track should respect.

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):
```js
{
  language: "fra", // {string|undefined} The language the track should be in
                   // (in preference as an ISO 639-1, ISO 639-2 or ISO 639-3
                   // language code).
                   // If not set or set to `undefined`, the RxPlayer won't
                   // filter based on the language of the track.

  audioDescription: false // {Boolean|undefined} Whether the audio track should
                          // be an audio description for the visually impaired
                          // or not.
                          // If not set or set to `undefined`, the RxPlayer
                          // won't filter based on that status.

  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /ec-3/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
}
```

When encountering a new content or a new choice of tracks in a given content,
the RxPlayer will look at each object in that array.
If the first object in it defines constaints that cannot be respected under the
currently available audio tracks, the RxPlayer will consider the second object
in the array and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

--

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active track and
the active track of Periods (in DASH) or sub-contents (in MetaPlaylist) that
have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a __new__ Period or sub-content is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

  - the content being currently played.
    Here, the current audio preference will stay in place.

  - the Periods or sub-contents which have already been loaded for the current
    content.
    Those will keep the audio track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.


#### Examples

Let's imagine that you prefer to have french or italian over all other audio
languages. If not found, you want to fallback to english:

```js
player.setPreferredAudioTracks([
  { language: "fra", audioDescription: false },
  { language: "ita", audioDescription: false },
  { language: "eng", audioDescription: false }
])
```

Now let's imagine that you want to have in priority a track that contain at
least one profile in Dolby Digital Plus (ec-3 codec) without caring about the
language:
```js
player.setPreferredAudioTracks([ { codec: { all: false, test: /ec-3/ } ]);
```

At last, let's combine both examples by preferring french over itialian, italian
over english while preferring it to be in Dolby Digital Plus:
```js

player.setPreferredAudioTracks([
  {
    language: "fra",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ }
  },

  // We still prefer non-DD+ french over DD+ italian
  { language: "fra", audioDescription: false },

  {
    language: "ita",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ }
  },
  { language: "ita", audioDescription: false },

  {
    language: "eng",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ }
  },
  { language: "eng", audioDescription: false }
]);
```

--

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No audio track API is supported on the current browser
- The media file tracks are not supported on the browser


<a name="meth-getPreferredAudioTracks"></a>
### getPreferredAudioTracks ####################################################

--

__syntax__: `const preferences = player.getPreferredAudioTracks()`

__return value__: ``Array.<Object>``

--

Returns the current list of preferred audio tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredAudioTracks` constructor option or the last `setPreferredAudioTracks`
if it was called.

It will return an empty Array if none of those two APIs were used until now.


<a name="meth-setPreferredTextTracks"></a>
### setPreferredTextTracks #####################################################

--

__syntax__: `player.setPreferredTextTracks(preferences)` /
`player.setPreferredTextTracks(preferences, shouldApply)`

__arguments__:

  - _preferences_ (`Array.<Object>`): wanted text track configurations by
    order of preference.

  - _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
    content being played.

--

Allows the RxPlayer to choose an initial text track, based on language
and accessibility preferences.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

--

The first argument should be set as an array of objects, each object describing
constraints a text track should respect.

Here is all the properties that should be set in a single object of that array.
```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

When encountering a new content or a new choice of tracks in a given content,
the RxPlayer will look at each object in that array.
If the first object in it defines constaints that cannot be respected under the
currently available text tracks, the RxPlayer will consider the second object
in the array and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

You can set `null` instead of an object to mean that you want no subtitles.
When reaching that point of the array, the RxPlayer will just disable the
current text track.

As such, if you never want any subtitles, you can just set this argument to
`[null]` (an array with only the value `null` at the first position).

--

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active text track
and the active text track of Periods (in DASH) or sub-contents (in
MetaPlaylist) that have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a __new__ Period or sub-content is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

  - the content being currently played.
    Here, the current text track preference will stay in place.

  - the Periods or sub-contents which have already been loaded for the current
    content.
    Those will keep the text track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.

#### Example

Let's imagine that you prefer to have french or italian subtitles.If not found,
you want no subtitles at all.

You will thus call ``setPreferredTextTracks`` that way.

```js
player.setPreferredTextTracks([
  { language: "fra", closedCaption: false },
  { language: "ita", closedCaption: false },
  null
]);
```

This won't apply on the currently loaded content(s), if you also want that, you
can add `true` as a second argument:

```js
player.setPreferredTextTracks([
  { language: "fra", closedCaption: false },
  { language: "ita", closedCaption: false },
  null
], true);
```

--

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No text track API is supported on the current browser
- The media file tracks are not supported on the browser


<a name="meth-getPreferredTextTracks"></a>
### getPreferredTextTracks #####################################################

--

__syntax__: `const preferences = player.getPreferredTextTracks()`

__return value__: ``Array.<Object|null>``

--

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


<a name="meth-setPreferredVideoTracks"></a>
### setPreferredVideoTracks ####################################################

--

__syntax__: `player.setPreferredVideoTracks(preferences)` /
`player.setPreferredVideoTracks(preferences, shouldApply)`

__arguments__:

  - _preferences_ (`Array.<Object>`): wanted video track configurations by
    order of preference.

  - _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
    content being played.

--

Allows the RxPlayer to choose an initial video track, based on codec
preferences, accessibility preferences or both.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

--

The first argument should be set as an array of objects, each object describing
constraints a video track should respect.

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):
```js
{
  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /hvc/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
  signInterpreted: true, // {Boolean|undefined} If set to `true`, only tracks
                         // which are known to contains a sign language
                         // interpretation will be considered.
                         // If set to `false`, only tracks which are known
                         // to not contain it will be considered.
                         // if not set or set to `undefined` we won't filter
                         // based on that status.
}
```

If the first defined object in that array - defining the first set of
constraints - cannot be respected under the currently available video tracks,
the RxPlayer will check with the second object instead and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

When the next encountered constraint is set to `null`, the player will simply
disable the video track. If you want to disable the video track by default,
you can just set `null` as the first element of this array (e.g. like `[null]`).

--

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active track and
the active track of Periods (in DASH) or sub-contents (in MetaPlaylist) that
have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a __new__ Period (or sub-content) is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

  - the content being currently played.
    Here, the current video preference will stay in place.

  - the Periods or sub-contents which have already been loaded for the current
    content.
    Those will keep the video track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.


#### Examples

Let's imagine that you prefer to have a track which contains only H265
profiles. You can do:
```js
player.setPreferredVideoTracks([ { codec: { all: false, test: /^hvc/ } } ]);
```

With that same constraint, let's no consider that the current user prefer in any
case to have a sign language interpretation on screen:
```js
player.setPreferredVideoTracks([
  // first let's consider the best case: H265 + sign language interpretation
  {
    codec: { all: false, test: /^hvc/ }
    signInterpreted: true,
  },

  // If not available, we still prefer a sign interpreted track without H265
  { signInterpreted: true },

  // If not available either, we would prefer an H265 content
  { codec: { all: false, test: /^hvc/ } },

  // Note: If this is also available, we will here still have a video track
  // but which do not respect any of the constraints set here.
]);
would thus prefer the video to contain a sign language interpretation.
We could set both the previous and that new constraint that way:

---

For a totally different example, let's imagine you want to play without any
video track enabled (e.g. to start in an audio-only mode). To do that, you can
simply do:
```js
player.setPreferredVideoTracks([null], true);
```

---

:warning: This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./loadVideo_options.md#prop-transport)) when either :
- No video track API is supported on the current browser
- The media file tracks are not supported on the browser

---


<a name="meth-getPreferredVideoTracks"></a>
### getPreferredVideoTracks ####################################################

--

__syntax__: `const preferences = player.getPreferredVideoTracks()`

__return value__: ``Array.<Object|null>``

--

Returns the current list of preferred video tracks - by order of preference.

This returns the data in the same format that it was given to either the
`preferredVideoTracks` constructor option or the last `setPreferredVideoTracks`
if it was called.

It will return an empty Array if none of those two APIs were used until now.


<a name="meth-group-bitrate-selection"></a>
## Bitrate selection ###########################################################

The following methods allows to choose a given bitrate for audio or video
content. It can also enable or disable an adaptive bitrate logic or influence
it.


<a name="meth-getAvailableVideoBitrates"></a>
### getAvailableVideoBitrates ##################################################

--

__syntax__: `const bitrates = player.getAvailableVideoBitrates()`

__return value__: ``Array.<Number>``

--

The different bitrates available for the current video track in bits per
seconds.

--

Note for multi-Period contents:

This method will only return the available video bitrates of the
[Period](../terms.md#period) that is currently playing.

--

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

--

__syntax__: `const bitrates = player.getAvailableAudioBitrates()`

__return value__: ``Array.<Number>``

--

The different bitrates available for the current audio track in bits per
seconds.

--

Note for multi-Period contents:

This method will only return the available audio bitrates of the
[Period](../terms.md#period) that is currently playing.

--

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

--

__syntax__: `const bitrate = player.getVideoBitrate()`

__return value__: ``Number|undefined``

--

Returns the bitrate of the video quality currently chosen, in bits per second.

Returns ``undefined`` if no content is loaded.

--

Note for multi-Period contents:

This method will only return the chosen video bitrate for the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns ``undefined``.


<a name="meth-getAudioBitrate"></a>
### getAudioBitrate ############################################################

--

__syntax__: `const bitrate = player.getAudioBitrate()`

__return value__: ``Number|undefined``

--

Returns the bitrate of the audio quality currently chosen, in bits per second.

Returns ``undefined`` if no content is loaded.

--

Note for multi-Period contents:

This method will only return the chosen audio bitrate for the
[Period](../terms.md#period) that is currently playing.

--

In _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)), returns ``undefined``.


<a name="meth-setMinVideoBitrate"></a>
### setMinVideoBitrate #########################################################

--

__syntax__: `player.setMinVideoBitrate(minBitrate)`

__arguments__:
  - _minBitrate_ (``Number``): Lower video bitrate limit when adaptive streaming
    is enabled.

--

Set a minimum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate lower than that value.

The exception being when no quality has a higher bitrate, in which case the
maximum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate below 100 kilobits per second you can call:
```js
player.setMinVideoBitrate(100000);
```

Any limit can be removed just by setting that value to ``0``:
```js
// remove video bitrate lower limit
player.setMinVideoBitrate(0);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-setMinAudioBitrate"></a>
### setMinAudioBitrate #########################################################

--

__syntax__: `player.setMinAudioBitrate(minBitrate)`

__arguments__:
  - _minBitrate_ (``Number``): Lower audio bitrate limit when adaptive streaming
    is enabled.

--

Set a minimum audio bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setAudioBitrate`), the player will never switch
to an audio quality with a bitrate lower than that value.

The exception being when no quality has a higher bitrate, in which case the
maximum quality will always be chosen instead.

For example, if you want that audio qualities chosen automatically never have
a bitrate below 100 kilobits per second you can call:
```js
player.setMinAudioBitrate(100000);
```

Any limit can be removed just by setting that value to ``0``:
```js
// remove audio bitrate lower limit
player.setMinAudioBitrate(0);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getMinVideoBitrate"></a>
### getMinVideoBitrate #########################################################

--

__syntax__: `const minBitrate = player.getMinVideoBitrate()`

__return value__: ``Number``

--

Returns the minimum video bitrate reachable through adaptive streaming, in bits
per second.

This minimum limit has usually been set either through the `setMinVideoBitrate`
method or through the `minVideoBitrate` constructor option.

This limit can be further updated by calling the
[setMinVideoBitrate](#meth-setMinVideoBitrate) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.


<a name="meth-getMinAudioBitrate"></a>
### getMinAudioBitrate #########################################################

--

__syntax__: `const minBitrate = player.getMinAudioBitrate()`

__return value__: ``Number``

--

Returns the minimum audio bitrate reachable through adaptive streaming, in bits
per second.

This minimum limit has usually been set either through the `setMinAudioBitrate`
method or through the `minAudioBitrate` constructor option.

This limit can be further updated by calling the
[setMinAudioBitrate](#meth-setMinAudioBitrate) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.


<a name="meth-setMaxVideoBitrate"></a>
### setMaxVideoBitrate #########################################################

--

__syntax__: `player.setMaxVideoBitrate(maxBitrate)`

__arguments__:
  - _maxBitrate_ (``Number``): Upper video bitrate limit when adaptive streaming
    is enabled.

--

Set a maximum video bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setVideoBitrate`), the player will never switch
to a video quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that video qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:
```js
player.setMaxVideoBitrate(1e6);
```

Any limit can be removed just by setting that value to ``Infinity``:
```js
// remove video bitrate higher limit
player.setMaxVideoBitrate(Infinity);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-setMaxAudioBitrate"></a>
### setMaxAudioBitrate #########################################################

--

__syntax__: `player.setMaxAudioBitrate(maxBitrate)`

__arguments__:
  - _maxBitrate_ (``Number``): Upper audio bitrate limit when adaptive streaming
    is enabled.

--

Set a maximum audio bitrate reachable through adaptive streaming.

When the bitrate is chosen through adaptive streaming (i.e., not enforced
manually through APIs such as `setAudioBitrate`), the player will never switch
to an audio quality with a bitrate higher than that value.

The exception being when no quality has a lower bitrate, in which case the
minimum quality will always be chosen instead.

For example, if you want that audio qualities chosen automatically never have
a bitrate higher than 1 Megabits per second you can call:
```js
player.setMaxAudioBitrate(1e6);
```

Any limit can be removed just by setting that value to ``Infinity``:
```js
// remove audio bitrate higher limit
player.setMaxAudioBitrate(Infinity);
```

The effect of this method is persisted from content to content. As such, it can
even be called when no content is currently loaded.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getMaxVideoBitrate"></a>
### getMaxVideoBitrate #########################################################

--

__syntax__: `const maxBitrate = player.getMaxVideoBitrate()`

__return value__: ``Number``

--

Returns the maximum video bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxVideoBitrate`
method or through the `maxVideoBitrate` constructor option.

This limit can be further updated by calling the
[setMaxVideoBitrate](#meth-setMaxVideoBitrate) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setVideoBitrate``) bypass this limit completely.


<a name="meth-getMaxAudioBitrate"></a>
### getMaxAudioBitrate #########################################################

--

__syntax__: `const maxBitrate = player.getMaxAudioBitrate()`

__return value__: ``Number``

--

Returns the maximum audio bitrate reachable through adaptive streaming, in bits
per second.

This maximum limit has usually been set either through the `setMaxAudioBitrate`
method or through the `maxAudioBitrate` constructor option.

This limit can be further updated by calling the
[setMaxAudioBitrate](#meth-setMaxAudioBitrate) method.

Note that this only affects adaptive strategies. Forcing the bitrate manually
(for example by calling ``setAudioBitrate``) bypass this limit completely.


<a name="meth-setVideoBitrate"></a>
### setVideoBitrate ############################################################

--

__syntax__: `player.setVideoBitrate(bitrate)`

__arguments__:
  - _bitrate_ (``Number``): Optimal video bitrate (the quality with the maximum
    bitrate inferior to this value will be chosen if it exists).

--

Force the current video track to be of a certain bitrate.

If a video quality in the current track is found with the exact same bitrate,
this quality will be set.

If no video quality is found with the exact same bitrate, either:

  - the video quality with the closest bitrate inferior to that value will be
    chosen.

  - if no video quality has a bitrate lower than that value, the video
    quality with the lowest bitrate will be chosen instead.

By calling this method with an argument set to ``-1``, this setting will be
disabled and the RxPlayer will chose the right quality according to its adaptive
logic.

You can use ``getAvailableVideoBitrates`` to get the list of available bitrates
for the current video track.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same
rules apply for future contents).

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-setAudioBitrate"></a>
### setAudioBitrate ############################################################

--

__syntax__: `player.setAudioBitrate(bitrate)`

__arguments__:
  - _bitrate_ (``Number``): Optimal audio bitrate (the quality with the maximum
    bitrate inferior to this value will be chosen if it exists).

--

Force the current audio track to be of a certain bitrate.

If an audio quality in the current track is found with the exact same bitrate,
this quality will be set.

If no audio quality is found with the exact same bitrate, either:

  - the audio quality with the closest bitrate inferior to that value will be
    chosen.

  - if no audio quality has a bitrate lower than that value, the audio
    quality with the lowest bitrate will be chosen instead.

By calling this method with an argument set to ``-1``, this setting will be
disabled and the RxPlayer will chose the right quality according to its adaptive
logic.

You can use ``getAvailableAudioBitrates`` to get the list of available bitrates
for the current audio track.

Note that the value set is persistent between ``loadVideo`` calls.
As such, this method can also be called when no content is playing (the same
rules apply for future contents).

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getManualVideoBitrate"></a>
### getManualVideoBitrate ######################################################

--

__syntax__: `const currentManualVideoBitrate = player.getManualVideoBitrate()`

__return value__: `Number`

--

Get the last video bitrate manually set. Either via ``setVideoBitrate`` or via
the ``initialVideoBitrate`` constructor option.

This value can be different than the one returned by ``getVideoBitrate``:
  - ``getManualVideoBitrate`` returns the last bitrate set manually by the user
  - ``getVideoBitrate`` returns the actual bitrate of the current video track

``-1`` when no video bitrate is forced.


<a name="meth-getManualAudioBitrate"></a>
### getManualAudioBitrate ######################################################

--

__syntax__: `const currentManualAudioBitrate = player.getManualAudioBitrate()`

__return value__: `Number`

--

Get the last audio bitrate manually set. Either via ``setAudioBitrate`` or via
the ``initialAudioBitrate`` constructor option.

This value can be different than the one returned by ``getAudioBitrate``:
  - ``getManualAudioBitrate`` returns the last bitrate set manually by the user
  - ``getAudioBitrate`` returns the actual bitrate of the current audio track

``-1`` when no audio bitrate is forced.



<a name="meth-group-buffer-control"></a>
## Buffer control ##############################################################

The methods in this chapter allow to get and set limits on how the current
buffer can grow.


<a name="meth-setWantedBufferAhead"></a>
### setWantedBufferAhead #######################################################

--

__syntax__: `player.setWantedBufferAhead(bufferGoal)`

__arguments__:
  - _bufferGoal_ (``Number``): Ideal amount of buffer that should be pre-loaded,
    in seconds.

--

Set the buffering goal, as a duration ahead of the current position, in seconds.

Once this size of buffer reached, the player won't try to download new segments
anymore.

By default, this value is set to `30`.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getWantedBufferAhead"></a>
### getWantedBufferAhead #######################################################

--

__syntax__: `const bufferGoal = player.getWantedBufferAhead()`

__return value__: ``Number``

--

returns the buffering goal, as a duration ahead of the current position, in
seconds.

By default, this value is set to `30`.


<a name="meth-setMaxBufferBehind"></a>
### setMaxBufferBehind #########################################################

--

__syntax__: `player.setMaxBufferBehind(bufferSize)`

__arguments__:
  - _bufferSize_ (``Number``): Maximum amount of buffer behind the current
    position, in seconds.

--

Set the maximum kept buffer before the current position, in seconds.

Everything before that limit (``currentPosition - maxBufferBehind``) will be
automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

You can set it to ``Infinity`` to remove this limit and just let the browser do
this job instead.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getMaxBufferBehind"></a>
### getMaxBufferBehind #########################################################

--

__syntax__: `const bufferSize = player.getMaxBufferBehind()`

__return value__: ``Number``

--

Returns the maximum kept buffer before the current position, in seconds.

This setting can be updated either by:
  - calling the `setMaxBufferBehind` method.
  - instanciating an RxPlayer with a `maxBufferBehind` property set.


<a name="meth-setMaxBufferAhead"></a>
### setMaxBufferAhead ##########################################################

--

__syntax__: `player.setMaxBufferAhead(bufferSize)`

__arguments__:
  - _bufferSize_ (``Number``): Maximum amount of buffer ahead of the current
    position, in seconds.

--

Set the maximum kept buffer ahead of the current position, in seconds.

Everything superior to that limit (``currentPosition + maxBufferAhead``) will
be automatically garbage collected.

This feature is not necessary as the browser should by default correctly
remove old segments from memory if/when the memory is scarce.

However on some custom targets, or just to better control the memory footprint
of the player, you might want to set this limit.

You can set it to ``Infinity`` to remove any limit and just let the browser do
this job instead.

The minimum value between this one and the one returned by
``getWantedBufferAhead`` will be considered when downloading new segments.

:warning: Bear in mind that a too-low configuration there (e.g. inferior to
``10``) might prevent the browser to play the content at all.

--

:warning: This option will have no effect for contents loaded in _DirectFile_
mode (see [loadVideo options](./loadVideo_options.md#prop-transport)).


<a name="meth-getMaxBufferAhead"></a>
### getMaxBufferAhead ##########################################################

--

__syntax__: `const bufferSize = player.getMaxBufferAhead()`

__return value__: ``Number``

--

Returns the maximum kept buffer ahead of the current position, in seconds.

This setting can be updated either by:
  - calling the `setMaxBufferAhead` method.
  - instanciating an RxPlayer with a `maxBufferAhead` property set.



<a name="meth-group-buffer-info"></a>
## Buffer information ##########################################################

The methods in this chapter allows to retrieve information about what is
currently buffered.

<a name="meth-getCurrentBufferGap"></a>
### getCurrentBufferGap ##########################################################

--

__syntax__: `const bufferGap = player.getCurrentBufferGap()`

__return value__: ``Number``

--

Returns in seconds the difference between:
  - the current time.
  - the end of the current contiguous loaded range.

In other words, this is the amount of seconds left in the buffer before the end
of the current contiguous range of media data.
If we're currently playing at the position at `51` seconds, and there is media
data from the second `40` to the second `60`, then `getCurrentBufferGap()` will
return `9` (`60 - 51`).


<a name="meth-group-content-info"></a>
## Content information #########################################################

The methods documented in this chapter allows to obtain general information
about the current loaded content.


<a name="meth-isLive"></a>
### isLive #####################################################################

--

__syntax__: `const isLive = player.isLive()`

__return value__: ``Boolean``

--

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

--

__syntax__: `const url = player.getUrl()`

__return value__: ``string``

--

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


<a name="meth-getCurrentKeySystem"></a>
### getCurrentKeySystem ########################################################

--

__syntax__: `const keySystemName = player.getCurrentKeySystem()`

__return value__: ``string|undefined``

--

Returns the type of keySystem used for DRM-protected contents.



<a name="meth-group-deprecated"></a>
## Deprecated ##################################################################

The following methods are deprecated. They are still supported but we advise
users to not use those as they might become not supported in the future.


<a name="meth-getImageTrackData"></a>
### getImageTrackData ##########################################################

--

:warning: This method is deprecated, it will disappear in the next major
release ``v4.0.0`` (see [Deprecated APIs](./deprecated.md)).

--

--

__syntax__: `const data = player.getImageTrackData()`

__return value__: ``Array.<Object>|null``

--

The current image track's data, null if no content is loaded / no image track
data is available.

The returned array follows the usual image playlist structure, defined
[here](./images.md#api-structure).

``null`` in _DirectFile_ mode (see [loadVideo
options](./loadVideo_options.md#prop-transport)).



<a name="static"></a>
## Static properties ###########################################################

This chapter documents the static properties that can be found on the RxPlayer
class.

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



<a name="tools"></a>
## Tools #######################################################################

The RxPlayer has several "tools", which are utils which can be imported without
importing the whole RxPlayer itself.

They are all documented here.


<a name="tools-string-utils"></a>
### StringUtils ################################################################

Tools to convert strings into bytes and vice-versa.

The RxPlayer internally has a lot of code dealing with strings to bytes
conversion (and vice-versa). This tool exports that logic so you don't have to
rewrite it yourself.

You might need one of those functions for example when dealing with challenge
and licenses, which are often under a binary format.

#### How to import it

The simplest way to import the StringUtils is by importing it as a named export
from "rx-player/tools", like so:
```js
import { StringUtils } from "rx-player/tools";

console.log(StringUtils.strToUtf8("hello😀"));
```

You can also import only the function(s) you want to use by importing it
directly from "rx-player/tools/string-utils":
```js
import { strToUtf8 } from "rx-player/tools/string-utils";
console.log(strToUtf8("hello😀"));
```

#### StringUtils functions

`StringUtils` is an object containing the following functions:

  - `strToUtf8`: Convert a JS string passed as argument to an Uint8Array of its
    corresponding representation in UTF-8.

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    StringUtils.strToUtf8("hello😀");
    // => Uint8Array(9) [ 104, 101, 108, 108, 111, 240, 159, 152, 128 ]
    //                    "h"  "e"  "l"  "l"  "o"  "grinning face" emoji
    ```

  - `utf8ToStr`: Convert a Uint8Array containing a string encoded with UTF-8
    into a JS string.

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    const uint8Arr = new Uint8Array([104, 101, 108, 108, 111, 240, 159, 152, 128]);
    StringUtils.utf8ToStr(uint8Arr);
    // => "hello😀"
    ```

    Note: if what you have is an `ArrayBuffer`, you have to convert it to an
    `Uint8Array` first:
    ```js
    import { StringUtils } from "rx-player/tools";
    const toUint8Array = new Uint8Array(myArrayBuffer);
    console.log(StringUtils.utf8ToStr(toUint8Array));
    ```

  - `strToUtf16LE`: Convert a JS string passed as argument to an Uint8Array
    containing its corresponding representation in UTF-16-LE (little endian
    UTF-16).

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    StringUtils.strToUtf16LE("hi😀");
    // => Uint8Array(9) [ 104, 0, 105, 0, 61, 216, 0, 222 ]
    //                    "h"     "i"     "grinning face" emoji
    ```

  - `utf16LEToStr`: Convert a Uint8Array containing a string encoded with
    UTF-16-LE (little endian UTF-16) into a JS string.

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    const uint8Arr = new Uint8Array([104, 0, 105, 0, 61, 216, 0, 222]);
    StringUtils.utf16LEToStr(uint8Arr);
    // => "hi😀"
    ```

    Note: if what you have is an `ArrayBuffer`, you have to convert it to an
    `Uint8Array` first:
    ```js
    import { StringUtils } from "rx-player/tools";
    const toUint8Array = new Uint8Array(myArrayBuffer);
    console.log(StringUtils.utf16LEToStr(toUint8Array));
    ```

  - `strToUtf16BE`: Convert a JS string passed as argument to an Uint8Array
    containing its corresponding representation in UTF-16-BE (big endian
    UTF-16).

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    StringUtils.strToUtf16BE("hi😀");
    // => Uint8Array(9) [ 0, 104, 0, 105, 216, 61, 222, 0 ]
    //                    "h"     "i"     "grinning face" emoji
    ```

  - `utf16BEToStr`: Convert a Uint8Array containing a string encoded with
    UTF-16-BE (big endian UTF-16) into a JS string.

    Example:
    ```js
    import { StringUtils } from "rx-player/tools";
    const uint8Arr = new Uint8Array([0, 104, 0, 105, 216, 61, 222, 0]);
    StringUtils.utf16BEToStr(uint8Arr);
    // => "hi😀"
    ```

    Note: if what you have is an `ArrayBuffer`, you have to convert it to an
    `Uint8Array` first:
    ```js
    import { StringUtils } from "rx-player/tools";
    const toUint8Array = new Uint8Array(myArrayBuffer);
    console.log(StringUtils.utf16BEToStr(toUint8Array));
    ```


<a name="tools-textTrackRenderer"></a>
### TextTrackRenderer ##########################################################

The TextTrackRenderer allows to easily render subtitles synchronized to a video
element.

It allows easily to dynamically add subtitles (as long as it is in one of the
following format: srt, ttml, webVTT or SAMI) to a played video.

This tool is documented [here](./TextTrackRenderer.md).


<a name="tools-VideoThumbnailLoader"></a>
### VideoThumbnailLoader #######################################################

The VideoThumbnailLoader is a tool allowing to display preview thumbnails based
on possible trickmode video tracks in a content.

More information on this tool and how to use it [here](./videoThumbnailLoader.md).

<a name="tools-mediaCapabilitiesProber"></a>
### MediaCapabilitiesProber ####################################################

--

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

--


An experimental tool to probe browser media capabilities:
  - Decoding capabilities
  - DRM support
  - HDCP support
  - Display capabilities

You can find its documentation [here](./mediaCapabilitiesProber.md).


<a name="tools-parseBifThumbnails"></a>
### parseBifThumbnails #########################################################

--

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

--

The `parseBifThumbnails` function parses BIF files, which is a format used
to declare thumbnails linked to a given content.

This tool is documented [here](./parseBifThumbnails.md).

<a name="tools-createMetaplaylist"></a>
### createMetaplaylist #########################################################

--

:warning: This tool is experimental. This only means that its API can change at
any new RxPlayer version (with all the details in the corresponding release
note).

--

The `createMetaplaylist` function build a metaplaylist object from given
informations about contents.

This tool is documented [here](./createMetaplaylist.md).
