# v4.0.0-beta.0

## Overview

The first `v4.0.0` beta version, `v4.0.0-beta.0` is finally here!

First, this is a very big release in terms of changes but don't be scared! This beta version represents a v4 API which is seen as stable (after a less stable, mostly internal, alpha phase) but can still evolve before its official release if issues with it are spotted. Also, new `v3` releases with bug fixes, improvements and even features will still be made for the foreseeable future.

The goal of this first open beta release is too give you time to make the switch, ask questions, propose changes and report issues that you see with it.
Because we want to make the migration experience as painless as possible, we wrote [a complete migration guide, accessible in our documentation pages for the v4](XXX TODO).

As the changelog is here pretty big and thus less interesting to read. we moved it back at the end of the release note for this release only.
Also note that some of the changes made in this beta release will be brought in the next `v3.30.0` release. They also will be documented in the corresponding release note.

_Note: As this is not a stable release, installing/upgrading to it must generally be done explicity, either by adding the `rx-player@v4.0.0-beta.0` package through your package manager, by adding it through its `next` tag (which will point toward the last beta release), by explicitly specificying its version on your `package.json` file(s), or through other related techniques._


## A new player state: `"FREEZING"`

A new player state (gettable either through the `playerStateChange` event or the `getPlayerState` method) has been added: `"FREEZING"`.

It's important to note that this new new state does not characterize a new behavior, it only put a better word onto a specific problematic playback state. Previously, it was either reported as a `"BUFFERING"`, `"SEEKING"`, or even `"PLAYING"` state depending on the situation.

This state appears when playback is temporarily stuck in place, though in opposition to the more usual `"BUFFERING"`  and `"SEEKING"` state, this is not due to buffer starvation but to another, generally unknown, factor. As such, it can in most cases be handled just like a `"BUFFERING"` state in your application (e.g. by displaying a spinner on top of the media element) but it may be logged differently to help you pinpoint playback issues.

XXX TODO screenshot

Under that state, which is generally much rarer than a `"BUFFERING"` state for example, the RxPlayer will try various tricks to try to un-freeze playback. If they become too frequent or if those tricks don't work, it might be an issue worth investigating.


## A more flexible track API

One of the focus of this new major release was to improve the RxPlayer API on DASH multi-Period contents - which are contents with various set of tracks and Representations (qualities) depending on the time Period.

The RxPlayer's previous track API (e.g. `setAudioTrack` and `getAvailableAudioTracks`) only allowed to get the list and update the track for the currently-playing Period.
```js
// Example setting the first english audio track for the current Period if found
const availableAudioTracks = rxPlayer.getAvailableAudioTracks();
const englishAudioTrack = availableAudioTracks.find((track) => {
  return track.language === "eng";
});

if (englishAudioTrack !== undefined) {
  rxPlayer.setAudioTrack(englishAudioTrack.id);
}
```

The new track API, which is still compatible with the old one (meaning the old calls still work), now allows to set the track for any Period:
```js
// Example setting a french audio track for the first Period if found
// and an english track for the second (curious use case, but why not?)
const availablePeriods = rxPlayer.getAvailablePeriods();
if (availablePeriods.length >= 2) {
  const availableAudioTracks1 = rxPlayer.getAvailableAudioTracks(
    availablePeriods[0].id
  );
  const frenchAudioTrack1 = availableAudioTracks.find((track) => {
    return track.language === "fra";
  });

  if (englishAudioTrack1 !== undefined) {
    rxPlayer.setAudioTrack({
      trackId: englishAudioTrack1.id,
      periodId: availablePeriods[0].id,

      // Note: it's now also possible to set the switching mode per-track change
      switchingMode: "direct",

      // It's also possible to only authorize some Representations from being
      // played
      lockedRepresentations: englishAudioTrack1.representations
        .filter((representation) => {
          // Only authorize Dolby Digital+ Representations from this track
          return representation.codec === "ec-3";
        });
    });
  }

  const availableAudioTracks2 = rxPlayer.getAvailableAudioTracks(
    availablePeriods[1].id
  );
  const englishAudioTrack2 = availableAudioTracks.find((track) => {
    return track.language === "eng";
  });

  if (frenchAudioTrack1 !== undefined) {
    rxPlayer.setAudioTrack({
      trackId: frenchAudioTrack1.id,
      periodId: availablePeriods[1].id,
    });
  }
}
```
As you can see, the newer syntax allows more flexibility than the previous one. However it should be noted that the old syntax still work and still update the track for the currently-playing Period.


