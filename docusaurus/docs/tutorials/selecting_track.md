---
id: selectingTrack-tutorials
title: Selecting a track
sidebar_label: Selecting a track
slug: selecting-a-track
---

# Tutorial: Selecting a track

## The goal of this tutorial

The RxPlayer has an advanced API when it comes to track selection:

- You can list the available audio, video and/or text tracks and chose one of
  them

- You can disable the current video and / or text track

- You can also give to the RxPlayer a set of preferences so it can make the
  best choice by itself without manually having to choose the right track
  for every contents.

  Those preferences can even be applied retro-actively (for example, to the
  content currently being played), depending on your need.

Because the RxPlayer declares multiple APIs to allow those different use cases,
the track selection API can seem intimidating and confusing at first.

This tutorial will help you understand what your options are, why you would use
an API instead of another one and how to use them.

## What is a "track"?

We should first agree on what is a track, as a concept.

Let's take for example an italian film presented to an english-speaking
audience.

For that film, let's imagine those multiple "audio tracks":

- one being the original audio track, in italian
- one being a dub in the english language
- another in english with accessibility features such as an audio description
  of what visually happens in the film (for example, to give cues of what is
  happening to the visually-impaired).

There also could be multiple "text tracks":

- subtitles in english
- closed-captions in english (for example, for the hearing impaired)

And we could even imagine multiple video tracks:

- one displaying the "regular" film
- another displaying either the same film from a different camera angle (seems
  far-fetched here but let's just pretend we're talking about some kind of
  experimental film!)

All those will provide to the user a different way to offer the same film. They
even can technically be switched one independently of the other (though
restrictions on possible combinations can exist) to give a large number of
different experience for what is effectively the same content.

## Listing the available tracks

### Preamble

The RxPlayer does not "guess" the tracks available for a given content.
It usually finds every information about them in a specific file, called the
Manifest.

Thus, the list of available tracks will only be available once the RxPlayer has
loaded and parsed that Manifest.
Moreover, a Manifest can have several lists of available tracks depending on the
player's position (for example, a live channel with multiple programs might have
different audio languages available for different programs).

This means both that the available tracks won't generally be known just after a
`loadVideo` call and that it can then change at any time.

Thankfully, most of this complexity is abstracted by the RxPlayer API.

### Using methods

Once the RxPlayer has loaded the content (meaning the RxPlayer is not in the
`STOPPED`, `LOADING` or `RELOADING` [player state](../api/states.md)) you can
begin to ask it what is the current list of available tracks.

This can be done through three RxPlayer methods:

- [`getAvailableAudioTracks()`](../api/trackSelection/getAvailableAudioTracks.md)
  to list audio tracks
- [`getAvailableVideoTracks()`](../api/trackSelection/getAvailableVideoTracks.md)
  to list video tracks
- [`getAvailableTextTracks()`](../api/trackSelection/getAvailableTextTracks.md)
  to list text tracks

Those methods will all return arrays of objects, each object containing
information about a single track.

It should be noted that the information for an audio track won't be the same
than for a video or a text track.
For example, you might be interested by the height and width available in a
video track. Those notions make absolutely no sense for an audio track.

For more information about the structure of the data returned by those methods,
you can refer to their API documentation (a shortcut is available by clicking
on the method name).

Note that you can still ask for the current tracks when the RxPlayer does not
have loaded any content (is in the `STOPPED`, `LOADING` or `RELOADING` player
state), but you will most likely only get an empty array in those cases.

#### Examples

Those methods are straightforward, here are some examples of how they can be
used:

```js
// Array of all available audio languages
const availableLanguages = rxPlayer
  .getAvailableAudioTracks()
  .map((track) => track.language);

// List of audio tracks containing an audio description of what is visually
// happening
const audioDescriptionTracks = rxPlayer
  .getAvailableAudioTracks()
  .filter((track) => track.audioDescription);

// List of video tracks for which a profile with a 1080p resolution is available
const highResVideoTracks = rxPlayer
  .getAvailableVideoTracks()
  .filter((track) => {
    return track.representations.some(
      (representation) =>
        representation.height !== undefined && representation.height >= 1080
    );
  });

// List of text tracks available in french
const frenchTextTracks = rxPlayer
  .getAvailableTextTracks()
  .filter((track) => track.normalized === "fra");
```

