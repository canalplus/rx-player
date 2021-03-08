---
id: createMetaplaylist-tool
title: createMetaplaylist
sidebar_label: createMetaplaylist
slug: tools/create-metaplaylist
---

## Overview

`createMetaplaylist` is a function that allows to build a [metaplaylist]
(./metaplaylist.md) object from given contents information.

You may need to use this function because not all information about contents
are known by the user when wanting to create a metaplaylist. For example,
the end of a content will be found thanks to the content duration, that can be
parsed from the content manifest.

## How to import it

`createMetaplaylist` is for now considered an "experimental" tool. This means
that its API could change at any new version of the RxPlayer (don't worry, we
would still document all changes made to it in the corresponding release note).

As an experimental tool, it is imported as such:

```ts
import { createMetaplaylist } from "rx-player/experimental/tools";
```

You can then begin to use it right away.

## How to use it

`createMetaplaylist` takes two arguments :

- contentInfos (`Array<Object>`) : The list of content information, in the
  playback order they should have in the metaplaylist.

  The list is an array of objects with this attributes :

  - url (`string`): The URL of the source content
  - transport (`string`): The transport type of the content (`dash`, `smooth`
    or even `metaplaylist`)

- timeOffset (`number|undefined`) : the optionnal time offset that
  applies to the metaplaylist start time (default is 0).

Example:

```js
createMetaplaylist(
  [
    // dash content, 10mn long
    {
      url: "https://somedashcontent.mpd",
      transport: "dash",
    },
    // smooth content, 35s long
    {
      url: "https://somesmoothcontent.ism",
      transport: "smooth",
    },
    // metaplaylist content, 100mn long
    {
      url: "https://somemetaplaylistcontent",
      transport: "metaplaylist",
    },
  ],
  1000
);
```

The returned metaplaylist will look like :

```js
    {
        type: "MPL",
        version: "0.1",
        dynamic: false,
        contents: [
            {
                url: "https://somedashcontent.mpd",
                transport: "dash",
                startTime: 1000,
                endTime: 1600,
            },
            {
                url: "https://somesmoothcontent.ism",
                transport: "smooth",
                startTime: 1600,
                endTime: 1635,
            },
            {
                url: "https://somemetaplaylistcontent",
                transport: "metaplaylist",
                startTime: 1635,
                endTime: 7635,
            },
        ],
    }
```
