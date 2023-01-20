# Bitrate Selection

## Methods and options removed

The `v4.0.0` release totally changes how Representations (a.k.a. qualities or
profiles) selection works.
Previously, this selection was only based on bitrate settings. It is now more
explicit by directly allowing an application to select which Representation(s)
it wants to be able to play.

Due to this, v3.x.x methods related to controlling the current audio and video
bitrate:
  - `setMinVideoBitrate`
  - `setMinAudioBitrate`
  - `getMinVideoBitrate`
  - `getMinAudioBitrate`
  - `setMaxVideoBitrate`
  - `setMaxAudioBitrate`
  - `getMaxVideoBitrate`
  - `getMaxAudioBitrate`
  - `setVideoBitrate`
  - `setAudioBitrate`
  - `getManualVideoBitrate`
  - `getManualAudioBitrate`

As well as the following constructor options:
  - `minVideoBitrate`
  - `minAudioBitrate`
  - `maxVideoBitrate`
  - `maxAudioBitrate`

Have all been removed.


## Why was those removed?

When drafting a better API for Representation selection than what we had before,
we finally reached a point where we were constructing an API that would allow
to replicate all those methods and options. Even better, they could now be based
on any criteria (e.g. on the video quality's height, framerate, codecs,
decipherability status etc.), and not just its bitrate.

This, and the fact that the specific audio or video quality's bitrate might not
always be known depending on the streaming technology, led us to remove the
previous bitrate-specific API to the more general and powerful "Representations
locking" API that will be shown in this page.


## How to replace them

### Semantic of the previous API

What the bitrate methods and options were doing was basically to restrain the
pool of `Representation` the RxPlayer would chose from based on each of those
object's `bitrate` property.

Basically, calling `setMaxVideoBitrate(1000)` / `maxVideoBitrate: 1000` would
filter out all video `Representation` whose `bitrate` was higher than `1000`
(with an exception if no `Representation` passed that test, in which case it
would take the Representation(s) with the lowest bitrate instead).

Likewise `setMinVideoBitrate(1000)` / `minVideoBitrate: 1000` would the other way
around filter out all video `Representation` was lower than `1000` (with again
the same exception than the maxVideoBitrate one, only the highest bitrate now).

At last `setVideoBitrate(1000)` would select the `Representation` with a bitrate
set exactly to `1000`, immediately lower if not found, or the closest if no
`Representation` has a bitrate lower or equal to `1000`.


### Now: Locking Representations explicitly

Now, there's a new set of methods and options allowing to explicitly filter
`Representation` based on any criteria you want and for any choosen track:

  - the [`lockVideoRepresentations` and `lockAudioRepresentations`
    methods](../../api/Representation_Selection/lockAudioVideoRepresentations.md),
    only authorize respectively some video and some audio `Representation`
    from being played by the RxPlayer.

    For example to only allows some video Representations called "repA" and
    "repB", for the current Period (that is: the content being played right
    now), you could write:
    ```js
    rxPlayer.lockVideoRepresentations([repA.id, repB.id]);
    ```

  - [`setAudioTrack`](../../api/Track_Selection/setAudioTrack.md) and
    [`setVideoTrack`](../../api/Track_Selection/setVideoTrack.md) now also
    allows to only authorize some audio and video `Representation` from being
    played in the chosen track by setting a `lockedRepresentations` property.

    For example to only allow the Representations "rep1" and "rep2" in a new
    audio track "aTrack", you could write:
    ```js
    rxPlayer.setAudioTrack({
      trackId: aTrack.id,
      lockedRepresentations: [rep1.id, rep2.id],
    });
    ```

  - the [`getLockedVideoRepresentations` and `getLockedAudioRepresentations`
    methods](../../api/Representation_Selection/XXX TODO), allows to get the
    list of respectively the currently locked video and audio Representations,
    or `null` if none are locked for that type:
    ```js
    const lockedVideoRepresentations = rxPlayer.getLockedVideoRepresentations();
    if (lockedVideoRepresentations === null) {
      console.log("There's no video Representation locked for the current content");
    } else {
      console.log(
        "`id` property of the video Representations locked for the current content:",
        lockedVideoRepresentations
      );
    }
    ```

  - the [`unlockVideoRepresentations` and `unlockAudioRepresentations`
    methods](../../api/Representation_Selection/XXX TODO), allows to unlock
    previously respectively "locked" video and audio Representations.

    ```js
    // Re-enable all video Representations (which previously have been
    // restrained for example by a `lockVideoRepresentations` call:
    rxPlayer.unlockVideoRepresentations();
    ```

### Obtaining the `Representation` objects

