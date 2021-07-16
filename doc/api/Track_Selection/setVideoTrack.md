# setVideoTrack

## Description

Change the current video track.

The argument to this method is the wanted track's `id` property. This `id` can
for example be obtained on the corresponding track object returned by the
`getAvailableVideoTracks` method.

If trickmode tracks are enabled (usually through the corresponding
`setPlaybackRate` method option) and if that new video track is linked to
trickmode tracks, one of the trickmode tracks will be loaded instead.

Note that trickmode tracks cannot be forced through the `setVideoTrack` method
by giving directly the trickmode tracks' id.

If you want to enable or disable trickmode tracks, you should use
`setPlaybackRate` instead.

---

etting a new video track when a previous one was already playing can lead the
rx-player to "reload" this content.

During this period of time:

- the player will have the state `RELOADING`
- Multiple APIs linked to the current content might not work.
  Most notably:
  - `play` will not work
  - `pause` will not work
  - `seekTo` will not work
  - `getPosition` will return 0
  - `getWallClockTime` will return 0
  - `getMediaDuration` will return `NaN`
  - `getAvailableAudioTracks` will return an empty array
  - `getAvailableTextTracks` will return an empty array
  - `getAvailableVideoTracks` will return an empty array
  - `getTextTrack` will return `null`
  - `getAudioTrack` will return `null`
  - `setAudioTrack` will throw
  - `setTextTrack` will throw

<div class="note">
Note for multi-Period contents:
<br>
This method will only have an effect on the
<a href="../../Getting_Started/Glossary.md#period">Period</a> that is currently
playing.  If you want to update the track for other Periods as well, you might
want to either:
<br>
<ul>
  <li>update the current video track once a `"periodChange"` event has been
  received.</li>
  <li>update first the preferred video tracks through the
  <a href="./setPreferredVideoTracks.md">setPreferredVideoTracks</a> method.
  </li>
</ul>
</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

## Syntax

```js
player.setVideoTrack(videoTrackId);
```

 - **arguments**:

   1. _videoTrackId_ `string|Number`: The `id` of the track you want to set