### Using events

If you want to have the list of available tracks as soon as possible, it might
be a good idea to rely on the related events.

Here are the three events you will need to know:

- [`"availableAudioTracksChange"`](../api/events.md#availableaudiotrackschange):
  the list of available audio tracks was just updated

- [`"availableVideoTracksChange"`](../api/events.md#availablevideotrackschange):
  idem for video tracks

- [`"availableTextTracksChange"`](../api/events.md#availabletexttrackschange):
  idem for video tracks

All of those events will have the corresponding available tracks as a payload,
which will be the exact same data that what you would get when calling the
corresponding `getAvailable...Tracks` method at this point.

Note that no `available...TracksChange` event will be sent when the RxPlayer
stops the content or temporarly goes through the `RELOADING` player state,
despite the fact that in those cases there is no available tracks to choose
from.

Still, calling the `getAvailable...Tracks` methods in those cases will return
an empty array (as it should). This has to be considered.

#### Examples

Like any RxPlayer event, you will need to add an event listener for those:

```js
let currentAudioTracks = [];
let currentVideoTracks = [];
let currentTextTracks = [];

rxPlayer.addEventListener("availableAudioTracksChange", (audioTracks) => {
  console.log("New audio tracks:", audioTracks);
  currentAudioTracks = audioTracks;
});

rxPlayer.addEventListener("availableVideoTracksChange", (videoTracks) => {
  console.log("New video tracks:", videoTracks);
  currentVideoTracks = videoTracks;
});

rxPlayer.addEventListener("availableTextTracksChange", (textTracks) => {
  console.log("New text tracks:", textTracks);
  currentTextTracks = textTracks;
});
```

### Should you use the methods or events?

Both the exposed methods and events return the same data.

Whether you should rely on the former or on the latter will depend on what
corresponds the most to your codebase:

- if you want to fetch that list at a given point in time - such as when the
  user clicks on a button - it can be easier to just call the methods.

- if you want to know that list as soon as available and perform an action
  right after (such as selecting a track, displaying this list...), you might
  prefer relying on the events.

  Here you will also have to re-set that list yourself when the player has no
  content loaded anymore (in the `STOPPED`, `LOADING` or `RELOADING` player
  state).

## Knowing the current track

You might also want to know which track is the one currently selected.
There are several ways to do that.

### Through methods

The RxPlayer has a set of methods that just return the currently active tracks:

- [`getAudioTrack`](../api/trackSelection/getAudioTrack.md): return information
  on the current audio track

- [`getVideoTrack`](../api/trackSelection/getVideoTrack.md): return information
  on the current video track

- [`getTextTrack`](../api/trackSelection/getTextTrack.md): return information
  on the current text track

Those methods will return an object describing the attributes of the current
tracks.
They can also return `null` if no track has been enabled (for example, the user
could have wanted to disable all text tracks) and `undefined` if the track is
either unknown (which is a very rare occurence) or if no content is currently
playing.

Like the `getAvailable...Tracks` methods, the format of the objects returned
will entirely depend on which method you call. You can refer to the API
documentation to get more information on this.

Also like the `getAvailable...Tracks` methods, the current text track will
usually only be known once the RxPlayer has loaded a content (which means we are
not in the `STOPPED`, `LOADING` or `RELOADING` [player state](../api/states.md)). If no content is loaded, those APIs will just return
`undefined`.

#### Examples

Here is an example on how you could use them:

```js
const currentTextTrack = rxPlayer.getTextTrack();
if (currentTextTrack === null) {
  console.log("No text track is enabled");
} else if (currentTextTrack === undefined) {
  console.log(
    "We don't know the current text track. " +
      "Are you sure a content is loaded?"
  );
} else {
  const language = currentTextTrack.language;
  console.log("We have a current text track in the " + language + "language");
}
```

### Through events

Exactly like you would obtain the list of available tracks through the
`available...TracksChange` events, you can know when the current track change as
soon as possible through the following events:

- [`"audioTrackChange"`](../api/events.md#audiotrackchange):
  the currently-active audio track changed

- [`"videoTrackChange"`](../api/events.md#videotrackchange):
  the currently-active video track changed

- [`"textTrackChange"`](../api/events.md#texttrackchange):
  the currently-active text track changed

Those events just emit the current track information as soon as it changes, in
the same format that the `get...Track` methods.

Unlike for the `get...Track` methods however, its payload cannot be set to
`undefined`: you won't receive any `...TracksChange` event if the track is
unknown or if there is no content.

This also means that you won't have any event when the RxPlayer stops or
re-load the current content, despite the fact that you don't have any current
track in that case.
Calling the `get...Track` method in those cases will return `undefined`, as it
should. This has to be considered.

#### Example

Like for any events, you will have to register an event listener:

```js
rxPlayer.addEventListener("textTrackChange", (track) => {
  if (track === null) {
    console.log("No text track is active");
  } else {
    console.log(
      "new active text track in the following language: " + track.language
    );
  }
});
```

### Through the list of available tracks

As written earlier the `available...TracksChange` events and the
`getAvailable...Tracks` methods both return arrays of objects, each object
defining a single track.

In each of those object, you will find an `active` boolean property, which will
be set to `true` if the track is the currently chosen one and `false` otherwise.

Note that it's possible that none of the available tracks are active. This is
for example the case when the track has been disabled (for example when the user
wants no text tracks at all).

```js
// get the active audio track through `getAvailableAudioTracks`
const activeAudioTrack1 = rxPlayer
  .getAvailableAudioTracks()
  .find((track) => track.active);

// get the active audio track through `availableAudioTracksChange`
let activeAudioTrack2;
rxPlayer.addEventListener("availableAudioTracksChange", (tracks) => {
  activeAudioTrack2 = tracks.find((track) => track.active);
});
```

### Which one to use?

As usual here, this is highly dependant on your application. All of those APIs
give the same information through different means.

Accessing with the `get...Track` method is simple to use, the events allow to
know at the earliest possible time and relying on the list of available tracks
can simplify your code if you want both of them.

## Selecting a track

Now that we have the list of available tracks and the current one, we might want
to choose another one, or let the final user choose another one.

To do that, you will have to use one of those three RxPlayer methods:

- [`setAudioTrack()`](../api/trackSelection/setAudioTrack.md): change the current
  audio track
- [`setVideoTrack()`](../api/trackSelection/setVideoTrack.md): change the current
  video track
- [`setTextTrack()`](../api/trackSelection/setTextTrack.md): change the current
  text track

Each of those methods take a single string as argument. That string should be
the value of the `id` property of the chosen track.

For example, to choose the first audio track with an audio description, you can
do:

```js
const firstAudioTrackWithAD = rxPlayer
  .getAvailableAudioTracks()
  .find((track) => track.audioDescription);

if (firstAudioTrackWithAD !== undefined) {
  rxPlayer.setAudioTrack(firstAudioTrackWithAD.id);
}
```

It's important to consider that those APIs only allow to change the current
track and will have no impact on the other contents you will encounter in the
future.

Depending on your application, you might also want to set a global preference at
some point, such as saying that the final user will prefer english audio
tracks for now on.

Although `setAudioTrack` can be used for this use case - by just setting an
english audio track every times the available audio tracks list change (we can
know that through the `availableAudioTracksChange` event) - it is much more
efficient and less cumbersome to use audio track preference APIs for that.
Those will be described later in this tutorial, so stay with me!

After manually setting a track through the `set...Track` methods, you will
receive the corresponding `...TrackChange` event when the change is applied.

Note that on some contents, changing a track from a given type might
automatically also change the current track for another types. For example,
switching to another audio language might also automatically turn on the
subtitles. This is because some streaming protocols might "force" some
combination.

To detect those cases, you can either listen to every `...TrackChange` events
or call the corresponding `get...Track` method everytime you want to use them.

## Disabling a track

Now what if you want no track at all?

This is for example a frequent need for text tracks, where you might prefer to
have no subtitles or closed captions appearing on the screen.

You could also want to disable the video track, which is a trick often used to
reduce the network bandwidth used by a content.

You can disable respectively the current text track and the current video track
by calling those methods:

- [`disableTextTrack`](../api/trackSelection/disableTextTrack.md)
- [`disableVideoTrack`](../api/trackSelection/disableVideoTrack.md)

However, like for selecting a track, this only concerns the current content
being played. When playing a new content or even when just switching to another
part of the content with a different track list, you might need to re-do the
same method call.

This is problematic most-of-all when disabling the video track, as going in and
out of that usually requires a short but visible "re-loading" step by the
RxPlayer. You want thus to limit the need to call `disableVideoTrack` every
times a new content is encountered.

Thankfully, the RxPlayer has another set of API to let you choose a track even
for future contents: the "track preferences APIs".

## Track preferences APIs

All methods and events discussed until now only have an effect for the current
content being played.

This has multiple disadvantages:

- that code has to be run each time a new content is loaded (and each time the
  track list changes, if there are multiple track lists for a single
  contents).

- it is inefficient:
  In some cases the RxPlayer pre-load new content to allow a smooth transition
  between the current content and that new one.
  To do that, it chooses a track itself and begin to download it.

  If when reaching the new content a totally other track is finally chosen,
  we might have wasted network bandwidth for nothing as we would have to
  re-download a completely different track.

  Even more important, the transition won't be smooth at all because we
  will have to stop to build some buffer with the wanted track instead.

Thankfully, there exists another set of APIs we call the "track preferences".

With those, you can tell the RxPlayer that you might always prefer the audio
track to be in english - for example - or that you would prefer the video track
to be in a given codec.

Bear in mind that track preferences APIs are for a different use case than the
classic track selection APIs:

- the "classic" track selection APIs are here to select a precize track
  amongst available ones.

  This is probably the APIs you will use when displaying a list of available
  tracks to the final user and choosing one.

- the track preferences APIs give hints of what the finally user generally
  wants, so that the right track is automatically chosen by the RxPlayer. It
  is also useful for optimizations such as when pre-loading the next content.

  This is the APIs you will use in most other use cases, where you want to
  give the general track settings the user wants to the RxPlayer.

The track preferences can be set in two manners:

1. During instanciation of the RxPlayer
2. At any time, through specific methods

### Setting a track preference on instanciation

There are three options you can give to the RxPlayer on instanciation to set the
track preferences:

- [`preferredAudioTracks`](../api/player_options.md#preferredaudiotracks):
  set the preferences for the audio tracks
- [`preferredTextTracks`](../api/player_options.md#preferredtexttracks):
  for the text tracks
- [`preferredVideoTracks`](../api/player_options.md#preferredvideotracks):
  for the video tracks

You can click on the name of the option to be redirected to its corresponding
API documentation.

Each of those take an array of object which will define which track you want the
RxPlayer to choose by default.

As a simple example, to choose french audio tracks without audio description by
default you could do:

```js
const rxPlayer = new RxPlayer({
  preferredAudioTracks: [{ language: "fra", audioDescription: false }],
});
```

Because not all contents could have a track matching that preferences, you can
add even more elements in that array. For example, if you want to fallback to
english if no french audio track is found you can do:

```js
const rxPlayer = new RxPlayer({
  preferredAudioTracks: [
    { language: "fra", audioDescription: false },
    { language: "eng", audioDescription: false },
  ],
});
```

Here, the RxPlayer will enable a french audio track if it finds one, but if it
does not, it will enable the english one instead.

If none of your preferences is found for a given content, the RxPlayer will
choose the content's default (or first, if no default is announced in the
content) track itself.

Those options allow much more powerful configurations. You can refer to the API
documentation for that.

### track preferences methods

You can also update at any time those track preferences - even when no content
is playing - by calling the following methods: - [`setPreferredAudioTracks`](../api/trackSelection/setPreferredAudioTracks.md):
update the audio preferences - [`setPreferredTextTracks`](../api/trackSelection/setPreferredTextTracks.md)
update the text preferences - [`setPreferredVideoTracks`](../api/trackSelection/setPreferredVideoTracks.md)
update the video preferences

Those methods mostly work the same way than the constructor options. You give
them an array of the wanted track configurations and the RxPlayer will try to
choose a track that match with the earliest possible configuration in that
array:

```js
rxPlayer.setPreferredAudioTracks([
  { language: "fra", audioDescription: false },
  { language: "eng", audioDescription: false },
]);
```

But there's another element to consider here.
When calling the method (unlike when giving an option to the constructor), the
RxPlayer may already be playing a content. So here, there's a dilemma:

- should the RxPlayer apply the new preferences to the current content? It
  could, but it might be unexpected if a track chosen explicitely by the user
  for the current content changes because it does not match the preferences.

- or should the RxPlayer only apply it to new contents? In that case, it could
  also be an unexpected behavior.
  Especially for contents with multiple track lists - here you could inversely
  want your new preferences to be considered when seeking back to an
  already-played content.

There's no good answer here, it all depends on the implementation you want to
do.

Because of that, those methods all can take a boolean as a second argument.
When this second argument is set to `true`, the RxPlayer will also apply that
preference to the already-loaded content:

```js
// disable the text tracks from every contents - the current one included
rxPlayer.setPreferredTextTracks([null], true);
```

If not set or set to `false`, it will only be applied for content that have not
been loaded yet.

```js
// Only disable the text tracks from the next encountered contents.
rxPlayer.setPreferredTextTracks([null]);
```

### Obtaining the last set preferences

The RxPlayer also has three methods which will return the last set preferences:

- [`getPreferredAudioTracks`](../api/trackSelection/getPreferredAudioTracks.md):
  return the audio preferences
- [`getPreferredTextTracks`](../api/trackSelection/getPreferredTextTracks.md):
  return the text preferences
- [`getPreferredVideoTracks`](../api/trackSelection/getPreferredVideoTracks.md):
  return the video preferences

The format of the returned array will be the exact same than the array given to
the corresponding `setPreferred...Tracks` method (or the value of the
`preferred...Tracks` constructor option if the method was never called - or
just an empty array by default when neither was used).

## What set of APIs should you use

The "classic" track selection APIs (`getAvailable...Tracks`, `get...Track` and
`set...Track`) are the APIs you should use when explicitely exposing the current
available tracks and selecting one precizely.

The track preferences APIs should be used for anything else.

This is because the track preferences APIs allow to completely move the task
of selecting a track out of your code and into the RxPlayer and will allow
some optimizations to take place.

The "classic" track selection APIs still allow to make a much more precize
choice and allow to know which tracks are currently available.
Due to that, they are a perfect fit when you want to propose a track choice menu
to the final user.

## Notes about the "textTrackMode" option

This tutorial was focused on track selection but there's still a last point I
want to approach, which is how subtitles will be displayed to the user.

By default, text tracks will be displayed through `<tracks>` elements which
will be contained in the media element where the content plays.
This allows to display subtitles but may not be sufficient when wanting to
display richer subtitles (such as closed-captions).

This is why the RxPlayer has a
[`textTrackMode`](../api/basicMethods/loadVideo.md#texttrackmode) concept.

By setting the `textTrackMode` to `"html"` in a
[`loadVideo`](../api/basicMethods/loadVideo.md) call, you will be able to profit
from much richer subtitles than what you could have by default.
If you do that, you also need to set the
[`textTrackElement`](../api/basicMethods/loadVideo.md#texttrackelement) property
to an HTML element, that the RxPlayer will use to display subtitles into.

More information on those options can be found in the RxPlayer API.
