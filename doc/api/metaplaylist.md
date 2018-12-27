# MetaPlaylist v0.1 ############################################################

## Overview ####################################################################

The `MetaPlaylist` is a file allowing to define a content englobing multiple
DASH or Smooth contents one after another.

It allows advanced use cases for a extremely low cost for the server
infrastructure, the main one being creating a linear (live) contents from
multiple non-linear (VOD) ones, without touching the original contents.

The same result could be approximated with some advanced DASH features, but the
MetaPlaylist has several advantages. Some of them are:

  - it manages "overlays" in its specification, which are images to display on
    top of the current content at certain points in time (e.g.: the content
    rating and/or the channel logo).

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

    The "overlays" are also specified to be easily displayed on a web target.

  - this file rarely needs to be updated, improving the caching of this
    ressource.

  - its format is extremely simple and in JSON, which is easy to integrate with
    JavaScript codebases. The file can even be very easily generated directly on
    the client's page. This paves the way for contents personalized to a single
    customer.

  - Digital right management is also much more flexible than with a DASH MPD.
    For example, different license servers for different contents could easily
    be integrated.

  - the specification is simple, allow no interpretation and is strict on what
    is permitted. This should please client-side developpers!

  - All its features have been tested on web applications, meaning that you have
    the guarantee everything will work on any browser, even IE11!



## Structure of a MetaPlaylist #################################################

A MetaPlaylist file is a simple JSON file.

To jump into it right away, let me introduce an example of it:
```json
{
  "type": "MPL",
  "version": "0.1",
  "isLive": true,
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
    client (a client written for the `0.1` version can be used even for the
    `0.99` version).

  - isLive (`boolean`): If `true`, the MetaPlaylist file is not finished, and
    might need to be updated. If `false`, the MetaPlaylist could still need
    to be updated but its current content indicates a finished content:
    A player should end when the end of the last content has been reached.

  - pollInterval (`number`): This property is not required.

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
    TODO what about leap seconds?

  - endTime (`number`): unix time at which the content should end. It the
    original content is longer, it should be cut at that time.
    The original content should not be shorter.
    TODO what about leap seconds?

  - transport (`string`): indicates the original streaming protocol.
    Can be either of those two values for now:
      - `"dash"`: the URL points to a DASH's MPD
      - `"smooth"`: the URL points to a Microsoft Smooth Streaming's Manifest.

All those contents should be contiguous (meaning that the `endTime` of one
should be the same value than the `startTime` of the following one).

> Optional parameters are:
> - content:
>     - textTracks ( _type_: ``Object`` ): An array of text tracks info:
>         - url ( _type_: ``string``): The URL of the text track.
>         - language ( _type_ : ``string`` ): The language of the text track (in ISO 639-2 or ISO 639-3 format).
>         - mimeType ( _type_: ``string`` ): The mimeType of the text track.

  > ## <a name="logic"></a>The logic behind

> The MetaPlaylist defines the playback of original content on his own timeline. 
> The timeline of MetaPlaylist starts at 01/01/1970. Considering that each original content start time is 0, each content plays at specified startTime in MetaPlaylist. The startTime of content is thus an offset to original boudaries. 

> ```
> 0 ----[...]-------- MetaPlaylist Timeline -------- NOW ----------->

  >                           play at: 1300000000        1300000300
  >                                  |-------- DASH -------->|
  >                               start: 0    Content      end: 300

  >       play at: 1299999800     1300000000
  >               |----- Smooth ---->|
  >           start: 0   Content   end: 200
> ```
