# `loadVideo` Options

Multiple options of the `loadVideo` have been changed or removed.
They will all be listed in this page.


## Removed options

### `manualBitrateSwitchingMode`

The `manualBitrateSwitchingMode` option has been removed.

It is now possible to indicate the wanted switching mode directly on the
[`lockVideoRepresentations` or
`lockAudioRepresentations`](../../api/Representation_Selection/lockAudioVideoRepresentations.md)
call through its `switchingMode` property instead.


### `defaultAudioTrack` / `defaultTextTrack`

The deprecated default tracks options have now been removed.
Those can be replaced by the now more powerful track API, documented in the
[Track Preferences page](./Preferences.md) of the migration documentation.


### `hideNativeSubtitles`

The deprecated `hideNativeSubtitles` option has been removed without
replacement.

It had been added a long time ago, for knownj use cases that were since
completely replaced by using the `"html"` `textTrackMode`.

If you still need that option for a valid use case, you are welcomed to open an
issue.


### `transportOptions.aggressiveMode`

The `aggressiveMode` option has been removed without replacement.

It was previously mostly used as a work-around to optimize the time at which new
segments were requested, but was always too risky and experimental for our
taste.

### `transportOptions.supplementaryTextTracks`

The deprecated `supplementaryTextTracks` option has been completely removed in
profit of using the more flexiple [`TextTrackRenderer`](../../api/Tools/TextTrackRenderer.md)
tool.


### `transportOptions.supplementaryImageTracks`

The deprecated `supplementaryImageTracks` option has been completely removed.

If you want to display image thumbnails, you now have to load and display them
in your application.

You can still use the [`parseBifThumbnails`](../../api/Tools/parseBifThumbnails.md)
tool to parse thumbnails in the "BIF" format.


### `keySystems[].persistentLicense`

The `persistentLicense` option has now been removed because it is, and already
was,unnecessary.

The simple presence of the `keySystems[].persistentLicenseConfig` option - which
is the renaming of the old `keySystems[].licenseStorage` option (see below) - now
suffice by itself to indicate that you want to use persistent license.

The `persistentLicense` property can thus be safely removed.


### `keySystems[].onKeyStatusesChange`

The `onKeyStatusesChange` callback has been removed with no replacement as no
known usage was done of this callback.
If you want it back, please open an issue.


### `keySystems[].throwOnLicenseExpiration`

