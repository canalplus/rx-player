# Preloading Architecture

_Date of last update: 2025-02-03_

This is a document describing the architecture choosen to allow "content preloading",
which is an advanced feature in some MSE players where a future content is loaded before
being actually played to lower the time it will take once the user want to play that
content.

It can be used as a mechanism to improve loading performance when we're very confident
that the user will play a content - yet we don't want to play it on the media element yet,
or it may also be used to accelerate the transition between contents that will be played
on the same media element (advertisement cuts, switching between episodes of a TV serie
etc.).

As a supplementary goal, it may be used explicitely by an application through an RxPlayer
`API` or implicitely through an adaptive streaming technology mechanism that could profit
from it (e.g. "interstitial" systems, MPD chaining etc.).

## Preloading high level behavior

After playing with multiple strategies, we for now chose to implement "preloading" by
loading that content's media segments directly in JS memory (instead of pushing them to
the lower-level browser's buffers). When/if the application then wants to actually load
the content, we will push all of that stored data on the actual browser's buffers linked
to the `HTMLMediaElement` (which is itself linked to the current RxPlayer instance).

_An alternative solution that was studied was to preload and load all contents on the same
`HTMLMediaElement`. Though it could lead to better performance (i.e. a simple seek to
switch content is generally much faster than initializing all MSE API and then feeding it
data), we decided to abandon that solution for now because of fears of compatibility
issues._

We also postpone some API calls, such as encryption-related ones, for when the content is
actually played to increase device compatibility. This even though those
encryption-related exchanges may themselves take time and even though they also can lead
to multiple licence requests at once when the content is finally played.

## RxPlayer API for preloading

### Starting/Stopping a preload

An application can ask for a content to be preloaded through a `preloadVideo` API, which
will return a `contentId` identifier.

That API can be called multiple times for various contents, to preload all them
simultaneously, though it should be noted that there may be memory, performance, and
bandwidth-related issues if pre-loading too much contents at once. This last point is for
now considered as a problem left for the application, though we may provide improvements
to help them with those points in the future as those are not subjects they're usually
exposed to.

An application can then actually load a preloaded content at any time by calling the
`startPreload` API, which will stop the previous loaded content if one, but none of the
potential other preloads.

To stop preloading content, a `stopPreload` API was added. Also a `clearPreload` API was
added to allow an application to stop all preloads it has started.

### Track and quality selection

All track-related API (`setAudioTrack`, `getAvailableVideoTracks` etc.) and
representations-related API (`lockVideoRepresentation` etc.) now also accept an optional
`contentId` in which case they apply to the preload concerned.

### Preload events

## Changes done for that new behavior

One of the key design strategy we followed for content preloading was that that
rarely-used feature should not greatly decrease the readability of the RxPlayer's
architecture.

With that in mind from the perspective of the RxPlayer's inner code, the main differences
between a content that is pre-loading and a content that is actually loading is that:

1. the pre-loading content doesn't have an `HTMLMediaElement` (e.g. the `<video>` tag)
   yet, though it will have one if we ever play it.
2. its `MediaSource` is not yet "ready" (the main object in the MSE group of API, which
   allows to feed media data programatically to an `HTMLMediaElement`),
3. and as such `SourceBuffer`s (MSE media buffers) cannot yet be added.

### Working around not having the `HTMLMediaElement` when pre-loading

As the `HTMLMediaElement` is only playing the content when actually loading, not
pre-loading, we decided the following modifications:

1. For a few modules, they now can function with **AND** without an `HTMLMediaElement`
   yet. In the cases where an `HTMLMediaElement` hasn't been provided to it yet, they
   behave in a not-yet-ready state as if an `HTMLMediaElement` will be provided to it in
   the future.

   For example, the two `ITextDisplayer` implementations will store but not display on
   screen subtitles synchronized with the media element until... a media element has
   actually been provided through its `attachMediaElement` method (which may be called
   when/if the application finally decide to actually load that preload).

   Likewise, a `MediaElementPlaybackObserver` will just advertise about the default
   initial position until an actual `HTMLMediaElement` has been provided here also though
   an `attachMediaElement` method.

2. For most other cases, we removed direct usage of the `HTMLMediaElement` to prefer using
   the `MediaElementPlaybackObserver` instead, which is already intrinsically linked to
   the `HTMLMediaElement`.

   We then added to the `MediaElementPlaybackObserver` a method called
   `onMediaElementAttachment` which allows to register a callback that will be called once
   the `HTMLMediaElement` has been attached to it (or called immediately and synchronously
   if it is already the case). This is what those other modules can rely on to declare
   logic relying on the media element.

### Working around not having `SourceBuffer` objects

`SourceBuffer` are very important here because preloading is all about loading in advance
media segments and because under the RxPlayer's "normal" (i.e. "loading", not
"preloading") behavior, media segments are immediately pushed to their `SourceBuffer`
after loading them (with the RxPlayer preferably not keeping an in-memory reference to
that huge chunk of data).

To be more exact, the RxPlayer most often do not use `SourceBuffer` objects directly, it
uses multiple abstractions to reach them :

1. the `SourceBufferInterface` abstraction which provides a more sensible API
   (promise-based methods instead of the older-school event-based API `SourceBuffer`
   objects have, queue system abstracted instead of exposed to the application) yet which
   stays roughly at the same functional level than a `SourceBuffer`: it serves the same
   purpose - adding and removing media data from lower-levels buffers - and do no more.

