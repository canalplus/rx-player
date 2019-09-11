# MetaPlaylist v0.1 ############################################################

## Overview ####################################################################

The `MetaPlaylist` is a file allowing to define a content composed of multiple
DASH or Smooth contents played one after another.

It allows advanced use cases for an extremely low cost for the server
infrastructure, the main one being creating a linear (live) contents from
multiple non-linear (VOD) ones, without touching the original contents.

You can also construct a new non-linear contents as a concatenation of multiple
non-linear contents put one after the other. This method allows for example for
a completely smooth streaming between multiple programs (e.g. when
binge-watching a serie).



## Differences with plain DASH contents ########################################

The same result could be approximated with some advanced DASH features, but the
MetaPlaylist has several advantages. Some of them are:

  - it supports DASH and HSS contents (technically HLS would also be possible)
    without modifying the original MPD/Manifest nor segments.

  - the Manifest/MPD/Playlist corresponding to the original contents can
    be lazy-loaded (loaded only when the content will play).

    This is also possible in DASH with a feature called XLinks but it's not
    always doable on the client-side, depending on the other elements present in
    that MPD.

    A MetaPlaylist file is much more strict in this regard.

  - it's a format especially intended to be a concatenation of multiple
    contents to be played on the web.

    As such, advanced features such as declaring segments before they
    should be played or avoiding many customers doing the same manifest
    request at the exact same time are much easier to implement.

  - this file rarely needs to be updated, improving the caching of this
    ressource.

  - its format is extremely simple and in JSON, which is easy to integrate with
    JavaScript codebases. The file can even be very easily generated directly on
    the client's page. This paves the way for contents personalized to a single
    customer.

  - Digital right management is also much more flexible than with a DASH MPD.
    For example, different license servers for different contents could be
    integrated. This is still a work-in-progress.

  - the specification is simple, allow no interpretation and is strict on what
    is permitted.

  - All its features have been tested on web applications, meaning that you have
    the guarantee everything will work on any browser, even IE11.



## Structure of a MetaPlaylist #################################################

A MetaPlaylist file is a simple JSON file.

To jump into it right away, let me introduce some examples.

For a VOD content:
```json
{
  "type": "MPL",
  "version": "0.1",
  "contents": [
    {
      "url": "http://url.to.some/DASH/first_content.mpd",
      "startTime": 0,
      "endTime": 10000,
      "transport": "dash"
    },
    {
      "url": "http://url.to.some/DASH/second_content.Manifest",
      "startTime": 10000,
      "endTime": 40000,
      "transport": "smooth"
    },
    {
      "url": "http://url.to.some/Smooth/third_content.mpd",
      "startTime": 40000,
      "endTime": 60000,
      "transport": "dash"
    }
  ]
}
```

For a live content:
```json
{
  "type": "MPL",
  "version": "0.1",
  "dynamic": true,
  "pollInterval": 10000,
  "contents": [
    {
      "url": "http://url.to.some/DASH/content.mpd",
      "startTime": 1545845950176,
      "endTime": 1545845985571,
      "transport": "dash"
    },
    {
      "url": "http://url.to.some/other/DASH/content.mpd",
      "startTime": 1545845985571,
      "endTime": 1545845998710,
      "transport": "dash"
    },
    {
      "url": "http://url.to.some/Smooth/content.Manifest",
      "startTime": 1545845998710,
      "endTime": 1545845117106,
      "transport": "smooth"
    }
  ]
}
```

You may already have a basic understanding of it how works.
Let's define nonetheless every property in that JSON file.


### the header #################################################################

What I call the "header" here is roughly all properties but "contents".

