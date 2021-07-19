---
id: setPreferredTextTracks-api
title: setPreferredTextTracks method
sidebar_label: setPreferredTextTracks
slug: setPreferredTextTracks
---

---

**syntax**: `player.setPreferredTextTracks(preferences)` /
`player.setPreferredTextTracks(preferences, shouldApply)`

**arguments**:

- _preferences_ (`Array.<Object>`): wanted text track configurations by
  order of preference.

- _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
  content being played.

---

Allows the RxPlayer to choose an initial text track, based on language
and accessibility preferences.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

--

The first argument should be set as an array of objects, each object describing
constraints a text track should respect.

Here is all the properties that should be set in a single object of that array.

```js
{
  language: "fra", // {string} The wanted language
                   // (ISO 639-1, ISO 639-2 or ISO 639-3 language code)
  closedCaption: false // {Boolean} Whether the text track should be a closed
                       // caption for the hard of hearing
}
```

When encountering a new content or a new choice of tracks in a given content,
the RxPlayer will look at each object in that array.
If the first object in it defines constaints that cannot be respected under the
currently available text tracks, the RxPlayer will consider the second object
in the array and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

You can set `null` instead of an object to mean that you want no subtitles.
When reaching that point of the array, the RxPlayer will just disable the
current text track.

As such, if you never want any subtitles, you can just set this argument to
`[null]` (an array with only the value `null` at the first position).

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active text track
and the active text track of Periods (in DASH) or sub-contents (in
MetaPlaylist) that have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a **new** Period or sub-content is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

- the content being currently played.
  Here, the current text track preference will stay in place.

- the Periods or sub-contents which have already been loaded for the current
  content.
  Those will keep the text track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.

#### Example

Let's imagine that you prefer to have french or italian subtitles.If not found,
you want no subtitles at all.

You will thus call `setPreferredTextTracks` that way.

```js
player.setPreferredTextTracks([
  { language: "fra", closedCaption: false },
  { language: "ita", closedCaption: false },
  null,
]);
```

This won't apply on the currently loaded content(s), if you also want that, you
can add `true` as a second argument:

```js
player.setPreferredTextTracks(
  [
    { language: "fra", closedCaption: false },
    { language: "ita", closedCaption: false },
    null,
  ],
  true
);
```

:::caution

This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)) when either :

- No text track API is supported on the current browser
- The media file tracks are not supported on the browser

:::
