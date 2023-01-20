# Removal of track preferences API

## Methods and options removed

All track preferences API have been removed in profit of a now more flexible
track switching API which should allow to perform the same logic and more.

This means that the following methods are all removed:
  - `setPreferredAudioTracks`
  - `setPreferredTextTracks`
  - `setPreferredVideoTracks`
  - `getPreferredAudioTracks`
  - `getPreferredTextTracks`
  - `getPreferredVideoTracks`

As well as the following constructor options:
  - `preferredAudioTracks`
  - `preferredTextTracks`
  - `preferredVideoTracks`


## Why was those removed?

Those methods and options have been removed because the new track switching API
now allows an application to handle the full preference functionalities with
even more customizability.

Keeping both the preferences API and the new enhanced track switching API could
have brought confusion in how they would interact, we have thus taken the choice
of removing the preferences API altogether.


## How to replace them

### The notion of a "Period"

The preferences API basically allowed to automatically set a default track each time a new
track choice was available.
Thus, the RxPlayer relied on them each time a new content was played, and more
generally each time a new `Period` was encountered.

This "Period" notion allows for example to handle several track choices on DASH
contents with multiple `<Period>` elements, each with its own list of tracks.
For example you could consider a multi-period live channel with a weather report
in a single audio language followed by a multi-lingual film, here we would have
two periods, each with its own selected track.

To know the list of periods currently considered by the RxPlayer, you can now call
the [`getAvailablePeriods`](../../api/Basic_Methods/getAvailablePeriods.md)
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

### Enhanced track methods

Moreover, to let an application change the track of any of those `Period`
elements linked to the current content, whether that Period already have been
played, are playing or will be played, the following track setting methods can
now receive the concerned period's `id` property as argument.

  - [`getAudioTrack`](../../api/Track_Selection/getAudioTrack.md):

    For example, to get the audio track currently set for some `period` Period,
    object returned by either `getAvailablePeriods` or the `newAvailablePeriods`
    event, you can do:
    ```js
    const audioTrackForPeriod = rxPlayer.getAudioTrack(period.id);
    ```

  - [`getTextTrack`](../../api/Track_Selection/getTextTrack.md):
    ```js
    const textTrackForPeriod = rxPlayer.getTextTrack(period.id);
    ```

  - [`getVideoTrack`](../../api/Track_Selection/getVideoTrack.md):
    ```js
    const videoTrackForPeriod = rxPlayer.getVideoTrack(period.id);
    ```

  - [`getAvailableAudioTracks`](../../api/Track_Selection/getAvailableAudioTracks.md):

    For example, to get the list of available audio tracks for a Period `period`:
    ```js
    const allAudioTracksForPeriod = rxPlayer.getAvailableAudioTracks(period.id);
    ```

  - [`getAvailableTextTracks`](../../api/Track_Selection/getAvailableTextTracks.md):
    ```js
    const allTextTracksForPeriod = rxPlayer.getAvailableTextTracks(period.id);
    ```

  - [`getAvailableVideoTracks`](../../api/Track_Selection/getAvailableVideoTracks.md):
    ```js
    const allVideoTracksForPeriod = rxPlayer.getAvailableVideoTracks(period.id);
    ```

  - [`setAudioTrack`](../../api/Track_Selection/setAudioTrack.md):

    For example, to set the audio track of some `period` element returned by
    either `getAvailablePeriods` or the `newAvailablePeriods` event, you can do:
    ```js
    rxPlayer.setAudioTrack({
      trackId: wantedAudioTrack.id,
      periodId: period.id,
    });
    ```

  - [`setTextTrack`](../../api/Track_Selection/setTextTrack.md):
    ```js
    rxPlayer.setTextTrack({
      trackId: wantedTextTrack.id,
      periodId: period.id,
    });
    ```

  - [`setVideoTrack`](../../api/Track_Selection/setVideoTrack.md):
    ```js
    rxPlayer.setVideoTrack({
      trackId: wantedVideoTrack.id,
      periodId: period.id,
    });
    ```

### Simple example

Thus, you can replicate most of the preferences API by simply manually listing
the current tracks on new Periods as they start being considered by the
RxPlayer, setting the more adapted one each time.

This can be done by reacting to the `newAvailablePeriods` event, like this:
```js
// Example: selecting the english audio track by default for all future contents

rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (const period of periods) {
    applyAudioTrackPreferences(period);
  }
});

/**
 * Choose regular (not audio description) english audio track if one, else
 * the default one.
 * @param {Object} period - Period Object as returned by the RxPlayer
 */
function applyAudioTrackPreferences(period) {
  // Getting the tracks available in that Period, through its id
  const audioTracks = rxPlayer.getAvailableAudioTracks(period.id);
  for (const audioTrack of audioTracks) {
    if (
      audioTrack.normalized === "eng" &&
      audioTrack.audioDescription !== true
    ) {
      // Setting the audio track for that Period
      rxPlayer.setAudioTrack({
        trackId: audioTrack.id,
        periodId: period.id,
      });
      return;
    }
  }
}
```

