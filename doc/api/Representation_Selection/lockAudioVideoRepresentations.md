# lockVideoRepresentations / lockAudioRepresentations

## Description

Allows to specify respectively which video or audio Representations (a.k.a.
qualities) can be played in the current audio or video track, by specifying
those Representations's `id` property.

The RxPlayer will then choose which Representation to play between them through
its usual adaptive logic.
You can also force a single Representation by setting only one id in the
corresponding array.

The list and characteristics of each video or audio Representation as well as
their `id` property can be found in the `representations` array returned
respectively by the `getVideoTrack()` or `getAudioTrack()` method:

```js
// example: locking 1080p video Representations or more

const videoTrack = rxPlayer.getVideoTrack();
if (videoTrack === null) {
  throw new Error("No video track currently");
}
const repIds = videoTrack.representations
 .filter(rep => rep.height !== undefined && rep.height >= 1080)
 .map(rep => rep.id);
rxPlayer.lockVideoRepresentations(repIds);
```

This function can be used in a much more advanced way by giving it an object
as argument (instead of just an array of the wanted Representations' id), where
the Representations' id are set as a `representations` property.
More information on this below.

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>),
this method has no effect.
</div>

### About "locking" and "unlocking"

This mechanism of only enabling some Representations for a given track is
called "locking Representations".

Calling this method allows to start locking Representations until either:

  - they are unlocked (through respectively the `unlockVideoRepresentations`
  or `unlockAudioRepresentations` method)

  - the corresponding track is changed: the lock is removed after switching
  the track for that Period. If you choose to come back to the
  original track in the future, it won't be locked anymore either.

  - the RxPlayer "break" the lock. This is a very rare occurence happening when
  locked Representations all become unavailable. More details on this below.

You can know if video or audio Representations are locked for the current
track (or even for the track of any Period in the content) by calling
respectively the `getLockedVideoRepresentations` or
`getLockedAudioRepresentations` method. It will either return `null` if
no lock is active or the list of locked Representations's `id` if a lock is
currently active.

### Locking the Representations for another Period

`lockVideoRepresentations` / `lockAudioRepresentations` can also be used to
lock video and audio Representations for a Period that is not yet being played.

In those more advanced usages, those methods can take an object, where the
representations to lock can be set as a `representations` property, and the
wanted period can be indicated by setting its id as a `periodId` property.

You can list all Periods in the current content and their id by calling the
`getAvailablePeriods` API.

```js
// example: locking an audio Representation for the second Period.

const periods = rxPlayer.getAvailablePeriods();
const secondPeriod = periods[1];
const audioTrack = rxPlayer.getAudioTrack(secondPeriod.id);

rxPlayer.lockAudioRepresentations({
  // we will just lock the first one here
  representations: [audioTrack.representations[0].id,
  periodId: secondPeriod.id,
});
```

### Configuring the "switching mode"

The RxPlayer might already have buffered data before you lock Representations,
meaning that some Representations which are from now unwanted may already be in
the buffer and thus might still be played.

Because you might want an abrupt but direct transition between old
Representations and the new ones, or a more seamless transition, you can
configure the way with which the RxPlayer may switch from the previous
Representations to the new locked ones.

This is called the "switching mode" and it is configurable through the
`switchingMode` property that can be passed to `lockAudioRepresentations` and
`lockVideoRepresentations`.

If you do not care that the old Representations in the buffer might still
be played, you can set this mode to `"seamless"`(will clean the buffer but
without cleaning the data around the current position to keep a smooth
playback) or to `"lazy"` (keep the buffer as is, without cleaning what was
there before).

If however you want to perform a strict and directly visible/audible switch,
you might prefer to set it to `"direct"` (which might trigger a brief
rebuffering) or to `"reload"` (which might trigger a temporary black screen).

