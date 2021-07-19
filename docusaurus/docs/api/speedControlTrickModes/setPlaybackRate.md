---
id: setPlaybackRate-api
title: setPlaybackRate method
sidebar_label: setPlaybackRate
slug: setPlaybackRate
---

---

**syntax**: `player.setPlaybackRate(speed)` /
`player.setPlaybackRate(speed, { preferTrickModeTracks })`

**arguments**:

- _speed_ (`Number`): The speed / playback rate you want to set.
- _options_ (`Object|undefined`): Options related to the speed update.

---

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