This logic will only apply for future encountered periods, even though you may
also want to apply the preference retroactively to the currently loaded Periods.
If that is the case, you can also get the list of currently-considered Periods
through the [`getAvailablePeriods`](../../api/Basic_Methods/getAvailablePeriods.md)
method and also select a track for those:
```js
  const currentPeriods = rxPlayer.getAvailablePeriods();
  for (const period of currentPeriods) {
    applyAudioTrackPreferences(period);
  }
```

If you want to be thorough, you may also want to re-apply preferences in the
extremely rare case where the chosen track would simply disappear for the
corresponding Period (for example after a Manifest refresh).
This almost never happens, but the RxPlayer now send
a [`trackUpdate`](../../api/Player_Events.md#trackupdate) event in that case
with a `reason` property set to `"missing"`.

Here is how you could handle this:
```js
rxPlayer.addEventListener("trackUpdate", (evt) => {
  if (evt.reason === "missing" && evt.trackType === "audio") {
    // The last chosen audio track just disappeared from the content.
    // Re-apply preferences
    applyAudioTrackPreferences(evt.period);
  }
});
```

## Full example for audio preferences replacement

As you've seen, applications now have all the elements to implement the same
audio track preferences API than before, though now all that preference logic
has to be written on the application-side.

Because we understand that just translating the preferences API to the newer
more explicit one might take some time, we've written in this chapter code
allowing to rely on the same preferences array as before while profiting from
the more powerful API.

Here's how a complete `applyAudioTrackPreferences` function, applying the audio
preferences array from the v3.x.x on a specific Period, would be implemented:
```js
/**
 * For the given Period (or the current one if `period` is not indicated),
 * apply the currently-preferred audio track according to the given
 * preferences.
 *
 * @param {Object|undefined} period - The Period object for the wanted Period.
 * If undefined, the current Period will be considered instead.
 * @param {Array.<Object>} preferencesArray - The audio preferences, in the
 * format of the RxPlayer v3 API
 */
function applyAudioTrackPreferences(period, preferencesArray) {
  const availableAudioTracks = rxPlayer.getAvailableAudioTracks(
    period?.id,
  );
  const optimalTrack = findFirstOptimalAudioTrack(
    availableAudioTracks,
    preferencesArray
  );
  if (optimalTrack === null) {
    console.warn(
      "It's not possible for now to disable the audio track. " +
      "Keeping the default one instead."
      );
  } else {
    rxPlayer.setAudioTrack({
      trackId: optimalTrack.id,
      periodId: period?.id,
    });
  }
}

/**
 * Find the optimal audio track given their list and the array of preferred
 * audio tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal audio track is no audio track.
 * @param {Array.<Object>} audioTracks - Available audio tracks
 * @param {Array.<Object>} preferredAudioTrack - The audio preferences, in the
 * format of the RxPlayer v3 API
 * @returns {Object|null}
 */
function findFirstOptimalAudioTrack(
  audioTracks,
  preferredAudioTracks
) {
  if (audioTracks.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredAudioTracks.length; i += 1) {
    const preferredAudioTrack = preferredAudioTracks[i];
    if (preferredAudioTrack === null) {
      return null;
    }

    const matchPreferredAudio =
      createAudioPreferenceMatcher(preferredAudioTrack);
    const foundTrack = audioTracks.find(matchPreferredAudio);

    if (foundTrack !== undefined) {
      return foundTrack;
    }
  }

  // no optimal track, just return the first one
  return audioTracks[0];
}

/**
 * Create a function allowing to compare an audio track with a given
 * `preferredAudioTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredAudioTrack - The audio track preference you want to
 * compare audio tracks to.
 * @returns {Function} - Function taking in argument an audio track and
 * returning `true` if it matches the `preferredAudioTrack` preference (and
 * `false` otherwise.
 */
function createAudioPreferenceMatcher(preferredAudioTrack) {
  /**
   * Compares an audio track to the given `preferredAudioTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} audioTrack
   * @returns {boolean}
   */
  return function matchAudioPreference(audioTrack) {
    if (preferredAudioTrack.language !== undefined) {
      const language = audioTrack.language ?? '';
      if (language !== preferredAudioTrack.language) {
        return false;
      }
    }
    if (preferredAudioTrack.audioDescription !== undefined) {
      if (preferredAudioTrack.audioDescription) {
        if (audioTrack.audioDescription !== true) {
          return false;
        }
      } else if (audioTrack.audioDescription === true) {
        return false;
      }
    }
    if (preferredAudioTrack.codec === undefined) {
      return true;
    }
    const regxp = preferredAudioTrack.codec.test;
    const codecTestingFn = (rep) =>
      rep.codec !== undefined && regxp.test(rep.codec);

    if (preferredAudioTrack.codec.all) {
      return audioTrack.representations.every(codecTestingFn);
    }
    return audioTrack.representations.some(codecTestingFn);
  };
}
```

Like seen in the `How to replace then` chapter, you can trigger that logic for
all futures track choices by listening to `newAvailablePeriods` and to
`trackUpdate` events:
```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  // Apply preferences each time a new Period is available
  for (const period of periods) {
    applyAudioTrackPreferences(period);
  }
});

