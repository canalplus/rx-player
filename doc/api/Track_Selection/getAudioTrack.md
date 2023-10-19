# getAudioTrack

## Description

Get information about the audio track currently set.
`null` if no audio track is enabled right now.

If an audio track is set and information about it is known, this method will
return an object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other
  audio track for the same [Period](../../Getting_Started/Glossary.md#period) will have the
  same `id`.

  This can be useful when setting the track through the `setAudioTrack`
  method.

- `language` (`string`): The language the audio track is in, as set in the
  [Manifest](../../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `audioDescription` (`Boolean`): Whether the track is an audio
  description of what is happening at the screen.

- `dub` (`Boolean|undefined`): If set to `true`, this audio track is a
  "dub", meaning it was recorded in another language than the original.
  If set to `false`, we know that this audio track is in an original language.
  This property is `undefined` if we do not known whether it is in an original
  language.

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between audio tracks.

  This information is usually set only if the current Manifest contains one.

- `representations` (`Array.<Object>`):
  [Representations](../../Getting_Started/Glossary.md#representation) of this video track, with
  attributes:

  - `id` (`string`): The id used to identify this Representation.
    No other Representation from this track will have the same `id`.

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in
    bits per seconds.

    `undefined` if unknown.

  - `codec` (`string|undefined`): The audio codec the Representation is
    in, as announced in the corresponding Manifest.

  - `isSpatialAudio` (`Boolean|undefined`): If set to `true`, this Representation
    has spatial audio.

  - `isCodecSupported` (`Boolean|undefined`): If `true` the codec(s) of that
    Representation is supported by the current platform.

    Note that because elements of the `representations` array only contains
    playable Representation, this value here cannot be set to `false` when
    in this array.

    `undefined` (or not set) if support of that Representation is unknown or
    if does not make sense here.

  - `decipherable` (`Boolean|undefined`): If `true` the Representation can be
     deciphered (in the eventuality it had DRM-related protection).

    Note that because elements of the `representations` array only contains
    playable Representation, this value here cannot be set to `false` when
    in this array.

`undefined` if no audio content has been loaded yet or if its information is
unknown.

You can also get the information on the chosen audio track for another Period by
calling `getAudioTrack` with the corresponding Period's id in argument. Such id
can be obtained through the `getAvailablePeriods` method, the
`newAvailablePeriods` event or the `periodChange` event.

```js
// example: getting track information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getAudioTrack(periods[0].id);
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

// Get information about the audio track for a specific Period
const audioTrack = player.getAudioTrack(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get information about its current audio track.
      If not defined, the information associated to the currently-playing Period
      will be returned.

 - **return value** `Object|null|undefined`
