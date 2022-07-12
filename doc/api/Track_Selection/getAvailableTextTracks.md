# getAvailableTextTracks

## Description

Returns the list of available text tracks (subtitles) for the current content.

Each of the objects in the returned array have the following properties:

- `id` (`string`): The id used to identify the track. Use it for
  setting the track via `setTextTrack`.

- `language` (`string`): The language the text track is in, as set in the
  [Manifest](../../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-2 language codes). If the translation attempt
  fails (no corresponding ISO 639-3 language code is found), it will equal the
  value of `language`

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

- `active` (`Boolean`): Whether the track is the one currently active or
  not.

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
const textTracks = player.getAvailableTextTracks();
```

 - **return value** `Array.<Object>`
