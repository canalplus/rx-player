# setAudioTrack

## Description

Change the audio track.

This method can take a string corresponding to the wanted track's `id` property.
This `id` can for example be obtained on the corresponding track object returned
by the `getAvailableAudioTracks` method.

```js
// Setting the first audio track
const audioTracks = rxPlayer.getAvailableAudioTracks();
rxPlayer.setAudioTrack(audioTracks[0].id);
```

`setAudioTrack` can also accept an object argument allowing more precize
settings, described below.
In the case an object is given, the audio track's id should be set as in a
`trackId` property.
```js
// Setting the first audio track
const audioTracks = rxPlayer.getAvailableAudioTracks();
rxPlayer.setAudioTrack({
  trackId: audioTracks[0].id,
});
```

<div class="warning">
If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change subtitle
track too).
This has two potential reasons :

<ul>
  <li>The HLS defines variants, groups of tracks that may be read together</li>
  <li>Safari may decide to enable a track for accessibility or user language
  convenience (e.g. Safari may switch subtitle to your OS language if you pick
  another audio language)
  You can know if another track has changed by listening to the corresponding
  events that the tracks have changed.</li>
</ul>
</div>

### Changing the audio track for any Period

You can change the audio track for any
[Period](../../Getting_Started/Glossary.md#period) (and not just the one being
played) by indicating its `id` property in a `periodId` property of the Object
given to `setAudioTrack`.

Periods' `id` properties can be retrieved from several means such as the
`getAvailablePeriods` method or the
[`newAvailablePeriods`](../Player_Events.md#newavailableperiods) and
[`periodChange`](../Player_Events.md#periodchange) events.

```js
// Example:
// Changing the audio track for the second Period in the current Manifest

// Recuperating all Periods currently in the Manifest
const periods = rxPlayer.getAvailablePeriods();

// Getting the audio track for this second Period (and not the current one):
const audioTracks = rxPlayer.getAvailableAudioTracks(periods[1].id);

// Updating the audio track of the second Period
rxPlayer.setAudioTrack({
  trackId: audioTracks[0].id,
  periodId: periods[1].id,
});

```

### Changing the way the audio track transition is done

When switching the audio track, media data from the previous audio track might
still be present and playable in the buffer.

Because you might prefer a direct transition - which may lead to a little
rebuffering (or even reloading) short moment over a seamless transition where
the previous audio track might be still audible for a few seconds, the RxPlayer
let you define a "switching mode" by setting the `switchingMode` property given
to `setAudioTrack`.

The available "switching modes" are:

  - `"seamless"`: Clean the previous audio track from the buffer, yet keep some
    of its data around the current position to ensure the transition stay
    seamless (i.e. playback still continue).

    This is the default mode.
    The advantage is that the switch will not be abrupt (playback will not be
    interrupted) but you might still have a few seconds playing in the
    previous audio track.

  - `"direct"`: Directly audibly switch to the new tracks.
    Here you will ensure that the now unwanted tracks won't be
    played in the future but you might be left with a playback interruption
    and some rebuffering time while the new audio track is loaded.

  - `"reload"`: Directly audibly switch to the new tracks
    through a "reloading" step if necessary.

    This mode might have better results than `"direct"` on devices with poor
    compatibility, but the RxPlayer might temporarily go through
    a `"RELOADING"` state, during which a black screen is shown and multiple
    APIs are unavailable.

```js
// example: switching audio tracks in "direct" mode
rxPlayer.setAudioTrack({
  // we will just lock the first one here
  trackId: [audioTrackId],
  switchingMode: "direct",
});
```


### Selecting only some Representations in the new audio track

You can also start "locking" only a given set of Representations in the new
track (so that only those Representations will be played) as soon as you switch
the audio track.

This can be done by adding a `lockedRepresentations` property to the
`setAudioTrack` call, which should contain an array of the wanted
Representations' `id` property:

```js
const audioTracks = rxPlayer.getAvailableAudioTracks();
const wantedAudioTrack = audioTracks[1];
rxPlayer.setAudioTrack({
  trackId: wantedAudioTrack.id,
  lockedRepresentations: [wantedAudioTrack.representations[0]],
});
```

Doing this is equivalent to locking the audio Representations through a
[`lockAudioVideoRepresentations`](../Representation_Selection/lockAudioVideoRepresentations.md)
call, you can read its documentation page for more information on its behavior.


### Setting the audio track as soon as possible

It is possible to set the audio track before any other is chosen for that
Period, by reacting to the `newAvailablePeriods` event:

```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (const period of periods) {
    const periodId = period.id;
    const firstAudioTrack = rxPlayer.getAvailableAudioTracks(periodId)[0];
    if (firstAudioTrack !== undefined) {
      rxPlayer.setAudioTrack({
        trackId: firstAudioTrack.id,
        periodId,
      });
    }
  }
});
```

If the current content was already playing, you can also call the
`getAvailablePeriods` method to obtain their `id` property and update their
audio trackss right away:

```js
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  const periodId = period.id;
  const firstAudioTrack = rxPlayer.getAvailableAudioTracks(periodId)[0];
  if (firstAudioTrack !== undefined) {
    rxPlayer.setAudioTrack({
      trackId: firstAudioTrack.id,
      periodId,
    });
  }
}
```

## Syntax

```js
player.setAudioTrack(audioTrackId);
```

 - **arguments**:

   1. _audioTrackId_ `string`: The `id` of the track you want to set

```js
// Setting the current audio track
player.setAudioTrack(audioTrackId);

// More complex settings
player.setAudioTrack({
  // required
  trackId: audioTrackId,

  // all optional
  periodId,
  switchingMode,
  lockedRepresentations,
});
```

 - **arguments**:

   1. _arg_ `string|Object`: Either the audio track's `id` property of the
     track you want to set for current Period, or an object with the following
     properties (only `trackId` is required):

       - `trackId` (`string`): The `id` property of the track you want to lock.

       - `periodId` (`string|undefined`): If defined, the id of the concerned
         Period. If not defined, it will be applied for the current Period.

       - `switchingMode` (`string|undefined`): Behavior of the RxPlayer if there
         is a need to perform a transition between a previous audio track and
         the new one.
         The list of modes available are described in this page.

       - `lockedRepresentations` (`Array.<string>|undefined`): The list of
         Representations' id you wish to "lock" when switching to the new track.
         More information [in the corresponding documentation
         page](../Representation_Selection/lockAudioVideoRepresentations.md).
