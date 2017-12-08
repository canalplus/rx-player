# SpeedManager

The SpeedManager is the part of the Stream updating the playback speed of the content.

Playback speed can be updated on two occasions:
  - the API set a new Speed (``speed$`` Observable).
  - the content needs to build its buffer.

    In which case, the playback speed will be set to 0 (paused) even if the
    API set another speed.
    The regular speed will be set when enough buffer is available.