2. At a higher level, `SourceBufferInterface` are then used by the `SegmentSink`
   abstraction.

   They implement multiple features to facilitate the usage of those buffers: an
   `inventory` of the currently-pushed segments' metadata, it has an history system of
   recent operations, pending operations that have not yet finished can be inspected and
   other higher-level niceties.

   It is then `SegmentSink` that are used by most of the RxPlayer's modules.

#### `DummySegmentSink`

The solution I proposed here is to add another `SegmentSink` implementation: the
`DummySegmentSink`.

Instead of relying on a `SourceBufferInterface`, a `DummySegmentSink` just stores all its
operations in memory (through a simple JS array).

A `DummySegmentSink` also has a `getStoredData` method allowing to get the list of all
operations that were scheduled to it. When a preloaded content is actually loaded, the
`getStoredData` method is called and its return value is then fed to the "real"
`SegmentSink` ("real" as in: actually linked to a `SourceBufferInterface`).

_NOTE: that trick is actually performed by the `SegmentSinksStore`, a class helping the
RxPlayer to handle the `SegmentSink` from the various type of synchronized media: audio,
video and text._

_NOTE2: There are some "smart" tricks performed by a `DummySegmentSink` to free segments
from JS memory if they appear to completely overwrite previous segments that were
previously pushed._

### Working around not having a ready `MediaSource`

Under normal ("loading") conditions, we create a `MediaSource` object almost immediately
after the `loadVideo` API is called, attach it to the `HTMLMediaElement` and then wait for
that `MediaSource`'s `readyState` property to switch to `"open"`. All this so we can then
create `SourceBuffer` and start playing.

We cannot link a `MediaSource` to the `HTMLMediaElement` when preloading though. To
work-around this, the `Core` part of the RxPlayer is now also aware that an
`HTMLMediaElement` may not be available right away, and thus has separate initialization
logic for when none is available yet.

When it knows that no `HTMLMediaElement` is available, the `core` won't create the
`MediaSource` yet and just create a `SegmentSinksStore` without one. The
`SegmentSinksStore` then understand that it should create `DummySegmentSink` for the time
being until a `MediaSource` is attached to it through its `attachMediaSource` method -
which will happen when actually loading as the `HTMLMediaElement` will then be anounced as
available.

Signalment of whether an `HTMLMediaElement` is available is done through the usual
message-based API

## Memory concerns

Considering we already have memory-related concerns on many devices (especially some smart
TV and set-top boxes), enabling a preload feature on them seems for now a little
ambitious: instead of loading a single content and having trouble doing so, we may here
not only load a content but also pre-load the future one at the same time.

This is something I had in mind when doing the implementation, and the end goal is to
allow the preloading feature to be enabled even on those devices. The key factor we may
want to consider here is how easy it will be to integrate that notion with the current
preloading implementation. I saw multiple possible compatible ways (e.g. synchronizing
options like `maxVideoBufferSize` so it also consider preloads could seem logical) but did
not do anything in that sense yet to keep the initial implementation """"simple"""".

## Can this work be reused for a content downloading feature

As I know there is some long term need for this, both at Canal+ and from outsiders, and as
it may seem similar to a downloading concept (as when preloading, contents are also loaded
for later), I thought that I add to add this part to this documentation.

The answer is: I don't think so.

For downloads, the solution found by other implementation we've seen have many key
differences:

- they favor the highest compatible media quality without network bandwidth
  considerations, where content preloading starts from the idea that playback will soon
  start and thus act like our regular playback logic on that point

- for downloaded contents, playback will most often start later, in a different browsing
  session and thus in a different RxPlayer instance. In contrast with "preloading" where
  preloading and actually playing are usually close in time to each other and are always
  on the same RxPlayer instance.

  The current preloading solution proposed is basically about handling a "not-yet-playing"
  mode, where the media element can then be "hot-swapped" (well, "hot-inserted") to enable
  actual playback on the current RxPlayer instance.

  This also means that all modules handling playback-related issues are in-place (and
  there's a LOT of them) because they might be imminently-needed, though this is just
  added complexity in a context where the content will not be actually played in that same
  session.

Because of those, I actually think that having a separate code path/architecture for
content downloading than for content loading and preloading would be easier to follow and
maintain (though we know some people do not believe us on this :p!). Most advanced
features worked-around here (`SegmentSink` inventories, `HTMLMediaElement` usage etc.) are
not needed at all for content downloading because they are linked to content playback.

The main logic of content downloading seem actually easier to implement than what we're
doing here, the complexities we had at the time of our first attempts (at implementing
content downloading) were mostly linked to device compatibility with some advanced
features (e.g. available long-term storage API on some devices, persistent licence
implementation) and all the necessary code around the inevitable downloading-specific
issues (no space left on storage, async suppression of downloaded contents that may be
interrupted by the user closing the page etc.).

Adding those orthogonal complexities linked to content downloading on top of the
preloading API would complexify the "regular" code for in my opinion no real gain.
Re-using in a separate location loading-related modules (`segmentFetcher`,
`manifestFetcher`) and the manifest parser seems much easier to implement.
