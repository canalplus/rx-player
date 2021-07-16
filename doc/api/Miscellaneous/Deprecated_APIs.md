# Deprecated APIs

This documentation lists APIs deprecated in the v3.x.x.

As we guarantee API compatibility in the v3.x.x, those API won't disappear until
we switch to a v4.x.x version.

You will find here which APIs are deprecated, why, and depending on the
concerned API, how to replace it.


## RxPlayer Methods

The following RxPlayer methods are deprecated.


### getCurrentKeySystem

`getCurrentKeySystem` has been deprecated in profit of the similar
[`getKeySystemConfiguration`](../Content_Information/getKeySystemConfiguration.md)
method.

Note however that the key system string optionally returned as a `keySystem`
property from the latter is slightly different than the optional string returned
from the former:

  - `getCurrentKeySystem` returned the same keysystem name used as `type`
    property of the `keySystems` `loadVideo` option originally communicated.

    For example, calling the `loadVideo` like this:
    ```js
    rxPlayer.loadVideo({
      keySystems: [{
        type: "widevine",
        // ...
      }],
      // ...
    });
    ```
    May lead to `getCurrentKeySystem` returning just `"widevine"`.

  - The `keySystem` property from `getKeySystemConfiguration` returns the actual
    key system string used, alongside the actual configuration used in its
    `configuration` key.

    For example, calling the `loadVideo` like this:
    ```js
    rxPlayer.loadVideo({
      keySystems: [{
        type: "widevine",
        // ...
      }],
      // ...
    });
    ```
    May lead to a more complex `keySystem` property being reported, like for
    example, `"com.widevine.alpha"`.


### getVideoLoadedTime

The `getVideoLoadedTime` method has been deprecated and won't be replaced in the
next major version because it was poorly named, poorly understood, and it is
easy to replace.

#### How to replace that method

To replace it, you can write:
```js
function getVideoLoadedTime() {
  const position = rxPlayer.getPosition();
  const mediaElement = rxPlayer.getVideoElement();
  if (mediaElement === null) {
    console.error("The RxPlayer is disposed");
  } else {
    const range = getRange(mediaElement.buffered, currentTime);
    return range !== null ? range.end - range.start :
                            0;
  }
}

/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
function getRange(timeRanges, time) {
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    if (time >= start) {
      const end = timeRanges.end(i);
      if (time < end) {
        return { start, end };
      }
    }
  }
  return null;
}
```

### getVideoPlayedTime

The `getVideoPlayedTime` method has been deprecated and won't be replaced in the
next major version because it was poorly named, poorly understood, and it is
easy to replace.

#### How to replace that method

To replace it, you can write:
```js
function getVideoPlayedTime() {
  const position = rxPlayer.getPosition();
  const mediaElement = rxPlayer.getVideoElement();
  if (mediaElement === null) {
    console.error("The RxPlayer is disposed");
  } else {
    const range = getRange(mediaElement.buffered, currentTime);
    return range !== null ? currentTime - range.start :
  }
}

/**
 * Get range object of a specific time in a TimeRanges object.
 * @param {TimeRanges} timeRanges
 * @returns {Object}
 */
function getRange(timeRanges, time) {
  for (let i = timeRanges.length - 1; i >= 0; i--) {
    const start = timeRanges.start(i);
    if (time >= start) {
      const end = timeRanges.end(i);
      if (time < end) {
        return { start, end };
      }
    }
  }
  return null;
}
```


## loadVideo options

The following loadVideo options are deprecated.


## transportOptions.aggressiveMode

The `aggressiveMode` boolean from the `transportOptions` option will be removed
from the next major version.

It has no planned replacement. Please open an issue if you need it.


### keySystems[].throwOnLicenseExpiration

The `throwOnLicenseExpiration` property of the `keySystems` option has been
replaced by the more powerful `onKeyExpiration` property.

#### How to replace that option

If you set `throwOnLicenseExpiration` to `false` before, you can simply set
`onKeyExpiration` to `"continue"` instead, which reproduce the exact same
behavior:
```ts
// old way
rxPlayer.loadVideo({
  // ...
  keySystems: [
    {
      throwOnLicenseExpiration: false,
      // ...
    }
  ],
});

// new way
rxPlayer.loadVideo({
  // ...
  keySystems: [
    {
      onKeyExpiration: "continue",
      // ...
    }
  ],
});
```

You can have more information on the `onKeyExpiration` option [in the
correspnding API documentation](../Decryption_Options.md#onkeyexpiration).

If you previously set `throwOnLicenseExpiration` to `true` or `undefined`, you
can just remove this property as this still the default behavior.


### keySystems[].onKeyStatusesChange

The `onKeyStatusesChange` callback from the `keySystems` option will be removed
from the next major version.

It has no planned replacement. Please open an issue if you need it.


## Other properties

Some very specific properties from various methods are deprecated.
You will find them here.

### Smooth

Setting a `*.wsx`, a `*.ism` or a `*.isml` URL as an `url` property in
`loadVideo` is now deprecated when we're talking about a Smooth Streaming
content.

We recommend to only set a Manifest URL in that property when the transport is
equal to `smooth`.
