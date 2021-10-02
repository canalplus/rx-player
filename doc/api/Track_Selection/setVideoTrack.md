# setVideoTrack

## Description

Change the video track.

This method can take a string corresponding to the wanted track's `id` property.
This `id` can for example be obtained on the corresponding track object returned
by the `getAvailableVideoTracks` method.

```js
// Setting the first video track
const video = rxPlayer.getAvailableVideoTracks();
rxPlayer.setVideoTrack(video[0].id);
```

`setVideoTrack` can also accept an object argument allowing more precize
settings, described below.
In the case an object is given, the video track's id should be set as in a
`trackId` property.
```js
// Setting the first video track
const videoTracks = rxPlayer.getAvailableVideoTracks();
rxPlayer.setVideoTrack({
  trackId: videoTracks[0].id,
});
```


If trickmode tracks are enabled (usually through the corresponding
[`setPlaybackRate`](../Speed_Control/setPlaybackRate.md) method option) and if
that new video track is linked to trickmode tracks, one of the trickmode tracks
will be loaded instead.

Note that trickmode tracks cannot be forced through the `setVideoTrack` method
by giving directly the trickmode tracks' id.
If you want to enable or disable trickmode tracks, you should use
`setPlaybackRate` instead.

Setting a new video track when a previous one was already playing can lead by
default to a `RELOADING` player state, during which playback might go into a
transitory black screen and while multiple API will not be available.
You can forbid this from happening (with some disadvantages, by explicitely setting

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

### Changing the video track for any Period

You can change the video track for any
[Period](../../Getting_Started/Glossary.md#period) (and not just the one being
played) by indicating its `id` property in a `periodId` property of the Object
given to `setVideoTrack`.

Periods' `id` properties can be retrieved from several means such as the
`getAvailablePeriods` method or the
[`newAvailablePeriods`](../Player_Events.md#newavailableperiods) and
[`periodChange`](../Player_Events.md#periodchange) events.

```js
// Example:
// Changing the video track for the second Period in the current Manifest

// Recuperating all Periods currently in the Manifest
const periods = rxPlayer.getAvailablePeriods();

// Getting the video track for this second Period (and not the current one):
const videoTracks = rxPlayer.getAvailableVideoTracks(periods[1].id);

// Updating the video track of the second Period
rxPlayer.setVideoTrack({
  trackId: videoTracks[0].id,
  periodId: periods[1].id,
});

```

### Changing the way the video track transition is done

When switching the video track, media data from the previous video track might
still be present and playable in the buffer.

Because you might prefer a direct transition - which may lead to a little
rebuffering or even reloading short moment over a seamless transition where
the previous video track might be still visible for a few seconds, the RxPlayer
let you define a "switching mode" by setting the `switchingMode` property given
to `setVideoTrack`.

The available "switching modes" are:

  - `"seamless"`: Clean the previous video track from the buffer, yet keep some
    of its data around the current position to ensure the transition stay
    seamless (i.e. playback still continue).

    The advantage is that the switch will not be abrupt (playback will not be
    interrupted) but you might still have a few seconds playing in the
    previous video track.

  - `"direct"`: Directly and visibly switch to the new tracks.
    Here you will ensure that the now unwanted tracks won't be
    played in the future but you might be left with a playback interruption
    and some rebuffering time while the new video track is loaded.

  - `"reload"`: Directly and visibly switch to the new tracks, maybe going
    through the `"RELOADING"` state if necessary, during which a black screen is
    shown and multiple APIs are unavailable.

    This mode might be preferable to the `"direct"` mode for several reasons:

      - the `"direct"` mode might trigger some rebuffering time during which the
        last video frame from the previous video track is still shown.

        By comparison, `"reload"` whould show a black screen here instead.

      - This mode might have better results than `"direct"` on devices with poor
        compatibility

```js
// example: switching video tracks in "direct" mode
rxPlayer.setVideoTrack({
  // we will just lock the first one here
  trackId: [videoTrackId],
  switchingMode: "direct",
});
```


### Selecting only some Representations in the new video track

You can also start "locking" only a given set of Representations in the new
track (so that only those Representations will be played) as soon as you switch
the video track.

This can be done by adding a `lockedRepresentations` property to the
`setVideoTrack` call, which should contain an array of the wanted
Representations' `id` property:

```js
const videoTracks = rxPlayer.getAvailableVideoTracks();
const wantedVideoTrack = videoTracks[1];
rxPlayer.setVideoTrack({
  trackId: wantedVideoTrack.id,
  lockedRepresentations: [wantedVideoTrack.representations[0]],
});
```

Doing this is equivalent to locking the video Representations through a
[`lockAudioVideoRepresentations`](../Representation_Selection/lockAudioVideoRepresentations.md)
call, you can read its documentation page for more information on its behavior.


### Setting the video track as soon as possible

It is possible to set the video track before any other is chosen for that
Period, by reacting to the `newAvailablePeriods` event:

```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (const period of periods) {
    const periodId = period.id;
    const firstVideoTrack = rxPlayer.getAvailableVideoTracks(periodId)[0];
    if (firstVideoTrack !== undefined) {
      rxPlayer.setVideoTrack({
        trackId: firstVideoTrack.id,
        periodId,
      });
    }
  }
});
```

If the current content was already playing, you can also call the
`getAvailablePeriods` method to obtain their `id` property and update their
video trackss right away:

```js
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  const periodId = period.id;
  const firstVideoTrack = rxPlayer.getAvailableVideoTracks(periodId)[0];
  if (firstVideoTrack !== undefined) {
    rxPlayer.setVideoTrack({
      trackId: firstVideoTrack.id,
      periodId,
    });
  }
}
```

## Syntax

```js
player.setVideoTrack(videoTrackId);
```

 - **arguments**:

   1. _videoTrackId_ `string`: The `id` of the track you want to set

```js
// Setting the current video track
player.setVideoTrack(videoTrackId);

// More complex settings
player.setVideoTrack({
  // required
  trackId: videoTrackId,

  // all optional
  periodId,
  switchingMode,
  lockedRepresentations,
});
```

 - **arguments**:

   1. _arg_ `string|Object`: Either the video track's `id` property of the
     track you want to set for current Period, or an object with the following
     properties (only `trackId` is required):

       - `trackId` (`string`): The `id` property of the track you want to lock.

       - `periodId` (`string|undefined`): If defined, the id of the concerned
         Period. If not defined, it will be applied for the current Period.

       - `switchingMode` (`string|undefined`): Behavior of the RxPlayer if there
         is a need to perform a transition between a previous video track and
         the new one.
         The list of modes available are described in this page.

       - `lockedRepresentations` (`Array.<string>|undefined`): The list of
         Representations' id you wish to "lock" when switching to the new track.
         More information [in the corresponding documentation
         page](../Representation_Selection/lockAudioVideoRepresentations.md).
