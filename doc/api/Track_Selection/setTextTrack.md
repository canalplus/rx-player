# setTextTrack

## Description

Change the text (subtitles) track.

This method can take a string corresponding to the wanted track's `id` property.
This `id` can for example be obtained on the corresponding track object returned
by the `getAvailableTextTracks` method.

```js
// Setting the first text track
const textTracks = rxPlayer.getAvailableTextTracks();
rxPlayer.setTextTrack(textTracks[0].id);
```

`setTextTrack` can also accept an object argument allowing more precize
settings, described below.
In the case an object is given, the text track's id should be set as in a
`trackId` property.
```js
// Setting the first text track
const textTracks = rxPlayer.getAvailableTextTracks();
rxPlayer.setTextTrack({
  trackId: textTracks[0].id,
});
```

<div class="warning">
If used on Safari, in _DirectFile_ mode, the track change may change
the track on other track type (e.g. changing video track may change the
subtitles track too).
This has two potential reasons :

<ul>
  <li>The HLS defines variants, groups of tracks that may be read together</li>
  <li>Safari may decide to enable a track for accessibility or user language
  convenience (e.g. Safari may switch subtitle to your OS language if you pick
  another audio language)
  You can know if another track has changed by listening to the corresponding
  events that the tracks have changed.</li>
</ul>
</div>

### Changing the text track for any Period

You can change the text track for any
[Period](../../Getting_Started/Glossary.md#period) (and not just the one being
played) by indicating its `id` property in a `periodId` property of the Object
given to `setTextTrack`.

Periods' `id` properties can be retrieved from several means such as the
`getAvailablePeriods` method or the
[`newAvailablePeriods`](../Player_Events.md#newavailableperiods) and
[`periodChange`](../Player_Events.md#periodchange) events.

```js
// Example:
// Changing the text track for the second Period in the current Manifest

// Recuperating all Periods currently in the Manifest
const periods = rxPlayer.getAvailablePeriods();

// Getting the text track for this second Period (and not the current one):
const textTracks = rxPlayer.getAvailableTextTracks(periods[1].id);

// Updating the text track of the second Period
rxPlayer.setTextTrack({
  trackId: textTracks[0].id,
  periodId: periods[1].id,
});

```

### Setting the text track as soon as possible

It is possible to set the text track before any other is chosen for that
Period, by reacting to the `newAvailablePeriods` event:

```js
rxPlayer.addEventListener("newAvailablePeriods", (periods) => {
  for (const period of periods) {
    const periodId = period.id;
    const firstTextTrack = rxPlayer.getAvailableTextTracks(periodId)[0];
    if (firstTextTrack !== undefined) {
      rxPlayer.setTextTrack({
        trackId: firstTextTrack.id,
        periodId,
      });
    }
  }
});
```

If the current content was already playing, you can also call the
`getAvailablePeriods` method to obtain their `id` property and update their
text trackss right away:

```js
const periods = rxPlayer.getAvailablePeriods();
for (const period of periods) {
  const periodId = period.id;
  const firstTextTrack = rxPlayer.getAvailableTextTracks(periodId)[0];
  if (firstTextTrack !== undefined) {
    rxPlayer.setTextTrack({
      trackId: firstTextTrack.id,
      periodId,
    });
  }
}
```

## Syntax

```js
player.setTextTrack(textTrackId);
```

 - **arguments**:

   1. _textTrackId_ `string`: The `id` of the track you want to set

```js
// Setting the current text track
player.setTextTrack(textTrackId);

// More complex settings
player.setTextTrack({
  // required
  trackId: textTrackId,

  // optional
  periodId,
});
```

 - **arguments**:

   1. _arg_ `string|Object`: Either the text track's `id` property of the
     track you want to set for current Period, or an object with the following
     properties (only `trackId` is required):

       - `trackId` (`string`): The `id` property of the track you want to lock.

       - `periodId` (`string|undefined`): If defined, the id of the concerned
         Period. If not defined, it will be applied for the current Period.
