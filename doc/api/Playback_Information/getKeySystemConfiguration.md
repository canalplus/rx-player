# getKeySystemConfiguration

## Description

Returns information on the key system configuration currently associated to the
HTMLMediaElement (e.g. `<video>` element) linked to the RxPlayer.

The returned value might be null if no key system configuration is attached or if it is
unknown, or, if a key system is attached and known, an object with the following
properties:

- `keySystem` (`string`): The actual key system string of the key system currently used.

  Note that it may be different than the key system name used as `type` property of the
  `keySystems` `loadVideo` option originally communicated.

  For example, calling the `loadVideo` like this:

  ```js
  rxPlayer.loadVideo({
    keySystems: [
      {
        type: "widevine",
        // ...
      },
    ],
    // ...
  });
  ```

  May lead to `keySystem` being set to `"com.widevine.alpha"` instead on most platforms
  where it is its proper denomination.

- `configuration` (`Object`): The
  [`MediaKeySystemConfiguration`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration)
  actually used currently by the key system.

  You may parse that configuration to deduce for example the current robustness levels of
  the key system.

## Syntax

```js
const values = player.getKeySystemConfiguration();
```

- **return value** `Object|null`
