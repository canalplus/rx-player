# Buffer Garbage Collector

The BufferGarbageCollector is a function used by the RxPlayer's Stream to periodically perform "garbage collection" manually on a given SourceBuffer.

It is based on the following building bricks:
  - A clock, which is an observable emitting the current time (in seconds) when the garbage collection task should be performed
  - The QueuedSourceBuffer on which the garbage collection task should run
  - The maximum time margin authorized for the buffer behind the current position
  - The maximum time margin authorized for the buffer ahead of the current position

Basically, each times the given clock ticks, the BufferGarbageCollector will ensure that the volume of data before and ahead of the current position does not grow into a larger value than what is configured.

The Stream creates one of them per SourceBuffer created.