### Removal of the track preferences API

When associated with new RxPlayer events also added in this version, the new track API make the preferences API re-implementable in its entierity by an application.

Because of this, and after much thinking on our side, we decided to remove the track preference API from our `v4.0.0` even if we understand that it implies some work on your side to make the switch.

Don't worry the new track API is both easy to understand and more flexible than the set of methods and options that were part of the track preferences API. We also made [a complete preference migration guide here](XXX TODO), which includes code to completely replace the old preference API.

Do not hesitate to open an issue if you find that documentation not too clear or even if you're not OK with the removal of the old track preference API.
To be perfectly honest, we're still hesitating and we may bring it back in the future if it proves to have clear advantages. But for now, the new track API just seems more complete and simple for applications, which is why we're orienting you towards it.


## Improved Representation selection

Previous RxPlayer versions only allowed to specify allowed Representation(s) (i.e. qualities) by using bitrate-oriented API.
For example you could call `setVideoBitrate`, `setMaxVideoBitrate` and `setMinVideoBitrate` to either choose a Representation (the first one) or to reduce the ranges of Representations to choose from (the latter two).

In real-life, you might want instead to select Representation(s) based on other criterias.
Before you had to still rely on the bitrate to select it/them. Some other use cases, for example only allowing Representations with a specific `codec` property was also not always possible.

We chose to remediate to those issues in the v4 by providing a new API for Representation selection: the "Representation locking" family of API.
For example, the `lockVideoRepresentations` method allows to select which Representation for the current video track are allowed to play, the regular adaptive logic then choosing the more adapted between them. To lock a single Representation in place, you can just only communicate a single Representation's id to that method:
```js
// Example only playing the Representation with the lowest bitrate in the
// current video track

const videoTrack = rxPlayer.getVideoTrack();
if (videoTrack !== null && videoTrack !== undefined) {
  const lowestBitrate = videoTrack.representations.sort((a, b) => {
    // Put `undefined` bitrates at the end of the resulting array
    if (a.bitrate === undefined) {
          return 1; // Put `a` after `b`
    } else if (b.bitrate === undefined) {
      return -1; // Put `b` after `a`
    }
    // Sort ascending
    return a.bitrate - b.bitrate; // Put the higher bitrate after
  })[0];
  if (lowestBitrate !== undefined) {
    // Only play the lowest bitrate (or some Representation with an `undefined`
    // bitrate if none is defined).
    rxPlayer.lockVideoRepresentations([lowestBitrate.id]);
  }
}
```

There is a lot more to know on this API, see [the `lockVideoRepresentations` / `lockAudioRepresentations` documentation page](XXX TODO) to see all that is can do.

We rely on this new API to display a better quality selection in our demo page for example:

XXX TODO image comparisons

Sadly, we chose to remove the previous bitrate-related API to simplify the general API of the RxPlayer, considering that its behavior can be completely replaced by the new "Representation locking" methods.

Information on how to make the switch [is present in its own page](XXX TODO) in our [migration guide](XXX TODO)


## More expressive decryption options

We added and updated several decryption-reladed option, allowing to here also be more flexible in expressing how to play encrypted contents.

### `onKeyOutputRestricted` / `onKeyInternalError`

Two string properties imitating the already there `onKeyExpiration` API have been added:

  - [`onKeyOutputRestricted`](XXX TODO): allows to indicate the behavior the RxPlayer should have when encountering the `"output-restricted"`
[MediaKeyStatus](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus), like fallbacking to another quality or stopping with an error (the default)

  - [`onKeyOutputRestricted`](XXX TODO): allows to indicate the behavior the RxPlayer should have when encountering the `"internal-error "`
