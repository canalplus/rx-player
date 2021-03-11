---
id: setPreferredAudioTracks-api
title: setPreferredAudioTracks method
sidebar_label: setPreferredAudioTracks
slug: setPreferredAudioTracks
---

---

**syntax**: `player.setPreferredAudioTracks(preferences)` /
`player.setPreferredAudioTracks(preferences, shouldApply)`

**arguments**:

- _preferences_ (`Array.<Object>`): wanted audio track configurations by
  order of preference.

- _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
  content being played.

---

Allows the RxPlayer to choose an initial audio track, based on language
preferences, codec preferences or both.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

The first argument should be set as an array of objects, each object describing
constraints an audio track should respect.

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):

```js
{
  language: "fra", // {string|undefined} The language the track should be in
                   // (in preference as an ISO 639-1, ISO 639-2 or ISO 639-3
                   // language code).
                   // If not set or set to `undefined`, the RxPlayer won't
                   // filter based on the language of the track.

  audioDescription: false // {Boolean|undefined} Whether the audio track should
                          // be an audio description for the visually impaired
                          // or not.
                          // If not set or set to `undefined`, the RxPlayer
                          // won't filter based on that status.

  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /ec-3/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
}
```

When encountering a new content or a new choice of tracks in a given content,
the RxPlayer will look at each object in that array.
If the first object in it defines constaints that cannot be respected under the
currently available audio tracks, the RxPlayer will consider the second object
in the array and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active track and
the active track of Periods (in DASH) or sub-contents (in MetaPlaylist) that
have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a **new** Period or sub-content is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

- the content being currently played.
  Here, the current audio preference will stay in place.

- the Periods or sub-contents which have already been loaded for the current
  content.
  Those will keep the audio track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.

#### Examples

Let's imagine that you prefer to have french or italian over all other audio
languages. If not found, you want to fallback to english:

```js
player.setPreferredAudioTracks([
  { language: "fra", audioDescription: false },
  { language: "ita", audioDescription: false },
  { language: "eng", audioDescription: false },
]);
```

Now let's imagine that you want to have in priority a track that contain at
least one profile in Dolby Digital Plus (ec-3 codec) without caring about the
language:

```js
player.setPreferredAudioTracks([ { codec: { all: false, test: /ec-3/ } ]);
```

At last, let's combine both examples by preferring french over itialian, italian
over english while preferring it to be in Dolby Digital Plus:

```js
player.setPreferredAudioTracks([
  {
    language: "fra",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ },
  },

  // We still prefer non-DD+ french over DD+ italian
  { language: "fra", audioDescription: false },

  {
    language: "ita",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ },
  },
  { language: "ita", audioDescription: false },

  {
    language: "eng",
    audioDescription: false,
    codec: { all: false, test: /ec-3/ },
  },
  { language: "eng", audioDescription: false },
]);
```

:::caution

This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)) when either :

- No audio track API is supported on the current browser
- The media file tracks are not supported on the browser

:::
