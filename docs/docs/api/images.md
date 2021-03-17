---
id: images
title: Images
sidebar_label: Images
slug: images
---

## Overview

The RxPlayer defines its own image playlist format, the `bif` format.

This format allows to transmit playlist of thumbnails for linear (live) and
non-linear (VOD) contents. The usecase is mostly to allow an improved "seeking"
experience.

It is understood and parsed by the player, which offers API to easily integrate
those features in an application.

## Format specification

This documentation is not yet finished. It will be very soon.

## Using bif for DASH and smooth contents

This documentation is not yet finished. It will be very soon.

## APIs

Images can be retreived through two APIs for now:

- `getImageTrackData`, which returns directly an array of objects describing
  the images in the playlist.

- the `imageTrackUpdate` event, which emits each time the image playlist is
  updated with the complete playlist as an array of objects in its `data`
  property.

### Structure

In both of those cases you receive an array of Objects, each defining a single
image.

An image object has the following property:

- `data` (`Uint8Array`): the raw data for the image object. You can
  display the corresponding image on your page thanks to the browser
  `window.URL.createObjectURL` API.

- `ts` (`Number`): the position (relatively to the player's
  `getPosition` API) the image should be displayed at, in milliseconds.

- `duration` (`Number`): the duration, in s, until a new image can be
  considered.

This array should be ordered by `position`.

### Example

Here is an example of setting the image corresponding to the current position,
considering a player instance `player` and an image element with the id
`current-image`:

```js
const position = player.getPosition();
const imagePlaylist = player.getImageTrackData();

const currentImage = imagePlaylist.find((p) => p.ts / 1000 > position);

if (currentImage) {
  const blob = new Blob([currentImage], { type: "image/jpeg" });
  const url = URL.createObjectURL(blob);
  document.getElementById("current-image").src = url;
}
```