rxPlayer.addEventListener("trackUpdate", (evt) => {
  if (evt.reason === "missing" && evt.trackType === "audio") {
    // The last chosen audio track just disappeared from the content.
    // Re-apply preferences
    applyAudioTrackPreferences(evt.period);
  }
});
```

And if you also want to apply it to the Periods currently considered by the
RxPlayer:
```js
  const currentPeriods = rxPlayer.getAvailablePeriods();
  for (const period of currentPeriods) {
    applyAudioTrackPreferences(period);
  }
```

## Full example for text preferences replacement

Likewise, here's how a complete `applyTextTrackPreferences` function, applying
the text preferences array from the v3.x.x on a specific Period, would be
implemented:

```js
/**
 * For the given Period (or the current one if `period` is not indicated),
 * apply the currently-preferred text track according to the given
 * preferences.
 *
 * @param {Object|undefined} period - The Period object for the wanted Period.
 * If undefined, the current Period will be considered instead.
 * @param {Array.<Object>} preferencesArray - The audio preferences, in the
 * format of the RxPlayer v3 API
 */
function applyTextTrackPreferences(period, preferencesArray) {
  const availableTextTracks = rxPlayer.getAvailableTextTracks(
    period?.id,
  );
  const optimalTrack = findFirstOptimalTextTrack(
    availableTextTracks,
    preferencesArray
  );
  if (optimalTrack === null) {
    rxPlayer.disableTextTrack(period?.id);
  } else {
    rxPlayer.setTextTrack({
      trackId: optimalTrack.id,
      periodId: period?.id,
    });
  }
}

/**
 * Find an optimal text adaptation given their list and the array of preferred
 * text tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal text adaptation is no text adaptation.
 * @param {Array.<Object>} textTracks
 * @param {Array.<Object|null>} preferredTextTracks
 * @returns {Object|null}
 */
function findFirstOptimalTextTrack(
  textTracks,
  preferredTextTracks
) {
  if (textTracks.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredTextTracks.length; i += 1) {
    const preferredTextTrack = preferredTextTracks[i];

    if (preferredTextTrack === null) {
      return null;
    }

    const matchPreferredText = createTextPreferenceMatcher(preferredTextTrack);
    const foundTrack = textTracks.find(matchPreferredText);

    if (foundTrack !== undefined) {
      return foundTrack;
    }
  }

  // no optimal adaptation
  return null;
}

/**
 * Create a function allowing to compare text tracks with a given
 * `preferredTextTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredTextTrack - The text track preference you want to
 * compare text tracks to.
 * @returns {Function} - Function taking in argument a text track and
 * returning `true` if it matches the `preferredTextTrack` preference (and
 * `false` otherwise.
 */
function createTextPreferenceMatcher(preferredTextTrack) {
  /**
   * Compares a text track to the given `preferredTextTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} textTrack
   * @returns {boolean}
   */
  return function matchTextPreference(textTrack) {
    return (
      textTrack.language === preferredTextTrack.language &&
      (preferredTextTrack.closedCaption
        ? textTrack.closedCaption === true
        : textTrack.closedCaption !== true) &&
      (preferredTextTrack.forced
        ? textTrack.forced === true
        : textTrack.forced !== true)
    );
  };
}
```

Like seen in the `How to replace then` chapter, you can trigger that logic for
all futures track choices by listening to `newAvailablePeriods` and to
`trackUpdate` events:
```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  // Apply preferences each time a new Period is available
  for (const period of periods) {
    applyTextTrackPreferences(period);
  }
});

