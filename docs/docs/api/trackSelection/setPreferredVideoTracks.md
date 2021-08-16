---
id: setPreferredVideoTracks-api
title: setPreferredVideoTracks method
sidebar_label: setPreferredVideoTracks
slug: setPreferredVideoTracks
---

---

**syntax**: `player.setPreferredVideoTracks(preferences)` /
`player.setPreferredVideoTracks(preferences, shouldApply)`

**arguments**:

- _preferences_ (`Array.<Object>`): wanted video track configurations by
  order of preference.

- _shouldApply_ (`Boolean | undefined`): Whether this should be applied to the
  content being played.

---

Allows the RxPlayer to choose an initial video track, based on codec
preferences, accessibility preferences or both.

This method can be called at any time - even when no content is loaded, and will
apply to every future loaded content in the current RxPlayer instance.

The first argument should be set as an array of objects, each object describing
constraints a video track should respect.

Here is all the possible constraints you can set in any one of those objects
(note that all properties are optional here, only those set will have an effect
on which tracks will be filtered):

```js
{
  codec: { // {Object|undefined} Constraints about the codec wanted.
           // if not set or set to `undefined` we won't filter based on codecs.

    test: /hvc/, // {RegExp} RegExp validating the type of codec you want.

    all: true, // {Boolean} Whether all the profiles (i.e. Representation) in a
               // track should be checked against the RegExp given in `test`.
               // If `true`, we will only choose a track if EVERY profiles for
               // it have a codec information that is validated by that RegExp.
               // If `false`, we will choose a track if we know that at least
               // A SINGLE profile from it has codec information validated by
               // that RegExp.
  }
  signInterpreted: true, // {Boolean|undefined} If set to `true`, only tracks
                         // which are known to contains a sign language
                         // interpretation will be considered.
                         // If set to `false`, only tracks which are known
                         // to not contain it will be considered.
                         // if not set or set to `undefined` we won't filter
                         // based on that status.
}
```

If the first defined object in that array - defining the first set of
constraints - cannot be respected under the currently available video tracks,
the RxPlayer will check with the second object instead and so on.

As such, this array should be sorted by order of preference: from the most
wanted constraints to the least.

When the next encountered constraint is set to `null`, the player will simply
disable the video track. If you want to disable the video track by default,
you can just set `null` as the first element of this array (e.g. like `[null]`).

The second argument to that function is an optional boolean which - when set
to `true` - will apply that preference to the content and Period that have
already been playing.

By setting it to `true`, you might thus change the currently-active track and
the active track of Periods (in DASH) or sub-contents (in MetaPlaylist) that
have already been played in the current content.

By setting it to `false`, `undefined` or not setting it, those preferences will
only be applied each time a **new** Period (or sub-content) is loaded by the
RxPlayer.

Simply put, if you don't set the second argument to `true` those preferences
won't be applied to:

- the content being currently played.
  Here, the current video preference will stay in place.

- the Periods or sub-contents which have already been loaded for the current
  content.
  Those will keep the video track chosen at the last time they were loaded.

If you want the preferences to also be applied to those, you can set the second
argument to `true`.

#### Examples

Let's imagine that you prefer to have a track which contains only H265
profiles. You can do:

```js
player.setPreferredVideoTracks([{ codec: { all: false, test: /^hvc/ } }]);
```

With that same constraint, let's no consider that the current user prefer in any
case to have a sign language interpretation on screen:

````js
player.setPreferredVideoTracks([
  // first let's consider the best case: H265 + sign language interpretation
  {
    codec: { all: false, test: /^hvc/ }
    signInterpreted: true,
  },

  // If not available, we still prefer a sign interpreted track without H265
  { signInterpreted: true },

  // If not available either, we would prefer an H265 content
  { codec: { all: false, test: /^hvc/ } },

  // Note: If this is also available, we will here still have a video track
  // but which do not respect any of the constraints set here.
]);
would thus prefer the video to contain a sign language interpretation.
We could set both the previous and that new constraint that way:

---

For a totally different example, let's imagine you want to play without any
video track enabled (e.g. to start in an audio-only mode). To do that, you can
simply do:
```js
player.setPreferredVideoTracks([null], true);
````

:::caution

This option will have no effect in _DirectFile_ mode
(see [loadVideo options](./../basicMethods/loadVideo.md#transport)) when either :

- No video track API is supported on the current browser
- The media file tracks are not supported on the browser

:::
