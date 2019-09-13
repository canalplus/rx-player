# The SourceBuffers ############################################################


## Overview ####################################################################

The ``core/source-buffer`` directory contains the part of the code directly
related to the insertion and removal of media segments.

This is done through `SourceBuffers`, which are JavaScript objects.

Some `SourceBuffers` are directly defined by the browser like the audio and
video ones. Others, like for subtitles for example, are defined by the RxPlayer.
Those custom `SourceBuffers` definitions are written in the
`src/custom_source_buffers` directory.



## SourceBuffersStore ##########################################################

The ``SourceBuffersStore`` is the main export from there. It facilitates the
creation and destruction of SourceBuffers.
More specifically, it keeps track of every ``SourceBuffer`` created for a given
content.

As a rule, only ONE ``SourceBuffer`` is allowed by type of buffer (e.g.
``audio``, ``video``, ``text`` (subtitles), ``images`` (thumbnails)).



## QueuedSourceBuffer ##########################################################

A ``QueuedSourceBuffer`` is a wrapper on top of a ``SourceBuffer`` (a native one
or a custom RxPlayer implementation) that allows to push and remove segments
sequentially.
Basically, it waits for the previous action to be finished before going on the
next step.

It also keeps an inventory of all segments currently contained in it, with the
help of a `SegmentInventory` (see corresponding chapter).

It is the main interface the rest of the RxPlayer code has with SourceBuffers.
As a wrapper it copy most of the original browser API to lower the cognitive
complexity of using it.



## BufferGarbageCollector ######################################################

The BufferGarbageCollector is a function used by the RxPlayer to
periodically perform "garbage collection" manually on a given SourceBuffer.

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

One of them is created per SourceBuffer.



## The SegmentInventory ########################################################

The ``SegmentInventory`` keeps track of which segments is currently bufferized
to avoid unnecessary re-downloadings of them.

You can have more information on it in [the SegmentInventory
documentation](./segment_inventory.md).
