# getAvailableVideoTracks

## Description

Returns the list of available video tracks for the current content.

Each of the objects in the returned array have the following properties:

  - `id` (`string`): The id used to identify the track. Use it for
    setting the track via `setVideoTrack`.

  - `active` (`Boolean`): Whether this track is the one currently
    active or not.

  - `label` (`string|undefined`): A human readable label that may be displayed in
    the user interface providing a choice between video tracks.

    This information is usually set only if the current Manifest contains one.

  - `representations` (`Array.<Object>`):
    [Representations](../../Getting_Started/Glossary.md#representation) of this
    video track, with attributes:

    - `id` (`string`): The id used to identify this Representation.

    - `bitrate` (`Number|undefined`): The bitrate of this Representation, in
      bits per seconds.

      `undefined` if unknown.

    - `width` (`Number|undefined`): The width of video, in pixels.

    - `height` (`Number|undefined`): The height of video, in pixels.

    - `codec` (`string|undefined`): The video codec the Representation is
      in, as announced in the corresponding Manifest.

    - `frameRate` (`number|undefined`): The video framerate.

    - `hdrInfo` (`Object|undefined`) Information about the hdr
      characteristics of the track.
      (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

  - `signInterpreted` (`Boolean|undefined`): If set to `true`, the track is
    known to contain an interpretation in sign language.
    If set to `false`, the track is known to not contain that type of content.
    If not set or set to undefined we don't know whether that video track
    contains an interpretation in sign language.


  - `trickModeTracks` (`Array.<Object> | undefined`): Trick mode video tracks
    attached to this video track.

    Each of those objects contain the same properties that a regular video track
    (same properties than what is documented here).

    It this property is either `undefined` or not set, then this track has no
    linked trickmode video track.

You can also get the list of available video tracks for a specific Period by
calling `getAvailableVideoTracks` with the corresponding Period's id in
argument.
Such id can be obtained through the `getAvailablePeriods` method, the
`newAvailablePeriods` event or the `periodChange` event.

```js
// example: getting the video track list for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAvailableVideoTracks(periods[0].id);
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
supported tracks in the file or no track management API in the browser this
method will return an empty Array.
</div>

## Syntax

```js
// Get list of available video tracks for the currently-playing Period
const videoTracks = player.getAvailableVideoTracks();

// Get list of available video tracks for a specific Period
const videoTrack = player.getAvailableVideoTracks(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get the list of available video tracks.
      If not defined, this method will return the list of video tracks for the
      currently-playing Period.

 - **return value** `Array.<Object>`
