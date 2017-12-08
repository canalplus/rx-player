# The Stream

## Overview

Even if the API is the front-facing block of code in the Rx-player, the Stream is the part of the code actually doing most logic behind playing a content.

Its code is written in the ``src/core/stream`` directory. More specifically, all needed code should be
exported by its "index file" ``src/core/stream/index.ts``.

The API is just a higher, object-oriented, layer for easier library interactions.

Every times you're calling the API to load a new video, the Stream function is called
by it with a handful of arguments.

The Stream does then the major part of the job and communicate back its progress to the
API through events.

```
                 +-----------+
 1. LOAD VIDEO   |           |      2. CALLS
---------------> |    API    | -------------------+
                 |           |                    |
                 +-----------+                    |       
                       ^                          v
                       |                    +--------------+
                       |   3. EMIT EVENTS   |              |
                       +------------------- |    STREAM    |
                                            |              |
                                            +--------------+
```

Basically, the job of the Stream is to:
  - initialize the content (creating the MediaSource and SourceBuffers, downloading the manifest)
  - Connect and manage most core parts of the player together, such as adaptive streaming, segment downloads, DRMs...

As such, during the various events happening on content playback, the Stream will create / destroy / update various player blocks. Such example of blocks are:
  - Adaptive streaming management
  - DRM management
  - Buffer management
  - Manifest refreshing management
  - ...

## Usage

Concretely, the Stream is a function which returns an Observable. This Observable:
  - will automatically play the described content on subscription
  - will automatically stop and clean-up infos related to the content on unsubscription
  - communicate on various events through emitted objects.
  - throw in the case of a fatal error (error interruption playback)

### Communication API \<-\> Stream

Objects emitted by the Observable is the only way the Stream should be able to communicate
with the API.

The API is then able to communicate back through observables, either:
  - given as arguments when the Stream function was called
  - given by the Stream itself as a payload of one of its event

Thus, there is three ways the API and Stream can communicate:
  - API -> Stream: When the Stream function is called (so a single time)
  - Stream -> API: Through events emitted by the returned Observable
  - API -> Stream: Through Observables the Stream is in possession of (either since the initial call or since an event has been sent)

### Emitted Events

Events allows the Stream to reports milestones of the content playback, such as when the content has been loaded.

It's also a way for the Stream to communicate informations about the content and give some controls to the user.

For example, as available audio languages are only known after the manifest has been downloaded and parsed, and as it is most of all a user preference, the Stream can emit to the API RxJS Subjects allowing the API to "choose" at any time the wanted language.
