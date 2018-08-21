# The Stream ###################################################################


## Overview ####################################################################

Even if the API is the front-facing block of code in the Rx-player, the Stream
is the part of the code actually starting the logic behind playing a content.

Its code is written in the ``src/core/stream`` directory. More specifically,
all code needed in the rest of the code should be exported by its "index file"
``src/core/stream/index.ts``.

Every times you're calling the API to load a new video, the Stream function is
called by it with a handful of arguments.

The Stream does then the major part of the job and communicate back its progress
to the API through events.

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

  - initialize the content (creating the MediaSource, downloading the manifest)

  - Connect most core parts of the player together, such as adaptive
    streaming management, segment pipelines, DRMs, speed management...

  - Call with the right argument the PeriodBufferManager, which will download
    and push segment to be decoded by the browser.

As such, during the various events happening on content playback, the Stream
will create / destroy / update various player blocks. Such example of blocks
are:

  - Adaptive streaming management

  - DRM management

  - Manifest loading, parsing and refreshing

  - Buffer management

  - ...



## Usage #######################################################################

Concretely, the Stream is a function which returns an Observable.
This Observable:

  - will automatically load the described content on subscription

  - will automatically stop and clean-up infos related to the content on
    unsubscription

  - communicate on various streaming events through emitted notifications

  - throw in the case of a fatal error (error interruption playback)


### Communication between the API and the Stream ###############################

Objects emitted by the Observable is the only way the Stream should be able to
communicate with the API.

The API is then able to communicate back to the Stream, either:

  - by Observable provided by the API as arguments when the Stream function was
    called

  - by emitting through Subject provided by the Stream, as a payload of one of
    its event

Thus, there is three ways the API and Stream can communicate:

  - API -> Stream: When the Stream function is called (so a single time)

  - Stream -> API: Through events emitted by the returned Observable

  - API -> Stream: Through Observables/Subjects the Stream is in possession of.


### Emitted Events #############################################################

Events allows the Stream to reports milestones of the content playback, such as
when the content has been loaded.

It's also a way for the Stream to communicate informations about the content and
give some controls to the user.

For example, as available audio languages are only known after the manifest has
been downloaded and parsed, and as it is most of all a user preference, the
Stream can emit to the API RxJS Subjects allowing the API to "choose" at any
time the wanted language.



## The SpeedManager ############################################################

The SpeedManager is the part of the Stream updating the playback speed of the
content.

Playback speed can be updated on two occasions:

  - the API set a new Speed (``speed$`` Observable).

  - the content needs to build its buffer.

    In which case, the playback speed will be set to 0 (paused) even if the
    API set another speed.
    The regular speed will be set when enough buffer is available.



### The StallingManager ########################################################

The StallingManager listens to various browser events and properties to detect
when the player is "stalled" (i.e. stuck on the current position).

It then try to adopt a strategy to easily get out of this situation if it can.
