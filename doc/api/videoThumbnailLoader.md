# VideoThumbnailLoader #########################################################


## Overview ####################################################################

The VideoThumbnailLoader is a tool that can help exploiting a trickmode video
track to provide thumbnails for a video content.

The goal is to make a thumbnail out of HTML5 video element, by :
- Managing the loading / appending of resources from a given track
(video segments).
- Exploiting the Media Source Extension API to make it invisible to user.

The tool will need the loaded manifest to contain trickmode tracks. These kind
of track exists in MPEG-DASH and HLS, and contains lightweight video tracks,
most of the time including one unique frame for each video segments. As video
segments from trickmode tracks may be quicker to load and easier to decode, they
are preferred over standard video tracks for creating thumbnails.

## How to use it ###############################################################


As an experimental tool, the VideoThumbnailLoader won't be included in a
default RxPlayer build.

Instead, it should be imported by adding the RxPlayer through a dependency
trough the npm registry (e.g. by doing something like ``npm install
rx-player``) and then specifically importing this tool from
``"rx-player/experimental/tools"``:

```js
import VideoThumbnailLoader, {
  DASH_LOADER
} from "rx-player/experimental/tools/VideoThumbnailLoader";
import RxPlayer from "rx-player";

const player = new RxPlayer({ /* some options */ });

// Link logic to handle DASH segments
VideoThumbnailLoader.addLoader(DASH_LOADER);

// Video element used to display thumbnails.
const thumbnailVideoElement = document.createElement("video");

// Link VideoThumbnailLoader to the RxPlayer instance
const videoThumbnailLoader = new VideoThumbnailLoader(
  thumbnailVideoElement,
  player
);

player.loadVideo({ /* some options */ });

// Ask for the VideoThumbnailLoader to fetch a thumbnail for the current
// content that should be displayed at presentation time = 200 seconds.
videoThumbnailLoader.setTime(200);
```

## Static methods ##############################################################

### addLoader ##################################################################

_arguments_:
  - _loader_ (``Object``): Imported loader from VideoThumbnailLoader package.

To be able to load and parse segments from a specific streaming format, you must
import the corresponding loader and add it to the related instance :

/!\ Note that this is a static method, it has to be called on the
`VideoThumbnailLoader` class and will add the corresponding logic to all
`VideoThumbnailLoader` instances (even those already created).

#### Example

```js
  import VideoThumbnailLoader, {
    DASH_LOADER,
    MPL_LOADER,
  } from "rx-player/experimental/tools/VideoThumbnailLoader";
  VideoThumbnailLoader.addLoader(DASH_LOADER);
  VideoThumbnailLoader.addLoader(MPL_LOADER);
```

## Instance methods ############################################################

### setTime ####################################################################

_arguments_:

  - _time_ (``number``): Time for which we want to display a thumbnail, in
    seconds.

_return value_: ``Promise``

Display thumbnail for the corresponding time (in seconds).

Note: this tool rely on "trickmode" tracks to be present for the corresponding
content at the corresponding time.

#### Return value

The return value is a Promise.
It :
- ``resolve`` when the thumbnail for given time has been loaded.
- ``reject`` in case of error : return an error.

The promise does not only rejects when setting thumbnail has failed. There are
some cases where the thumbnail loader decides not to load. Here is a list of
every failure code (``error.code``) :
- NO_MANIFEST : No manifest available on current RxPlayer instance.
- NO_TRACK : In the player manifest, there are either no period or no
             representation to get video chunks.
- NO_THUMBNAIL : No segments are available for this time of the track.
- LOADING_ERROR : An error occured when loading a thumbnail into the video
                  element.
- ABORTED : The loading has been aborted (probably because of another loading
            started)
- NO_LOADER : Trickmode track can't be loaded as no loader was imported, or
              exists for this type of content (e.g. HSS content)

#### Example

```js
  videoThumbnailLoader.setTime(3000)
    .then(() => {
      console.log("Success :)");
    })
    .catch((err) => {
      console.log("Failure :(", err);
    })
```

### dispose ###################################################################

Dispose the tool resources. It has to be called when the tool is not used
anymore.

#### Example

```js
  onComponentUnmount() {
    videoThumbnailLoader.dispose();
  }
```

