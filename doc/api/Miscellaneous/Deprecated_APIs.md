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


## loadVideo options

The following loadVideo options are deprecated.

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
correspnding API documentation](./Decryption_Options.md#onkeyexpiration).

If you previously set `throwOnLicenseExpiration` to `true` or `undefined`, you
can just remove this property as this still the default behavior.


## RxPlayer constructor options

The following RxPlayer constructor options are deprecated.

### throttleWhenHidden

`throttleWhenHidden`has been deprecated as video visibility relies only on
page visibility API and document hiddenness.

A video should be visible if the Picture-In-Picture mode is activated, even
if the `hidden` attribute of `document` is set to `true`.

`throttleVideoBitrateWhenHidden` relies on both and can be used like this :

```js
const rxPlayer = new RxPlayer({
  // ... RxPlayer options
  // throttleWhenHidden: true [deprecated]
  throttleVideoBitrateWhenHidden: true,
});
```

## Other properties

Some very specific properties from various methods are deprecated.
You will find them here.

### Smooth

Setting a `*.wsx`, a `*.ism` or a `*.isml` URL as an `url` property in
`loadVideo` is now deprecated when we're talking about a Smooth Streaming
content.

We recommend to only set a Manifest URL in that property when the transport is
equal to `smooth`.
