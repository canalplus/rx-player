# VideoThumbnailLoader #########################################################


## Overview ####################################################################

The VideoThumbnailLoader is a tool that can help using a video track
(Representation) as a substitue of a manifest embedded thumbnail track.

The goal is to make a thumbnail out of HTML5 video element, by :
- Managing the loading / appending of resources from a given track
(video segments).
- Exploiting the Media Source Extension API to make it invisible to user.

## How to use it ###############################################################


As an experimental tool, the VideoThumbnailLoader won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like ``npm install
rx-player``) and then specifically importing this tool from
``"rx-player/experimental/tools"``:

```js
import { VideoThumbnailLoader } from "rx-player/experimental/tools";

const currentAdaptations = player.currentAdaptations();
if (
  currentAdaptations.video &&
  currentAdaptations.video.trickModeTrack &&
  currentAdaptations.video.trickModeTrack.representations[0]
) {
  const track = currentAdaptations.video.trickModeTrack.representations[0];
  const videoElement = document.createElement("video");
  const videoThumbnailLoader = new VideoThumbnailLoader(
    videoElement,
    track
  );
}
```


## Constructor #################################################################


## Functions ###################################################################


### setTime ####################################################################

_arguments_:

  - _time_ (``number``): Time for which we want to display a thumbnail.

  - _track_ (``Object``): Representation to use as a video track.

_return value_: ``Promise``

From a given time and track, load video segments, and append to video element.

#### Return value

The return value is a Promise.
It :
- ``resolve`` when the thumbnail for given time has been loaded.
- ``reject`` in case of error.

#### Example

```js
  if (
    currentAdaptations.video &&
    currentAdaptations.video.trickModeTrack &&
    currentAdaptations.video.trickModeTrack.representations[0]
  ) {
    const track = currentAdaptations.video.trickModeTrack.representations[0];
    videoThumbnailLoader.setTime(3000, track)
      .then(() => {
        console.log("Success :)");
        thumbnailVideoElement.hidden = false;
      })
      .catch((err) => {
        console.log("Failure :(", err);
        thumbnailVideoElement.hidden = true;
      })
  }
```

### getError ###################################################################

_return value_: ``Error|null``

Check if the tool has thrown an error out of the ``setTime`` context.

#### Example

```js
  const error = videoThumbnailLoader.getError();
  if (error) {
    console.log("It's a bad lib :(");
  } else {
    console.log("It's a good lib :)");
  }
```

### dispose ###################################################################

Dispose the tool resources.

#### Example

```js
  onComponentUnmount() {
    videoThumbnailLoader.dispose();
  }
```