As for the `Representation` objects themselves, they can for example be obtained
by using:

  - [`getVideoTrack`](../../api/Track_Selection/getVideoTrack.md) for a
    currently-chosen video track, through its `representations` property, whose
    content is an array of elements each describing a `Representation` linked to
    that video track.
    ```js
    const currentVideoTrack = rxPlayer.getVideoTrack();
    console.log(
      "This video track has " +
      currentVideoTrack.representations.length +
      " different video Representation(s)"
    );
    for (let i = 0; i < currentVideoTrack.representations.length; i++) {
      console.log(
        "The Representation number " + i + " has a bitrate set to: " +
        currentVideoTrack.representations[i].bitrate
      );
    }
    ```

  - [`getAudioTrack`](../../api/Track_Selection/getAudioTrack.md) for a
    currently-chosen audio track, again through its `representations` property.
    ```js
    const currentAudioTrack = rxPlayer.getAudioTrack();
    console.log(
      "This audio track has " +
      currentAudioTrack.representations.length +
      " different audio Representation(s)"
    );
    ```

  - [`getAvailableVideoTracks`](../../api/Track_Selection/getAvailableVideoTracks.md)
    for all available video tracks linked to a Period, here the
    `representations` property is still present on each "track object" returned
    by that method.
    ```js
    const trackList = rxPlayer.getAvailableVideoTracks();
    console.log(`There are currently ${trackList.length} video track(s) available`);
    for (let i = 0; i < trackList.representations.length; i++) {
      console.log("Data for video track number " + i + ":");
      const videoTrack = trackList[i];
      for (let j = 0; j < videoTrack.representations.length; j++) {
        console.log(
          "Its Representation number " + j + " has an height set to: " +
          videoTrack.representations[j].height
        );
      }
    }
    ```

  - [`getAvailableAudioTracks`](../../api/Track_Selection/getAvailableAudioTracks.md)
    for all available audio tracks linked to a Period, also through a
    `representations` property.
    ```js
    const trackList = rxPlayer.getAvailableAudioTracks();
    console.log(`There are currently ${trackList.length} audio track(s) available`);
    ```

  - The [`videoTrackChange`](../../api/Player_Events.md#videotrackchange),
    [`audioTrackChange`](../../api/Player_Events.md#audiotrackchange),
    [`availableVideoTracksChange`](../../api/Player_Events.md#availablevideotracks) and
    [`availableAudioTracksChange`](../../api/Player_Events.md#availableaudiotracks)
    player events which respectively emit data similar to the `getVideoTrack`,
    `getAudioTrack`, `getAvailableVideoTracks` and `getAvailableAudioTracks`
    methods.

### Global idea to replace the previous API

Thus the idea would be now to, for each set video track, to explicitly select
the Representation(s) you want, based on the criteria you want.

For example, to only play the video Representation(s) which have a bitrate set
to `500` for the current content, you could write:
```js
const currentVideoTrack = rxPlayer.getVideoTrack();
const representations500 = currentVideoTrack.representations.filter(r => {
  return r.bitrate === 500;
});
if (representations500.length > 0) {
  // Note: It's only the `id` property that is wanted here
  const representationsId = representations500.map(r => r.id);
  rxPlayer.lockVideoRepresentations(representationsId);
}
```

### Reacting to the lock "breaking"

In rare and very specific situations, locked Representation may all become
unplayable during playback.
This can for example happen when all the locked Representations appear to be
undecipherable once their licence have been fetched.

Instead of stopping on error when this happens, the RxPlayer choose to "break
the lock", which means it goes back to play all Representation from the chosen
track. Just before doing that, it emits the
[`"brokenRepresentationsLock"`](../../api/Player_Events.md#brokenrepresentationslock)
event, allowing you to react to this.

In the context of replacing bitrate API, you may want to profit from this event
to re-apply the bitrate limitation you had - or to stop the content if you want
to.

For example, only play the lowest video bitrate after the lock is broken, you
can write:
```js
player.addEventListener("brokenRepresentationsLock", (data) => {
  const videoTrack = rxPlayer.getVideoTrack(data.period.id);
  const lowestBitrate = videoTrack.representations.reduce((acc, r) => {
    if (acc === undefined || acc.bitrate === undefined) {
      return r;
    }
    if (r.bitrate !== undefined && r.bitrate < acc.bitrate) {
      return r;
    }
    return acc;
  }, undefined);
  if (lowestBitrate !== undefined) {
    rxPlayer.lockVideoRepresentations({
      representations: [lowestBitrate],
      periodId: data.period.id,
    });
  }
}
```


### Switching at new "Periods"

The "Period" notion allows for example to handle several Representation choices
on DASH contents with multiple `<Period>` elements, each with its own list of
tracks and thus, `Representation` linked to it.

For example you could consider an old film only available with video
Representations up to 720p followed by a football match with video
Representations ranging up to UHD. Here we would have two periods, each with its
own tracks and Representations.

To know the list of periods currently considered by the RxPlayer, you can now call
the [`getAvailablePeriods`](../../api/Basic_Methods/getAvailablePeriod.md)
RxPlayer method:
```js
const periods = rxPlayer.getAvailablePeriods();
```

To be notified when new Periods are being considered by the RxPlayer, you can
react to the new
[`newAvailablePeriods`](../../api/Player_Events.md#newavailableperiods) RxPlayer
event:
```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  // Do things with those periods
});
```

Most methods exposed in this page, whether they are for Representations locking
or the tracks API, allow to precize which Period you're talking about (if it's
not communicated, the RxPlayer will assume that you're talking about the
currently-playing one).

For example, to only lock the first video Representation of the first
considered Period you can do:
```js
const periods = rxPlayer.getAvailablePeriods();
if (periods.length > 0) {
  const firstPeriodVideoTrack = rxPlayer.getVideoTrack(periods[0].id);
  if (firstPeriodVideoTrack.representations.length > 0) {
    rxPlayer.lockVideoRepresentations({
      representations: [firstPeriodVideoTrack.representations[0].id],
      periodId: periods[0].id,
    });
  }
}
```

### Locking each time a track is chosen

The choice of Representation has to be performed basically at each new chosen
track, whether it is for a new Period or an already-known one whose track has
been changed.

The former (new periods) can be reacted to via the `"newAvailablePeriods"`
events we wrote about in previous chapters.

The latter (track change, for any Period) now also has its own event
[`"trackUpdate"`](../../api/Player_Events.md#trackupdate).

For example to only play the video Representations whose bitrate is inferior
or equal to `1000000`, you can write:
```js
player.addEventListener("trackUpdate", (data) => {
  const videoTrack = rxPlayer.getVideoTrack(data.period.id);
  const filtered = videoTrack.representations.filter((r) => {
    return r.bitrate !== undefined && r.bitrate <= 1000000;
  });
  if (filtered.length > 0) {
    rxPlayer.lockVideoRepresentations({
      representations: filtered,
      periodId: data.period.id,
    });
  } else {
    // To be defined on your side what you want to do here
  }
}
```


## Full examples of bitrate selection replacements

### `setMaxVideoBitrate` / `maxVideoBitrate` / `setMaxAudioBitrate` / `maxAudioBitrate`

_The following examples only talk about the video variants of these API to_
_simplify, but it can be applied to the audio variant._

To replace the `setMaxVideoBitrate` method or the `maxVideoBitrate` option, we
will first declare a function replicating its behavior for a given bitrate and
Period:
```js
function lockMaxBitrateForPeriod(maxBitrate, period) {
  if (maxBitrate === Infinity) {
    // /!\ If you also have other bitrate restrictions, you may not want to
    // unlock here
    rxPlayer.unlockVideoRepresentations(period.id);
  } else {
    const videoTrack = rxPlayer.getVideoTrack(period.id);
    const representationIds = videoTrack.representations.reduce(
      (acc, representation) => {
        if (
          representation.bitrate !== undefined &&
          representation.bitrate <= maxBitrate
        ) {
          acc.push(representation.id);
        }
        return acc;
      },
      [],
    );

    if (representationIds.length > 0) {
      rxPlayer.lockVideoRepresentations({
        periodId: period.id,
        representations: representationIds,
      });
    } else {
      // Special case for when no Representation respects the maximum bitrate:
      // Lock Representation(s) with the lowest bitrate
      const lowestBitrate = videoTrack.representations
        .map((representation) => representation.bitrate)
        .filter((representation) => representation !== undefined)
        .sort((a, b) => a - b)[0];
      if (lowestBitrate === undefined) {
        rxPlayer.unlockVideoRepresentations(period.id);
      } else {
        rxPlayer.lockVideoRepresentations({
          periodId: period.id,
          representations: videoTrack.representations.filter(
            (representation) => representation.bitrate <= lowestBitrate,
          ),
        });
      }
    }
  }
}
```

Then we want to apply it each times a new Period is available and each time the
track for any Period is changed:

```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (let i = 0; i < periods.length; i += 1) {
    lockMaxBitrateForPeriod(
      maxBitrate, // To set to the bitrate wanted
      periods[i],
    );
  }
});

rxPlayer.addEventListener("trackUpdate", (data) => {
  lockMaxBitrateForPeriod(
    maxBitrate, // To set to the bitrate wanted
    data.period,
  );
});
```

Because we might want to still re-apply the same logic when/if the lock is
broken, we can also add:
```js
rxPlayer.addEventListener("brokenRepresentationsLock", (data) => {
  lockMaxBitrateForPeriod(
    maxBitrate, // To set to the bitrate wanted
    data.period,
  );
});
```

And finally, if you want to apply the maximum bitrate while the content is
already playing, you can write:
```js
const periods = rxPlayer.getAvailablePeriods();
for (let i = 0; i < periods.length; i += 1) {
  const period = periods[i];
  lockMaxBitrateForPeriod(
    maxBitrate, // To set to the bitrate wanted
    period,
  );
}
```

### `setMinVideoBitrate` / `minVideoBitrate` / `setMinAudioBitrate` / `minAudioBitrate`

_The following examples only talk about the video variants of these API to_
_simplify, but it can be applied to the audio variant._

Replacing the `setMinVideoBitrate` method or the `minVideoBitrate` option
is very close than what has to be done to replace the `setMaxVideoBitrate`
method and / or the `maxVideoBitrate` option. Because of these we will only here
describe a `lockMinBitrateForPeriod` function, which is supposed to be the
`lockMaxBitrateForPeriod` function equivalent for minimum bitrates:
```js
function lockMinBitrateForPeriod(minBitrate, period) {
  if (minBitrate === 0) {
    // /!\ If you also have other bitrate restrictions, you may not want to
    // unlock here
    rxPlayer.unlockVideoRepresentations(period.id);
  } else {
    const videoTrack = rxPlayer.getVideoTrack(period.id);
    const representationIds = videoTrack.representations.reduce(
      (acc, representation) => {
        if (
          representation.bitrate !== undefined &&
          representation.bitrate >= minBitrate
        ) {
          acc.push(representation.id);
        }
        return acc;
      },
      [],
    );

    if (representationIds.length > 0) {
      rxPlayer.lockVideoRepresentations({
        periodId: period.id,
        representations: representationIds,
      });
    } else {
      // Special case for when no Representation respects the minimum bitrate:
      // Lock Representation(s) with the highest bitrate
      const highestBitrate = videoTrack.representations
        .map((representation) => representation.bitrate)
        .filter((representation) => representation !== undefined)
        .sort((a, b) => b - a)[0];
      if (highestBitrate === undefined) {
        rxPlayer.unlockVideoRepresentations(period.id);
      } else {
        rxPlayer.lockVideoRepresentations({
          periodId: period.id,
          representations: videoTrack.representations.filter(
            (representation) => representation.bitrate >= highestBitrate,
          ),
        });
      }
    }
  }
}
```

## `setAudioBitrate` / `setVideoBitrate`

_The following examples only talk about the video variants of these API to_
_simplify, but it can be applied to the audio variant._

Replacing the `setVideoBitrate` method is very close than what has to be done to
replace the `setMaxVideoBitrate` method or the `maxVideoBitrate` option.
Because of these we will only here describe a `lockBitrateForPeriod` function,
which is supposed to be the `lockMaxBitrateForPeriod` function equivalent for a
chosen bitrates:
```js
function lockBitrateForPeriod(bitrate, period) {
  if (bitrate === 0) {
    // /!\ If you also have other bitrate restrictions, you may not want to
    // unlock here
    rxPlayer.unlockVideoRepresentations(period.id);
  } else {
    const videoTrack = rxPlayer.getVideoTrack(period.id);
    const filteredReps = videoTrack.representations
      .filter((representation) => {
        return (
          representation.bitrate !== undefined &&
          representation.bitrate <= bitrate
        );
      });

    if (filteredReps.length > 0) {
      const highestBitrateId = filteredReps
        .sort((a, b) => b.bitrate - a.bitrate)[0];
      rxPlayer.lockVideoRepresentations({
        periodId: period.id,
        representations: [highestBitrateId],
      });
    } else {
      // Special case for when no Representation respects the given bitrate:
      // Lock Representation(s) with the lowest bitrate
      const lowestBitrate = videoTrack.representations
        .map((representation) => representation.bitrate)
        .filter((representation) => representation !== undefined)
        .sort((a, b) => a - b)[0];
      if (lowestBitrate === undefined) {
        rxPlayer.unlockVideoRepresentations(period.id);
      } else {
        rxPlayer.lockVideoRepresentations({
          periodId: period.id,
          representations: videoTrack.representations.filter(
            (representation) => representation.bitrate <= lowestBitrate,
          ),
        });
      }
    }
  }
}
```
