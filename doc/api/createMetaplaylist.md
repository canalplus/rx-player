# createMetaplaylist ###########################################################

`createMetaplaylist` is a function that allows to build a [metaplaylist]
(./metaplaylist.md) object from given contents information.

You may need to use this function because not all information about contents
are known by the user when wanting to create a metaplaylist. For example,
the end of a content will be found thanks to the content duration, that can be
parsed from the content manifest.

## How to import it ############################################################

`createMetaplaylist` is for now considered an "experimental" tool. This means
that its API could change at any new version of the RxPlayer (don't worry, we
would still document all changes made to it in the corresponding release note).

As an experimental tool, it is imported as such:
```ts
import { createMetaplaylist } from "rx-player/experimental/tools";
```

You can then begin to use it right away.



## How to use it ###############################################################


`createMetaplaylist` takes as an argument the list of content information, in 
the playback order they should have in the metaplaylist.

The list is an array of objects with this attributes :
- url (``string``): The URL of the source content
- transport (``string``): The transport type of the content (`dash`, `smooth`
or even `metaplaylist`)

Example:
```js
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
    }
]
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
                startTime: 0,
                endTime: 600,
            },
            {
                url: "https://somesmoothcontent.ism",
                transport: "smooth",
                startTime: 600,
                endTime: 635,
            },
            {
                url: "https://somemetaplaylistcontent",
                transport: "metaplaylist",
                startTime: 635,
                endTime: 6635,
            },
        ],
    }
```