The deprecated `throwOnLicenseExpiration` option has been removed because it can
be fully replaced by the [`keySystems[].onKeyExpiration`
option](../../api/Decryption_Options.md#onkeyexpiration) option.


## Renamed and updated options

### `url`

A very minor update to the `url` option of `loadVideo` is that it is now
required to set it directly to the url of the Manifest for contents of the
`"smooth"` `transport`.

An undocumented feature of that option was that, for legacy reasons,
it was previously possible to set it to a JSON or XML document that would
contain the Manifest URL.

You're most probably not impacted by this change as as far as we know, the
feature was only used internally at Canal+ and was not documented.


### `networkConfig`

The `networkConfig` `loadVideo` option has been entirely renamed, both the
option itself, renamed to [`requestConfig`](../../api/Loading_a_Content.md#requestconfig),
and its inner properties.

Moreover, the `offlineRetry` option has been removed because it was too
unreliable for real offline detection. If you miss this feature and wish for a
replacement, please open an issue!

Basically what was written previously as:
```js
rxPlayer.loadVideo({
  networkConfig: {
    segmentRetry: 2,
    segmentRequestTimeout: 15000,
    manifestRetry: 3,
    manifestRequestTimeout : 7000,
  },
  // ...
});
```
Can now be written as:
```js
rxPlayer.loadVideo({
  requestConfig: {
    segment: {
      maxRetry: 2,
      timeout: 15000,
    },
    manifest: {
      maxRetry: 3,
      timeout: 7000,
    },
  },
  // ...
});
```


### `audioTrackSwitchingMode`

The `audioTrackSwitchingMode` option can now be indicated directly on the
corresponding [`setAudioTrack`](../../api/Track_Selection/setAudioTrack.md) call
through its `switchingMode` property.

However it is still possible to declare a default value when switching an audio
track through the new
[`defaultAudioTrackSwitchingMode`](../../api/Loading_a_Content.md#defaultaudiotrackswitchingmode)
`loadVideo` option.

This means that:
```js
rxPlayer.loadVideo({
  audioTrackSwitchingMode: "reload",
  // ...
});
```
Can be replaced by:
```js
rxPlayer.loadVideo({
  defaultAudioTrackSwitchingMode: "reload",
  // ...
});
```

### `keySystems[].licenseStorage`

The `licenseStorage` option has been renamed to
[`persistentLicenseConfig`](../../api/Decryption_Options.md#persistentlicenseconfig).

This means that what was previously:
```js
rxPlayer.loadVideo({
  keySystems: [{
    licenseStorage: {
      save(data) {
        localStorage.setItem("RxPlayer-persistent-storage", JSON.stringify(data));
      },
      load() {
        const item = localStorage.getItem("RxPlayer-persistent-storage");
        return item === null ? [] : JSON.parse(item);
      },
    },
    // ...
  }],
  // ...
});
```

Now becomes:
```js
rxPlayer.loadVideo({
  keySystems: [{
    persistentLicenseConfig: {
      save(data) {
        localStorage.setItem("RxPlayer-persistent-storage", JSON.stringify(data));
      },
      load() {
        const item = localStorage.getItem("RxPlayer-persistent-storage");
        return item === null ? [] : JSON.parse(item);
      },
    },
    // ...
  }],
  // ...
});
```

### `keySystems[].persistentStateRequired`

The `persistentStateRequired` boolean property of the `keySystems` option has
been updated to a [`persistentState`](../../api/Decryption_Options.md#persistentstate)
property accepting instead the [`MediaKeysRequirement`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysrequirement)
the RxPlayer should set the [`persistentState` property of the wanted
`MediaKeySystemConfiguration`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-persistentstate).

This means that what was previously written as:
```js
rxPlayer.loadVideo({
  keySystems: [{
    persistentStateRequired: true,
    // ...
  }],
  // ...
});
```

Now becomes:
```js
rxPlayer.loadVideo({
  keySystems: [{
    persistentState: "required",
    // ...
  }],
  // ...
});
```


### `keySystems[].distinctiveIdentifierRequired`

The `distinctiveIdentifierRequired` boolean property of the `keySystems` option
has been updated to a [`distinctiveIdentifier`](../../api/Decryption_Options.md#distinctiveidentifier)
property accepting instead the [`MediaKeysRequirement`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysrequirement)
the RxPlayer should set the [`distinctiveIdentifier` property of the wanted
`MediaKeySystemConfiguration`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-distinctiveidentifier).

This means that what was previously written as:
```js
rxPlayer.loadVideo({
  keySystems: [{
    distinctiveIdentifierRequired: true,
    // ...
  }],
  // ...
});
```

Now becomes:
```js
rxPlayer.loadVideo({
  keySystems: [{
    distinctiveIdentifier: "required",
    // ...
  }],
  // ...
});
```


### `keySystems[].audioRobustnesses` / `keySystems[].videoRobustnesses`

Both undocumented, the `audioRobustnesses` and `videoRobustnesses` properties of
the `keySystems` `loadVideo` options allowed to configure the wanted robustnes
levels of encrypted content.

They have now been replaced by the much more powerful
[`audioCapabilitiesConfig`](../../api/Decryption_Options.md#audiocapabilitiesconfig)
and [`videoCapabilitiesConfig`](../../api/Decryption_Options.md#videocapabilitiesconfig)
respectively.

What was previously written:
```js
rxPlayer.loadVideo({
  keySystems: [{
    audioRobustnesses: ["2000"],
    videoRobustnesses: ["3000", "2000"],
    // ...
  }],
  // ...
});
```

Can now be written as:
```js
rxPlayer.loadVideo({
  keySystems: [{
    audioCapabilitiesConfig: {
      type: "robustness",
      value: ["2000"],
    },
    videoCapabilitiesConfig: {
      type: "robustness",
      value: ["3000", "2000"],
    },
    // ...
  }],
  // ...
});
```


### `transportOptions`

The `transportOptions` option of `loadVideo` has been removed. Instead, you
should now put what it contained directly on the `loadVideo` call.

For example:
```js
rxPlayer.loadVideo({
  transportOptions: {
    segmentLoader: (args, callbacks) => {
      // ...
    },
    minimumManifestUpdateInterval: 5000,
  },
  // ...
});
```
Should now become:
```js
rxPlayer.loadVideo({
  segmentLoader: (args, callbacks) => {
    // ...
  },
  minimumManifestUpdateInterval: 5000,
  // ...
});
```

Note however that multiple properties previously found inside the
`transportOptions` option has now been removed and updated (they are all
documented here).

The removed options are:
  - `aggressiveMode`
  - `supplementaryTextTracks`
  - `supplementaryImageTracks`

Updated options are:
  - `manifestLoader`
  - `segmentLoader`

Change will be documented below.

### `transportOptions.manifestLoader`

  - Custom `manifestLoader` function added to what was previously the `loadVideo`'s `transportOptions` option now set an object as argument (with an `url`property), to let us bring improvements on it in the future [#995]

XXX TODO

### `transportOptions.segmentLoader`

transportOptions.segmentLoader loadVideo options don't give the full Manifest, Period, Adaptation, Representation and ISegment structures in arguments but a small subset of it.

XXX TODO

  - A Representation's `frameRate` is now always a number - in terms of frame per seconds - instead of a string.
  - `Representations` (in methods: `getAvailableVideoTracks`, `getVideoTrack`, `representationFilter`, `getAvailableAudioTracks`, `getAudioTrack` and events: `audioTrackChange` and `videoTrackChange`) can have an `undefined` bitrate


### `transportOptions.representationFilter`

XXX TODO

  - A Representation's `frameRate` is now always a number - in terms of frame per seconds - instead of a string.
  - `Representations` (in methods: `getAvailableVideoTracks`, `getVideoTrack`, `representationFilter`, `getAvailableAudioTracks`, `getAudioTrack` and events: `audioTrackChange` and `videoTrackChange`) can have an `undefined` bitrate
