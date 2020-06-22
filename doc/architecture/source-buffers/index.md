# The SourceBuffers ############################################################


## Overview ####################################################################

The ``core/source-buffer`` directory contains the part of the code directly
related to the insertion and removal of media segments.

This is done through `SourceBuffers`, which are JavaScript objects.

The name is taken from the MSE SourceBuffer[1] JavaScript object, which are the
native browser interface through which media segments are pushed.

In the RxPlayer, those SourceBuffer objects are only used for audio and video
decoding. For the other types of media (e.g. text - for subtitles - and
image - for thumbnails), custom SourceBuffer implementation have been written
entirely in JavaScript instead, to allow more advanced treatment of those.

Those custom SourceBuffer implementation are defined in the
`src/custom_source_buffers` directory.

[1] [MSE SourceBuffer](https://www.w3.org/TR/media-source/#sourcebuffer)

Here's a vulgarized architecture schema of the code in that directory:
```
   +--------------------------------------------------------------------------+
   |                        Rest of the RxPlayer's code                       |
   +--------------------------------------------------------------------------+
                                |       ^
  Ask to get / create / remove  |       | Returns created QueuedSourceBuffer or
  SourceBuffer for a given type |       | wanted information
  or get information about the  |       |
  available types               |       |
                                |       |
                                V       |
   +--------------------------------------------------------------------------+
   |                             SourceBuffersStore                           |
   +--------------------------------------------------------------------------+
          |                  |                  |                 |
          | creates          | creates          | creates         | creates
          | (if needed)      | (if needed)      | (if needed)     | (if needed)
          |                  |                  |                 |
          V                  V                  V                 V
   +------------+     +------------+     +------------+     +------------+
   |   Queued   |     |   Queued   |     |   Queued   |     |   Queued   |
   |SourceBuffer|     |SourceBuffer|     |SourceBuffer|     |SourceBuffer|
   |  (video)   |     |  (audio)   |     |   (text)   |     |  (image)   |
   +------------+     +------------+     +------------+     +------------+
   Creates   |        Creates   |        Creates   |        Creates   |
      |      |           |      |           |      |           |      |
      |      |           |      |           |      |           |      |
      V      V           V      V           V      V           V      V
  +-----+ +------+   +-----+ +------+   +-----+ +------+   +-----+ +------+
  | SI* | | NSB* |   | SI* | | NSB* |   | SI* | | TSB* |   | SI* | | ISB* |
  +-----+ +------+   +-----+ +------+   +-----+ +------+   +-----+ +------+

  SI*: SegmentInventory. Store the information on every segments currently
       available in the associated SourceBuffer.

  NSB*: Native [browser implementation of a] SourceBuffer.

  TSB*: Text SourceBuffer (either HTMLTextSourceBuffer or
        NativeTextSourceBuffer depending on the current textrack mode chosen.).
        Custom SourceBuffer implementation for subtitles which handle the logic
        of storing subtitles and displaying them at the right time and with the
        right style (color, position etc.).

  ISB*: ImageSourceBuffer. Custom SourceBuffer implementation for image
        thumbnails which will just store them.
```



## SourceBuffersStore ##########################################################

The ``SourceBuffersStore`` is the main export from there. It facilitates the
creation and destruction of SourceBuffers.

Its roles are to:

  - announce which types of SourceBuffer can be currently created on the
    HTMLMediaElement (example of a type of buffer would be "audio", "video" or
    "text").

    For example, no "video" SourceBuffer should be created on an `<audio>`
    element (though it wouldn't cause any problem, it would be useless
    as video cannot be rendered here). To give another example, you should not
    create a "text" SourceBuffer if no text track parser has been added to the
    RxPlayer.

  - Create only one `QueuedSourceBuffer` instance per type of buffer.

    Multiple `QueuedSourceBuffer` for a single type could lead to browser issues
    and to conflicts in the RxPlayer code.

  - Provide a synchronization mechanism to announce when all "native"
    SourceBuffers are ready to receive segments. I'll explain:

    "Native" SourceBuffers are SourceBuffers directly implemented by the
    browser. They typically are the "video" and "audio" SourceBuffers.

    Among several other constraints, all native SourceBuffers needed to play a
    given content should be created before we can start pushing segments to any
    of them. This is a browser limitation.

    This is where this synchronization mechanism can become useful. The
    SourceBuffersStore will signal when all of the native SourceBuffers needed
    for the given contents are created, so that the rest of the RxPlayer knows
    when it can begin to push segments to those.

    Note that this means that un-needed SourceBuffers have to be explicitely
    "disabled" here, as the SourceBuffersStore cannot know whether it should
    wait until those SourceBuffers are created of if you just don't need it.



## QueuedSourceBuffer ##########################################################

A ``QueuedSourceBuffer`` is a wrapper on top of a ``SourceBuffer`` (a native one
or a custom RxPlayer implementation) that allows to push and remove segments
sequentially.
Basically, it waits for the previous action to be finished before going on the
next step.

It also keeps an inventory of all segments currently contained in it, with the
help of a `SegmentInventory` (see corresponding chapter).

It is the main interface the rest of the RxPlayer code has with SourceBuffers.



## BufferGarbageCollector ######################################################

The BufferGarbageCollector is a function used by the RxPlayer to
periodically perform "garbage collection" manually on a given
`QueuedSourceBuffer`.

It is based on the following building bricks:

  - A clock, which is an observable emitting the current time (in seconds) when
    the garbage collection task should be performed

  - The QueuedSourceBuffer on which the garbage collection task should run

  - The maximum time margin authorized for the buffer behind the current
    position

  - The maximum time margin authorized for the buffer ahead of the current
    position

Basically, each times the given clock ticks, the BufferGarbageCollector will
ensure that the volume of data before and ahead of the current position does not
grow into a larger value than what is configured.

For now, its code is completely decoupled for the rest of the code in that
directory. This is why it is not included in the schema included on the top of
this page.



## The SegmentInventory ########################################################

The ``SegmentInventory`` keeps track of which segments are currently bufferized
to avoid unnecessary re-downloads.

You can have more information on it in [the SegmentInventory
documentation](./segment_inventory.md).
