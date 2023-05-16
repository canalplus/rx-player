# Migration guide: from v3.x.x to v4.0.0

## Overview

The `v4.0.0` release is a major RxPlayer release.

It deeply changes some aspects of the RxPlayer API, particularly relative to
tracks and quality selection.

Though we succeeded to maintain API compatibility for more than 5 years despite
huge changes in the OTT media streaming domain, we considered that an API
overhaul was now necessary to better handle the features of the current
streaming landscape (normalization of multi-Period contents, multiplication of
potential video, audio and text characteristics, low-latency streaming, Content
Steering, MSE-in-worker etc.) as well as to improve the RxPlayer maintainance by
removing old deprecated but burdensome API.

Still, we understand that porting to a new major version of the RxPlayer might
not be a small task, and thus decided to continue maintaining the v3.x.x for
some time, while pre-releasing the beta version of the `v4.0.0` with this
complete migration guide.


## Organization of this documentation

The goal of this documentation is not to advertise about new RxPlayer features,
it is only to list all breaking changes and indicate how to replace the
corresponding options, methods and events.

If you want to know what was brought into a `v4.x.x` release instead, you can
obtain more information by looking at release notes, the changelog, [the API
documentation](../../api/Overview.md) and tutorials.


## Important changes

### New player state: `"FREEZING"`

#### The `"FREEZING"` state

A new player state, `"FREEZING"`, has been added.

This state is switched to when playback is not advancing despite not being
paused and despite the player having some buffered media data to play.
Generally a brief and transitory state, there may even be valid and un-worrying
reasons behind this state: for example it may be caused by some minor
performance issue after heavy operations like seeking, or triggered when the
player is waiting for the license to be loaded.

Though a `"FREEZING"` state may also be linked to a real content or device issue.
The RxPlayer will use tricks to try to come out of a `"FREEZING"` state if it
locks playback for too long,  but if it happens often and/or for long periods of
time, it might be a sign that there some other issues to look for either on the
content, on the environment (device, browser, hardware etc.) or both.

Previously such `"FREEZING"` state was either reported as a `"BUFFERING"` state
or not reported at all (i.e. we would for example be in a `"PLAYING"` state)
depending on the case. As such this new state does not correspond to any new
behavior, it just gives more precision about something that was previously not
specifically described.

#### How to handle it

Player states in general are still communicated through the [`playerStateChange`
event](../../api/Player_Events.md#playerstatechange) and
[`getPlayerState`](../../api/Basic_Methods/getPlayerState.md) methods, which you
may now want to update to handle the new `"FREEZING"` case.

For most cases, showing a waiting indicator on top of the video like a spinner,
like you probably already do for the `"BUFFERING"` case, should be sufficient.

```js
rxPlayer.addEventListener("playerStateChange", (state) => {
  switch (state) {
    case "BUFFERING":
    case "FREEZING":
      displaySpinner();
      break;
    // ...
  }
});
```

Some applications might however prefer to report differently such `"FREEZING"`
cases, for example to detect playback issues on some devices.

### RxPlayer behavior when reaching the content's end

The RxPlayer previously automatically stopped the content when its end was
reached unless the (now removed) `stopAtEnd` constructor option was set to
`false`.

As a saner default, the RxPlayer now won't stop the content when reaching its
end anymore, if you want to reproduce this behavior, you can simply stop the
content when the `"ENDED"` player state is reached:
```js
rxPlayer.addEventListener("playerStateChange", (state) => {
  if (state === "ENDED") {
    rxPlayer.stop();
  }
});
```

### The `"RELOADING"` state now has to be handled

Brought in the `v3.6.0` (2018), the `"RELOADING"` player state was switched to
when the RxPlayer needed to reset buffers in specific situations. Because just
adding a player state is a breaking change, we were careful to only allow it
when specific options were set.

The RxPlayer may now switch to the `"RELOADING"` state in any situation where it
could fix playback issues, allowing us to more effectively work-around specific
bugs.

This means that you now have to make sure that state is considered. You can see
more information on the `"RELOADING"` state [in the player state
page](../../api/Player_States.md#the_reloading_state).
Thankfully, it is now possible to perform more operations under that state, such
as switching tracks and qualities.


### Removal of track preferences API

All methods related to track preferences:
  - `setPreferredAudioTracks`
  - `setPreferredTextTracks`
  - `setPreferedVideoTracks`
  - `getPreferredAudioTracks`
  - `getPreferredTextTracks`
  - `getPreferredVideoTracks`

As well as the following constructor options:
  - `preferredAudioTracks`
  - `preferredTextTracks`
  - `preferredVideoTracks`

Have been removed because their behaviors and more can be replaced by the new
track API.

For more information on how to replace them, you can go to the [preferences
pages of the migration guide](./Preferences.md).

### Removal of bitrate control API

All methods related to controlling the current audio and video bitrate:
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

Have been removed.

To replace them, we created the much more powerful "Representations locking"
family of methods and options. Documentation on how to do the switch from the
old API to the new is documented in the [Bitrate Selection page of the migration
guide](./Bitrate_Selection.md)


## Other modifications

### Constructor options

Constructor options are options given when instantiating a new RxPlayer.

Several of these options have been removed, they are all listed in the
[Constructor Options page](./Constructor_Options.md).


### `loadVideo` options

Several options of the central `loadVideo` method have been updated and removed.

They are all listed in the [`loadVideo` Options page](./loadVideo_Options.md).


### Player events

All updated and removed events are listed in the [Player Events
page](./Player_Events.md).


### Player Errors

All updated and removed player errors and warnings are listed in the [Player
Error page](./Player_Errors.md).

### Methods

Several RxPlayer methods were removed, replaced or had their arguments changed.
This is all documented in the [Player Methods page](./Player_Methods.md).

### Types

Several RxPlayer types have been removed and updated.
This is all documented in the [Player Types page](./Player_Types.md).

### Miscellaneous

Other minor changes on which you might have relied are present in the v4.x.x:

  - From now, you should not expect Internet Explorer 11 to keep being supported
  as we won't be testing this browser nor officially providing support for it
  anymore.

    You may however be able contribute if its support is important to you, as
    long as those modifications have a low influence on the code's health.

  - It is not possible anymore to use environment variables (like `RXP_DASH`) to
  bundle a personalized build yourself. If you want to have a personalized
  build, you now have to rely on the [mininal RxPlayer](../Minimal_Player.md).

  - "Forced" text tracks are now not switched according to audio track
  preferences because the preference API has been removed.

    Instead, the forced text track linked to the default audio track is by
    default chosen and an application can change it at any time.