rxPlayer.addEventListener("trackUpdate", (evt) => {
  if (evt.reason === "missing" && evt.trackType === "audio") {
    // The last chosen audio track just disappeared from the content.
    // Re-apply preferences
    applyTextTrackPreferences(evt.period);
  }
});
```

And if you also want to apply it to the Periods currently considered by the RxPlayer:
```js
  const currentPeriods = rxPlayer.getAvailablePeriods();
  for (const period of currentPeriods) {
    applyTextTrackPreferences(period);
  }
```

## Full example for video preferences replacement

As for video tracks, an `applyVideoTrackPreferences` function, applying the
video preferences array from the v3.x.x on a specific Period, could be
implemented this way:
```js
/**
 * For the given Period (or the current one if `period` is not indicated),
 * apply the currently-preferred video track according to the given
 * preferences.
 *
 * @param {Object|undefined} period - The Period object for the wanted Period.
 * If undefined, the current Period will be considered instead.
 * @param {Array.<Object>} preferencesArray - The video preferences, in the
 * format of the RxPlayer v3 API
 */
function applyVideoTrackPreferences(period, preferencesArray) {
  const availableVideoTracks = rxPlayer.getAvailableVideoTracks(
    period?.id,
  );
  const optimalTrack = findFirstOptimalVideoTrack(
    availableVideoTracks,
    preferencesArray
  );
  if (optimalTrack === null) {
    rxPlayer.disableVideoTrack(period?.id);
  } else {
    rxPlayer.setVideoTrack({
      trackId: optimalTrack.id,
      periodId: period?.id,
    });
  }
}

/**
 * Find the optimal video track given their list and the array of preferred
 * video tracks sorted from the most preferred to the least preferred.
 *
 * `null` if the most optimal video track is no video track.
 * @param {Array.<Object>} videoTracks - Available video tracks
 * @param {Array.<Object>} preferredVideoTrack - The video preferences, in the
 * format of the RxPlayer v3 API
 * @returns {Object|null}
 */
function findFirstOptimalVideoTrack(
  videoTracks,
  preferredVideoTracks
) {
  if (videoTracks.length === 0) {
    return null;
  }

  for (let i = 0; i < preferredVideoTracks.length; i += 1) {
    const preferredVideoTrack = preferredVideoTracks[i];
    if (preferredVideoTrack === null) {
      return null;
    }

    const matchPreferredVideo =
      createVideoPreferenceMatcher(preferredVideoTrack);
    const foundTrack = videoTracks.find(matchPreferredVideo);

    if (foundTrack !== undefined) {
      return foundTrack;
    }
  }

  // no optimal track, just return the first one
  return videoTracks[0];
}

/**
 * Create a function allowing to compare an video track with a given
 * `preferredVideoTrack` preference to see if they match.
 *
 * This function is curried to be easily and optimally used in a loop context.
 *
 * @param {Object} preferredVideoTrack - The video track preference you want to
 * compare video tracks to.
 * @returns {Function} - Function taking in argument an video track and
 * returning `true` if it matches the `preferredVideoTrack` preference (and
 * `false` otherwise.
 */
function createVideoPreferenceMatcher(preferredVideoTrack) {
  /**
   * Compares a video track to the given `preferredVideoTrack` preference.
   * Returns `true` if it matches, false otherwise.
   * @param {Object} videoTrack
   * @returns {boolean}
   */
  return function matchVideoPreference(videoTrack) {
    if (preferredVideoTrack.signInterpreted !== undefined &&
        preferredVideoTrack.signInterpreted !== videoTrack.isSignInterpreted)
    {
      return false;
    }
    if (preferredVideoTrack.codec === undefined) {
      return true;
    }
    const regxp = preferredVideoTrack.codec.test;
    const codecTestingFn = (rep) =>
      rep.codec !== undefined && regxp.test(rep.codec);

    if (preferredVideoTrack.codec.all) {
      return videoTrack.representations.every(codecTestingFn);
    }
    return videoTrack.representations.some(codecTestingFn);
  };
}
```

Like seen in the `How to replace then` chapter, you can trigger that logic for
all futures track choices by listening to `newAvailablePeriods` and to
`trackUpdate` events:
```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  // Apply preferences each time a new Period is available
  for (const period of periods) {
    applyVideoTrackPreferences(period);
  }
});

rxPlayer.addEventListener("trackUpdate", (evt) => {
  if (evt.reason === "missing" && evt.trackType === "video") {
    // The last chosen video track just disappeared from the content.
    // Re-apply preferences
    applyVideoTrackPreferences(evt.period);
  }
});
```

And if you also want to apply it to the Periods currently considered by the RxPlayer:
```js
  const currentPeriods = rxPlayer.getAvailablePeriods();
  for (const period of currentPeriods) {
    applyVideoTrackPreferences(period);
  }
```
