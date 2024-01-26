# getCurrentModeInformation

## Description

Returns information on which "mode" the RxPlayer is running for the current
content (e.g. is the main logic running in a WebWorker or not, are we in
directfile mode...).

Returns `null` if no content is loaded or is on error.

When returning, a value, it is an object with the following properties:

- `isDirectFile` (`boolean`): If `true`, the currently-loaded content
  is loaded in directfile mode, meaning that the corresponding `loadVideo`
  call was made with the `"directfile"` `transport` option.

- `useWorker` (`boolean`): If `true`, the current content relies on
  multi-threading capabilities through a WebWorker.

#### Example

```js
const modeInfo = player.getCurrentModeInformation();
if (modeInfo === null) {
  console.info("No content loaded."); // Note that this may also happen when an
  // error prevented the content from loading.
} else {
  if (modeInfo.useWorker) {
    console.info("We're running the RxPlayer's main logic in a WebWorker!");
  } else {
    console.info("We're running completely in main thread.");
  }
  if (modeInfo.isDirectFile) {
    console.info("We're currently running the RxPlayer's in DirectFile mode!");
  } else {
    console.info("We're currently running the RxPlayer in regular, MediaSource, mode.");
  }
}
```

## Syntax

```js
const currentModeInfo = player.getCurrentModeInformation();
```

- **return value** `Object`
