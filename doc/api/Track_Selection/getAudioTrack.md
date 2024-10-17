# getAudioTrack

## Description

### Returned object

Get information about the audio track currently set. `null` if no audio track is enabled
right now.

If an audio track is set and information about it is known, this method will return an
object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other audio track for the
  same [Period](../../Getting_Started/Glossary.md#period) will have the same `id`.

  This can be useful when setting the track through the `setAudioTrack` method.

- `language` (`string`): The language the audio track is in, as set in the
  [Manifest](../../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language` property into an ISO
  639-3 language code (for now only support translations from ISO 639-1 and ISO 639-3
  language codes). If the translation attempt fails (no corresponding ISO 639-3 language
  code is found), it will equal the value of `language`

- `audioDescription` (`Boolean`): Whether the track is an audio description of what is
  happening at the screen.

- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a "dub", meaning it
  was recorded in another language than the original. If set to `false`, we know that this
  audio track is in an original language. This property is `undefined` if we do not known
  whether it is in an original language.

- `label` (`string|undefined`): A human readable label that may be displayed in the user
  interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../../Getting_Started/Glossary.md#representation) of this audio track,
  with attributes:

  - `id` (`string`): The id used to identify this Representation. No other Representation
    from this track will have the same `id`.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in bits per
    seconds.

    `undefined` if unknown.

  - `codec` (`string|undefined`): The audio codec the Representation is in, as announced
    in the corresponding Manifest.

  - `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation has
    spatial audio.

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

`undefined` if no audio content has been loaded yet or if its information is unknown.

### Asking for a specific Period

You can also get the information on the chosen audio track for another Period by calling
`getAudioTrack` with the corresponding Period's id in argument. Such id can be obtained
through the `getAvailablePeriods` method, the `newAvailablePeriods` event or the
`periodChange` event.

```js
// example: getting track information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAudioTrack(periods[0].id);
```

### Including Representations that cannot be played

You can also ask `getAudioTrack` to include in its response `Representation` objects which
will not be played because they have their `isCodecSupported` or `decipherable` property
set to `false` (those are filtered out by default, as indicated above).

To do this, you can provide an object to `getAudioTrack` with a
`filterPlayableRepresentations` property set to `false` like this:

```js
const audioTrack = player.getAudioTrack();
```

You may for example also want to know which Representation are not playable to provide
debug information, or to detect deterministically the capabilities of the current device.

Note that this will return the metadata of the currently-chosen audio track only for the
current Period. To obtain metadata on all representations for the currently-chosen audio
track for another Period, you can also set a `periodId` property:

```js
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAudioTrack({
    periodId: periods[0].id,
    filterPlayableRepresentations: false,
});
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
audio tracks API in the browser, this method returns "undefined".
</div>

## Syntax

```js
// Get information about the currently-playing audio track
const audioTrack = player.getAudioTrack();

// Also include metadata on the non-playable Representations
const audioTrack = player.getAudioTrack({
  filterPlayableRepresentations: false,
});

// Get information about the audio track for a specific Period
const audioTrack = player.getAudioTrack(periodId);

// Get information about the audio track for a specific Period and also include metadata
// on the non-playable Representations
const audioTrack = player.getAudioTrack({
  periodId,
  filterPlayableRepresentations: false,
});
```

- **arguments**:

  1.  _arg_ `Object|string|undefined`: If set to a `string`, this is the `id` of the
      Period for which you want to get information about its current audio track.

      If not defined, the information associated to the currently-playing Period will be
      returned.

      If set to an Object, the following properties can be set (all optional):

          - `periodId` (`string|undefined`): The `id` of the wanted Period, or
            `undefined` (or not set) for the currently-playing Period

          - `filterPlayableRepresentations` (`boolean|undefined`): If set to `false`,
            Representation that are considered "non-playable" (which have an unsupported
            mime-type/codec or which are undecipherable) will be included.

- **return value** `Object|null|undefined`
