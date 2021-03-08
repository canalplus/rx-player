---
id: parseBifThumbnails-tool
title: parseBifThumbnails
sidebar_label: parseBifThumbnails
slug: tools/parse-bif-thumbnails
---

## Overview

`parseBifThumbnails` is a function allowing to easily parse `BIF` files, which
is a file format crafted to contain video thumbnails.

Those are usually used to give a visual indication of where in a given media you
will seek to when hovering a progress bar.

## About BIF files

The BIF format is straightforward. It contains several metadata and then all the
images for the whole content, in their original format (e.g. "jpeg"),
concatenated.

## How to import it

`parseBifThumbnails` is for now considered an "experimental" tool. This means
that its API could change at any new version of the RxPlayer (don't worry, we
would still document all changes made to it in the corresponding release note).

As an experimental tool, it is imported as such:

```ts
import { parseBifThumbnails } from "rx-player/experimental/tools";
```

You can then begin to use it right away.

## How to use it

As a simple parser, `parseBifThumbnails` takes the downloaded BIF file in an
ArrayBuffer form and returns its content under an object format, like this:

```js
import { parseBifThumbnails } from "rx-player/experimental/tools";

// optionally, fetch the BIF resource through the usual APIs
fetch("http://www.example.com/thumbnails.bif").then(function(response) {
  return response.arrayBuffer(); // obtain an ArrayBuffer response
}).then(function(buffer) {
  const parsedBif = parseBifThumbnails(buffer);
  console.log("parsed BIF:", parsedBif);
};
```

Here is an example of the returned data:

```js
{
  version: "0.0.0.0", // BIF version. For the moment, only "0.0.0.0" is
                      // specified.
  images: [    // Array of thumbnails for this content
    {
      startTime: 0, // Start position at which the thumbnail should be applied
                    // to, in milliseconds.
                    // For example, a time of `5000`, indicates that this
                    // thumbnail should be shown from the 5 second mark in the
                    // content (until the next image is displayed instead)
      image: ArrayBuffer() // The thumbnail itself, in an ArrayBuffer form.
    },
    {
      startTime: 10000,
      endTime: 20000,
      thumbnail: ArrayBuffer()
    },
    {
      startTime: 20000,
      endTime: 30000,
      thumbnail: ArrayBuffer()
    },
    // ...
  ],
}
```
