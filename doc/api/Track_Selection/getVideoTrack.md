# getVideoTrack

## Description

### Returned object

Get information about the video track currently set.

- `null` if no video track is enabled right now.
- `undefined` if no video content has been loaded yet or if its information is unknown.

If a video track is set and information about it is known, this method will return an
object with the following properties:

- `id` (`string`): The id used to identify this track. No other video track for the same
  [Period](../../Getting_Started/Glossary.md#period) will have the same `id`.

  This can be useful when setting the track through the `setVideoTrack` method.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between video tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`): Only the currently-playable
  [Representations](../../Getting_Started/Glossary.md#representation) of this video track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation. No other Representation
    from this track will have the same `id`.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

    `undefined` if unknown.

  - `width` (`Number|undefined`): The width of this video Representation, in pixels.

  - `height` (`Number|undefined`): The height of this video Representation, in pixels.

  - `codec` (`string|undefined`): The video codec the Representation is in, as announced
    in the corresponding Manifest.

  - `frameRate` (`number|undefined`): The video frame rate, in frames per second.

  - `hdrInfo` (`Object|undefined`) Information about the hdr characteristics of the track.
    (see [HDR support documentation](../Miscellaneous/hdr.md#hdrinfo))

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that unless you set the `filterPlayableRepresentations` option to `false`, no
    Representation with a `isCodecSupported` value of `false` will be present in this
    array (they'll all be filtered out).

    `undefined` (or not set) if support of that Representation is unknown or if does not
    make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be deciphered
    (in the eventuality it had DRM-related protection).

    Note that unless you set the `filterPlayableRepresentations` option to `false`, no
    Representation with a `isCodecSupported` value of `false` will be present in this
    array (they'll all be filtered out).

  - `contentProtections` (`Object|undefined`): Encryption information linked to this
    Representation.

    If set to an Object, the Representation is known to be encrypted. If unset or set to
    `undefined` the Representation is either unencrypted or we don't know if it is.

    When set to an object, it may contain the following properties:

    - `keyIds` (`Array.<Uint8Array>|undefined`): Known key ids linked to that
      Representation.

- `signInterpreted` (`Boolean|undefined`): If set to `true`, this track is known to
  contain an interpretation in sign language. If set to `false`, the track is known to not
  contain that type of content. If not set or set to undefined we don't know whether that
  video track contains an interpretation in sign language.

- `isTrickModeTrack` (`Boolean|undefined`): If set to `true`, this track is a trick mode
  track. This type of tracks proposes video content that is often encoded with a very low
  framerate with the purpose to be played more efficiently at a much higher speed.

  To enter or exit a mode where trickmode tracks are used instead of regular non-trickmode
  ones, you can use the `setPlaybackRate` function.

- `trickModeTracks` (`Array.<Object> | undefined`): Trick mode video tracks attached to
  this video track.

  Each of those objects contain the same properties that a regular video track (same
  properties than what is documented here).

  It this property is either `undefined` or not set, then this track has no linked
  trickmode video track.

### Asking for a specific Period

You can also get the information on the chosen video track for another Period by calling
`getVideoTrack` with the corresponding Period's id in argument. Such id can be obtained
through the `getAvailablePeriods` method, the `newAvailablePeriods` event or the
`periodChange` event.

```js
// example: getting track information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getVideoTrack(periods[0].id);
```

### Including Representations that cannot be played

You can also ask `getVideoTrack` to include in its response `Representation` objects which
will not be played because they have their `isCodecSupported` or `decipherable` property
set to `false` (those are filtered out by default, as indicated above).

To do this, you can provide an object to `getVideoTrack` with a
`filterPlayableRepresentations` property set to `false` like this:

```js
const videoTrack = player.getVideoTrack();
```

You may for example also want to know which Representation are not playable to provide
debug information, or to detect deterministically the capabilities of the current device.

Note that this will return the metadata of the currently-chosen video track only for the
current Period. To obtain metadata on all representations for the currently-chosen video
track for another Period, you can also set a `periodId` property:

```js
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getVideoTrack({
    periodId: periods[0].id,
    filterPlayableRepresentations: false,
});
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
video tracks API in the browser, this method returns "undefined".
</div>

## Syntax

```js
// Get information about the currently-playing video track
const videoTrack = player.getVideoTrack();

// Also include metadata on the non-playable Representations
const videoTrack = player.getVideoTrack({
  filterPlayableRepresentations: false,
});

// Get information about the video track for a specific Period
const videoTrack = player.getVideoTrack(periodId);

// Get information about the video track for a specific Period and also include metadata
// on the non-playable Representations
const videoTrack = player.getVideoTrack({
  periodId,
  filterPlayableRepresentations: false,
});
```

- **arguments**:

  1.  _arg_ `Object|string|undefined`: If set to a `string`, this is the `id` of the
      Period for which you want to get information about its current video track.

      If not defined, the information associated to the currently-playing Period will be
      returned.

      If set to an Object, the following properties can be set (all optional):

          - `periodId` (`string|undefined`): The `id` of the wanted Period, or
            `undefined` (or not set) for the currently-playing Period

          - `filterPlayableRepresentations` (`boolean|undefined`): If set to `false`,
            Representation that are considered "non-playable" (which have an unsupported
            mime-type/codec or which are undecipherable) will be included.

- **return value** `Object|null|undefined`
