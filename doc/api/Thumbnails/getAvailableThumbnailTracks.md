# getAvailableThumbnailTracks

## Description

### Returned object

Returns the list of available thumbnail tracks for the current content, then to be able to
render one of them through the [`renderThumbnail` method](./renderThumbnail.md).

Each of the objects in the returned array have the following properties:

- `id` (`string`): The id used to identify the track. Use it for setting the track on
  `renderThumbnail`.

- `width` (`Number|undefined`): The width of each thumbnail, in pixels.

- `height` (`Number|undefined`): The height of each thumbnail, in pixels.

- `mimeType` (`string|undefined`): Mime-type identifying the format of images if known
  (e.g. `image/png`).

### Asking for a specific Period/time

By default `getAvailableThumbnailTracks` return the list of thumbnail tracks for the
Period that is currently being played, though that's not always what you want to do.

For example, thumbnails are often relied on as seeking previews, where a user might want
to seek anywhere in the content. On DASH multi-Period contents, there can be a different
thumbnail track per-Period, and as such you might want to know which thumbnail tracks are
available at different point in time.

For the frequent cases where you want to know the list of available thumbnail tracks for a
specific time, a `time` property or `periodId` property can be set.

```js
// example: getting the thumbnail track list for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAvailableThumbnailTracks({ periodId: periods[0].id });
```

## Syntax

```js
// Get list of available thumbnail tracks for the currently-playing Period
const thumbnailTracks = player.getAvailableThumbnailTracks();

// For a specific time in seconds:
const thumbnailTracks = player.getAvailableThumbnailTracks({
  time: 52,
});

// Get list of available thumbnail tracks for a specific Period
const thumbnailTracks = player.getAvailableThumbnailTracks({ periodId });
```

- **arguments**:

  1.  _arg_ `Object|undefined`: If not defined, the information associated to the
      currently-playing Period will be returned.

      If set to an Object, the following properties can be set (all optional):

      - `time` (`number|undefined`): The time for which the list of thumbnail tracks is
        wanted. If set, it is unnecessary to set the `periodId` property.

      - `periodId` (`string|undefined`): The `id` of the wanted Period. If set, it is
        unnecessary to set the `time` property.

- **return value** `Array.<Object>`