[MediaKeyStatus](https://www.w3.org/TR/encrypted-media/#dom-mediakeystatus), like here also fallbacking to another quality or stopping with an error (the default)

Because it allows more powerful configuration than the previous `fallbackOn` option, the latter has been removed.


### `persistentState` / `distinctiveIdentifier`

The `v4.0.0-beta.0` release adds two string properties to the `keySystems` option of `loadVideo`:

  - [`persistentState`](XXX TODO): Indicate if the CDM should be able to persist state. It actually reflects the [`MediaKeySystemConfiguration` property of the same name](https://www.w4.org/TR/2017/REC-encrypted-media-20170918/#distinctive-identifier), taking the same possible values.

  - [`distinctiveIdentifier`](XXX TODO): Incicate if the CDM can or even should use [distinctive identifiers](https://www.w3.org/TR/encrypted-media/#distinctive-identifier). Here also, this property reflects the [`MediaKeySystemConfiguration` property of the same name](https://www.w3.org/TR/encrypted-media/#distinctive-identifier).

Because, they allow the easy replacement of respectively the `persistentStateRequired` and of the `distinctiveIdentifierRequired` boolean properties of `keySystems`, both of those have been removed.

### `videoCapabilitiesConfig` / `audioCapabilitiesConfig`

Two `keySystems` properties [`videoCapabilitiesConfig`](XXX TODO) and [`audioCapabilitiesConfig`](XXX TODO) now allow to configure respectively the [`videoCapabilities`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-videocapabilities) and [`audioCapabilities`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration-audiocapabilities) properties of the asked [`MediaKeySystemConfiguration`](https://www.w3.org/TR/encrypted-media/#mediakeysystemconfiguration-dictionary).

Relatively powerful, this option allows to configure the asked codecs, robustnesses or both.
Like the other ones presented here, this option provokes the removal of the less powerful `videoRobustnesses` and `audioRobustnesses` undocumented options.


## Forced subtitles

_Note: this feature should also be ported to the future `v3.30.0` version._

Forced subtitles, also referred as forced narrative or just narrative subtitles are subtitles which are meant to be displayed by default when no other subtitle track is selected.

They allow to clarify audio or visual cues that might not be clear for the user, by providing text translation to:
  - clarification of audio when it is not clearly audible (for example due to a strong accent or due to distorted audio)
  - foreign - or even sometimes invented (e.g. klingon) - languages spoke in films
  - other types of communication which might not be easily understood (a frequent example would be sign language)
  - text in foreign languages present on the video track

XXX TODO IMAGE

In previous RxPlayer versions, forced subtitles were treated as any other type of text track, with no mean to identify them.
This version adds a new `forced` property to text tracks described through text tracks API (the `getAvailableTextTracks` and `getTextTrack` methods, the availableTextTracksChange` and `textTrackChange` events) to help you identify which text track is a forced one, as you most likely don't want to list it with other regular tracks:
```js
const textTracks = rxPlayer.getAvailableTextTracks();
const textTracksToDisplay = textTracks.filter(t => !t.forced);
```

Also, the RxPlayer will for now automatically select a forced text track by default (instead of no text track) if one is present for the same language than the audio track chosen by default.
This means that you might want to be careful if switching the audio track to also switch the text track if a forced one exist in that new language or if the old one is not adapted anymore.


## DASH `endNumber` attribute handling

_Note: this feature should also be ported to the future `v3.30.0` version._

The RxPlayer handled the DASH MPD's `startNumber` attribute around the time it added DASH support, which allowed to properly handle the huge majority of "Number-based" DASH MPD `\<SegmentTemplate\>` elements.
For example, let's consider the following MPD:

XXX TODO

XXX TODO check elements' escaping
The MPD in this screenshot indicates that for a time period going from the second `0` to the second `51` (respectively the attributes `start` and `duration` from the `\<Period\>` element), we have a number-based segment requesting scheme (`$Number$` in the `media` property of the `\<SegmentTemplate\>` element). Each segment represents 10 seconds of media content (`duration` attribute, after dividing it by the `timescale` one) with the exception of maybe the last one which may be shorter, as usual.
Here, we can also see that the first segment holds the number `1` (`startNumber` attribute) .

Based on all of this, the RxPlayer deduces that there are 6 segments, from the one holding the number `1` to one holding the number `6`:
  1. The first, holding the number `1`, from 0s to 10s
  2. The second, number `2`, from 10s to 20s
  3. from 20s to 30s
  4. from 30s to 40s
  5. from 40s to 50s
  6. from 50s to 51s (the end of the `\<Period\>` element)

However, it turns out that some contents do not provide all those assumed segments. For a concrete example, in our current scenario the 6th segment (the 1 second one) may not actually exist. In some other cases, we could even have the actual last segment's end at 45s for example - in the middle of the fifth segment - with no media data from that point on to the end of the Period.

When encountering those exceptions, the RxPlayer would previously still try to request the 6th segment multiple times, following the retry rules communicated through its API.

However, we found out that a `endNumber` attribute existed in the DASH specification (though it isn't yet in the generally more adopted DASH-IF IOPs). This attribute allows the MPD to communicate to the player the number of the last segment to request.
Taking the previous example, an MPD might indicate that there's only 5 segments to request instead by adding an `endNumber` attribute to `5`, like this:
XXX TODO image 2

This is now automatically handled by the RxPlayer.


## `updateContentUrls` API

_Note: this feature should also be ported to the future `v3.30.0` version._

Some applications recently introduced us to a new need: being able to change the Manifest's URL while the content is playing.
The URL would represent the same content, it's here just a change of URL in itself that is wanted. For example, a usage would be to switch from an overloaded CDN during playback or to change a token present in the URL.

The `v4.0.0` gives an answer to these needs by introducing a new method: `updateContentUrls`.
It allows to update the URL(s) of the Manifest, and even to trigger a manifest refresh directly, through a simple call:
```js
rxPlayer.updateContentUrls([newUrl], {
  // trigger the refresh immediately
  refresh: true,
});
```

As usual it has been properly documented [in its own documentation page](XXX TODO).

## For encrypted contents: `getKeySystemConfiguration` API

_Note: this feature should also be ported to the future `v3.30.0` version._

Encryption-related issues are the most frequent category of issues currently investigated by the RxPlayer team and its associated applications at least made by Canal+ and our partners.

In that context, we missed a crucial API allowing to facilitate encryption-related debugging on various platforms: One that would allow to indicate easily the current key system configuration relied on.

Particularly the robustness level: PlayReady SL3000 or SL2000? Widevine L1, L2 or L3? And so on.

That's why this release adds the `getKeySystemConfiguration` API which returns both the **actual** key system string and the
[`MediaKeySystemConfiguration`](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemconfiguration) currently relied on.

I put there an emphasis on "actual" because, in opposition to the `getCurrentKeySystem` API, which is now removed, it is [the name actually reported by the MediaKeySystemAccess](https://www.w3.org/TR/encrypted-media/#dom-mediakeysystemaccess-keysystem) that is here reported, whereas `getCurrentKeySystem` returned the exact same string than the `type` originally set on the `keySystems` option - an arguably less useful value when the RxPlayer could have made translations in between.

XXX TODO comparison?


## No dependency on RxJS in the RxPlayer source code anymore

_Note: this ""improvement"" should also be ported to the future `v3.30.0` version._

This is the end of an era for the RxPlayer's source code.

The RxPlayer previously depended heavily on RxJS, inspiring even its name, for most aspects where asynchronicity and/or message passing is wanted.
This library helped us greatly in building a complex media player with advanced features but it progressively appeared that its abstractions and specificities where also needlessly complexifying our code, making its maintenance more difficult, but also many times creating hard-to-debug issues.

This is not an attack on the RxJS library which is a fantastic piece of work both on the theoretical and on the practical side, but more of a realization than newer RxPlayer versions started to be big enough and complex enough than the opportunity cost of RxJS appeared not worthwile anymore: alternatives started to looked better due to the RxPlayer's evolution.

We're now both using the more usual JavaScript abstractions, like Promises and Event Emitters when it is sufficient and our own abstractions, simpler than RxJS Observables (like the `AbortController`-like `TaskCanceller`, allowing to cancel asynchronous tasks, and "Shared references", allowing to share and observe a values at several places), only when needed.

And because it's a recurrent question, yes, we for now decided to keep the name!

As for the impact of this removal for applications, it should be relatively minimal. You should in result see better call stacks when debugging issues and it fixes some minor issues, such as unnecessary warnings when using the `create-react-app` tool to build your application, or uncaught errors displaying in the console in some situations.
