# getAvailableAudioTracks

## Description

Returns the list of available audio tracks for the current content.

Each of the objects in the returned array have the following properties:

- `active` (`Boolean`): Whether the track is the one currently active or
  not. Only maximum one audio track can be active at a time.

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setAudioTrack`.

- `language` (`string`): The language the audio track is in, as set in
  the [Manifest](../../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
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

  - `bitrate` (`Number|undefined`): The bitrate of this Representation, in
    bits per seconds.

    `undefined` if unknown.

  - `codec` (`string|undefined`): The audio codec the Representation is
    in, as announced in the corresponding Manifest.

<div class="note">
Note for multi-Period contents:
<br>
This method will only return the available tracks of the
<a href="../../Getting_Started/Glossary.md#period">Period</a> that is currently
playing.
</div>

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
supported tracks in the file or no track management API in the browser this
method will return an empty Array.
</div>

## Syntax

```js
const audioTracks = player.getAvailableAudioTracks();
```

 - **return value** `Array.<Object>`