Here is the description of all possible modes:

  - `"seamless"`: Clean the buffer from buffered media content from now
    unwanted Representations, yet keep some of that data around the current
    position to ensure the transition stay seamless (i.e. playback still
    continue).

    This is the default mode when locking Representations.
    The advantage is that the switch will not be abrupt (playback will not be
    interrupted) but you might still have a few seconds playing in the
    previous quality.

  - `"lazy"`: Keep all other Representations in the buffer.

    This is the default RxPlayer's behavior when changing the quality through
    regular adaptive streaming.

    The advantage here is that this is the most efficient in terms of network
    resources, though you might still play now unwanted Representations in the
    future.
    This option is particularly useful if the lock is for example used to
    ensure a networking bandwidth cap: here you might want that new segments
    only be from low quality Representations but you would not care about
    already-loaded segments.

  - `"direct"`: Directly visibly/audibly switch to the new Representations.
    Here you will ensure that the now unwanted Representations won't be
    played in the future but you might be left with a playback interruption
    and some rebuffering time while the new quality is loaded.

  - `"reload"`: Directly visibly/audibly switch to the new Representations
    through a "reloading" step if necessary.

    Under that mode, you will ensure that the previous frame won't be visible
    anymore and you might also have better results than `"direct"` on devices
    with poor compatibility, but the RxPlayer might temporarily go through
    a `"RELOADING"` state, during which a black screen is shown and multiple
    APIs are unavailable.

```js
// example: switching video qualities in "direct" mode

const videoTrack = rxPlayer.getVideoTrack();
rxPlayer.lockVideoRepresentations({
  // we will just lock the first one here
  representations: [videoTrack.representations[0].id],
  switchingMode: "direct",
});
```

### "Breaking" the lock

There is an edge case that should be noted, especially for encrypted
contents relying on multiple decryption keys:
Some rare events can make some previously-available Representations become
unavailable. The main (and as of v4.0.0, only) reason would be encrypted
Representations whose decryption key cannot either be used or obtained.

In the event where all locked Representations become unavailable, the
RxPlayer will automatically unlock Representations for that track so it can
continue to play the content, a mechanism we call here "breaking the lock".
You can be notified when this happens and react accordingly (e.g. to lock
other Representations or stop playback) by listening and reacting to the
`brokenRepresentationsLock` RxPlayer event.

```js
// example: stopping playback when the lock is broken
rxPlayer.addEventListener("brokenRepresentationsLock", () => {
  rxPlayer.stop();
});
```

### Locking Representations as soon as possible

You can choose to lock video and audio Representations from any Period before
any media content from that Period is being loaded and buffered by reacting to
the `newAvailablePeriods` event:

```js
// example: locking the first video Representation for each future Period
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (const period of periods) {
    const videoTrack = rxPlayer.getVideoTrack(period.id);
    rxPlayer.lockVideoRepresentations([videoTrack.representations[0]]);
  }
});
```

If the content has already loaded, you can also retrieve the list of
already-loaded Periods (and lock their Representations) thanks to the
`getAvailablePeriods` method:

```js
// example: locking the first video Representation for each current Period
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  const videoTrack = rxPlayer.getVideoTrack(period.id);
  rxPlayer.lockVideoRepresentations([videoTrack.representations[0]]);
}
```


### Locking Representations when switching to a new track

You can also choose to lock video and audio Representations as soon as you
switch respectively the video or audio track by calling `setVideoTrack` or
`setAudioTrack` with a `lockedRepresentations` property, which will contain the
ids of the Representations to lock.

```js
// example: locking video Representations when switching the video track
const videoTracks = rxPlayer.getAvailableVideoTracks();
const wantedVideoTrack = videoTracks[1];
rxPlayer.setVideoTrack({
  trackId: wantedVideoTrack.id,
  lockedRepresentations: [wantedVideoTrack.representations[0]],
});
```

## Syntax

```js
// Locking the current video Representations
player.lockVideoRepresentations(lockedRepresentationsId);

// More complex configurations
player.lockVideoRepresentations({
  // required
  representations: lockedRepresentationsId,

  // all optional
  periodId,
  switchingMode,
});

// Locking the current audio Representations
player.lockAudioRepresentations(lockedRepresentationsId);

// More complex configurations
player.lockAudioRepresentations({
  // required
  representations: lockedRepresentationsId,

  // all optional
  periodId,
  switchingMode,
});
```

 - **arguments**:

   1. _arg_ `Array.<string>|Object`: Either a list of the Representations' id to
     lock for the current Period, or an object with the following properties
     (only `representations` is required):

       - `representations` (`Array.<string>`): The list of Representations'id to
         lock.

       - `periodId` (`string|undefined`): If defined, the id of the concerned
         Period. If not defined, it will be applied for the current Period.

       - `switchingMode` (`string|undefined`): Behavior of the RxPlayer if there
         is a need to perform a transition between previous Representation(s)
         to the new locked ones. The list of modes available are described in
         this page.