Here is an exhaustive list:

  - type (`string`): should always be equal to `"MPL"`, for "MetaPlayList"

  - version (`string`): version of the MetaPlaylist file. Separated in two parts
    by a point ('.').

    The first part indicates the major version. If its number is higher than
    what the client presently manage, the client should not try to read that
    file.

    The last part indicates the minor version:
    A new feature or fix have been added but its support is not needed by a
    client (a client written for the `1.0` version can be used even for the
    `1.99` version).

    Please note that there is an exception for `0.x` versions, where each minor
    versions could have a breaking change (as it is in that case considered an
    experimental format).

  - dynamic (`boolean`|`undefined`): If `true`, the MetaPlaylist file is not
    finished, and might need to be updated. If `false`, the MetaPlaylist could
    still need to be updated but its current content indicates a finished
    content: A player should end when the end of the last content has been
    reached.

    By default, it is considered as not dynamic (so `false`).

  - pollInterval (`number`|`undefined`): This property is not required.

    If not set or set to a negative number, you do not need to refresh the
    MetaPlaylist file.

    If set to a positive number, this is the maximum interval in milliseconds
    the MetaPlaylist file should be fetched from the server.


### The contents ###############################################################

The contents are all defined as a property called `contents` at the top level of
our MetaPlaylist file.

It is an array of one or multiple objects (an empty `contents` array is not a
valid MetaPlaylist file).

Each of its objects are linked to a single content, here are the exhaustive
list of its properties:

  - url (`string`): the URL to the original DASH's MPD or Smooth's Manifest.
    For now, only a subset of such contents is supported, mainly:
      - DASH contents that have their MPD@type set to ``"static"``
      - Smooth content that have their `isLive` attribute not set to `true`
    (Simply put, only on-demand contents are supported for the moment).

  - startTime (`number`): unix time at which the content should begin to be
    played

  - endTime (`number`): unix time at which the content should end. It the
    original content is longer, it will be finished at that time instead.
    The original content should not be shorter.

  - transport (`string`): indicates the original streaming protocol.
    Can be either of those values for now:
      - `"dash"`: the URL points to a DASH's MPD
      - `"smooth"`: the URL points to a Microsoft Smooth Streaming's Manifest.
      - `"metaplaylist"`: Yes, it is possible to put MetaPlaylist files inside
        other MetaPlaylist files!

All those contents should be contiguous (meaning that the `endTime` of one
should be the same value than the `startTime` of the following one).


## How to actually play a MetaPlaylist content #################################


### Importing the METAPLAYLIST feature #########################################

The `"METAPLAYLIST"` feature is not included in the default RxPlayer build.

There's two way you can import it, depending on if you're relying on the minimal
version or if you prefer to make use of environment variables.


#### Through the minimal version of the RxPlayer

If you're using the "minimal" version of the RxPlayer (through the
`"rx-player/minimal"` import), you will need to import:
  - the `METAPLAYLIST` experimental feature
  - every transport protocol you might want to use.

For example if you need to use MetaPlaylist with both Smooth and DASH contents,
you have to import at least all three as such:

```js
import RxPlayer from "rx-player/minimal";
import { METAPLAYLIST } from "rx-player/experimental/features";
import { DASH, SMOOTH } from "rx-player/features";

RxPlayer.addFeatures([METAPLAYLIST, DASH, SMOOTH]);
```


#### Through environment variables

If you don't want to go the minimal version's route and you have no problem with
building yourself a new version of the RxPlayer, you can make use of environment
variables to activate it.

This can be done through the `RXP_METAPLAYLIST` environment variable, which you
have to set to `true`:

```sh
RXP_METAPLAYLIST=true npm run build:min
```

More informations about any of that can be found in the [minimal player
documentation](./minimal_player.md).

### Loading a MetaPlaylist content #############################################

A MetaPlaylist content can simply be played by setting a `"metaplaylist"`
transport in `loadVideo`:

```js
player.loadVideo({
  url: "http://www.example.com/metaplaylist.json",
  transport: "metaplaylist"
});
```

If you declare locally your MetaPlaylist file and do not want to set a URL for
it, you can serve directly the file through the use of a Manifest Loader:
```js
player.loadVideo({
  transport: "metaplaylist",
  transportOptions: {
    // Note: `_url` will here be `undefined`
    manifestLoader(_url, callbacks) {
      callbacks.resolve(myMetaPlaylistObject);
    }
  }
});
```
More infos on the `manifestLoader` can be found
[here](./plugins.md#manifestLoader).
