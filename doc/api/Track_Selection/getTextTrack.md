# getTextTrack

## Description

Get information about the text track currently set.
`null` if no text track is enabled right now.

If a text track is set and information about it is known, this method will
return an object with the following properties:

- `id` (`Number|string`): The id used to identify this track. No other
  text track for the same [Period](../../Getting_Started/Glossary.md#period) will have the same
  `id`.

  This can be useful when setting the track through the `setTextTrack` method.

- `language` (`string`): The language the text trac./../Basic_Methods/loadVideo.md#transport set in the
  [Manifest](../../Getting_Started/Glossary.md#manifest).

- `normalized` (`string`): An attempt to translate the `language`
  property into an ISO 639-3 language code (for now only support translations
  from ISO 639-1 and ISO 639-3 language codes). If the translation attempt
  fails (no corresponding ISO./../Basic_Methods/loadVideo.md#transport found), it will equal the
  value of `language`

- `label` (`string|undefined`): A human readable label that may be displayed in
  the user interface providing a choice between text tracks.

  This information is usually set only if the current Manifest contains one.

- `closedCaption` (`Boolean`): Whether the track is specially adapted for
  the hard of hearing or not.

`undefined` if no text content has been loaded yet or if its information is
unknown.

You can also get the information on the chosen text track for another Period by
calling `getTextTrack` with the corresponding Period's id in argument. Such id
can be obtained through the `getAvailablePeriods` method, the
`newAvailablePeriods` event or the `periodChange` event.

```js
// example: getting track information for the first Period
const periods = rxPlayer.getAvailablePeriods();
console.log(rxPlayer.getTextTrack(periods[0].id);
```

<div class="warning">
In <i>DirectFile</i> mode (see <a
href="../Loading_a_Content.md#transport">loadVideo options</a>), if there is no
text tracks API in the browser, this method returns "undefined".
</div>

## Syntax

```js
// Get information about the currently-playing text track
const textTrack = player.getTextTrack();

// Get information about the text track for a specific Period
const textTrack = player.getTextTrack(periodId);
```

 - **arguments**:

   1. _periodId_ `string|undefined`: The `id` of the Period for which you want
      to get information about its current text track.
      If not defined, the information associated to the currently-playing Period
      will be returned.

 - **return value** `Object|null|undefined`
