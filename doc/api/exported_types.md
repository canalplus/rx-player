# Exported Types ###############################################################

The RxPlayer being written in TypeScript, it has type definitions attached to
its source code that can be helpful if you develop an application in TypeScript
yourself.


## "Using" types ###############################################################

Because we follow the usual way of adding definition files (as ``d.ts`` file
alongside our sources), those typings should be auto-exported when importing our
library in your favorite editor (as long as it is linked to a TSServer of some
sort).



## Importing specific types ####################################################

As some APIs can have pretty complicated arguments, you might also want to
import some of our internal type definitions into your code.

To simplify this process, we export some type definitions which can be imported
through the following line in your file:

```ts
import { SOME_TYPE } from "rx-player/types"
```

Here are the list of exported types, per category.


### RxPlayer Constructor #######################################################

The type ``IConstructorOptions`` corresponds to the interface that the
RxPlayer constructor accepts as an argument.

Example:

```ts
import RxPlayer from "rx-player";
import { IConstructorOptions } from "rx-player/types";

function generateConstructorOptions() : IConstructorOptions {
  const videoElement = document.querySelector("video");
  return {
    stopAtEnd: false,
    videoElement,
  };
}

const options = generateConstructorOptions();
const player = new RxPlayer(options);

export default player;
```

Two constructor options have also their type definition exported, those are:

  - `IAudioTrackPreference`: which is the type of a single element in the
    `preferredAudioTracks` array.

  - `ITextTrackPreference`: which is the type of a single element in the
    `preferredTextTracks` array.


### loadVideo ##################################################################

The ``ILoadVideoOptions`` type corresponds to the argument to give to the
RxPlayer's method ``loadVideo``.

Example:

```ts
// the type(s) wanted
import { ILoadVideoOptions } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

function generateLoadVideoOptions(url : string) : ILoadVideoOptions {
  return {
    url,
    transport: "dash",
    autoPlay: true,
  };
}

const loadVideoOpts = generateLoadVideoOptions(config.DEFAULT_URL);
rxPlayer.loadVideo(loadVideoOpts);
```

Speaking of ``loadVideo``, some subparts of ``ILoadVideoOptions`` are also
exported:

  - ``ITransportOptions``: type for the ``transportOptions`` property
    optionally given to ``loadVideo``.

  - ``IKeySystemOption``: type for an element of the ``keySystems`` array,
    which is an optional property given to ``loadVideo``.

    To clarify, the ``keySystems`` property in a ``loadVideo`` call is an
    optional array of one or multiple ``IKeySystemOption``.

  - ``ISupplementaryTextTrackOption``: type for an element of the
    ``supplementaryTextTracks`` array, which is an optional property given to
    ``loadVideo``.

  - ``ISupplementaryImageTrackOption``: type for an element of the
    ``supplementaryImageTracks`` array, which is an optional property given to
    ``loadVideo``.

  - ``IDefaultAudioTrackOption``: type for the ``defaultAudioTrack`` property
    optionally given to ``loadVideo``.

  - ``IDefaultTextTrackOption``: type for the ``defaultAudioTrack`` property
    optionally given to ``loadVideo``.

  - ``INetworkConfigOption``: type for the ``networkConfig`` property
    optionally given to ``loadVideo``.

  - ``IStartAtOption``: type for the ``startAt`` property optionally given to
    ``loadVideo``.


### getAvailableAudioTracks method / availableAudioTracksChange event ##########

The return type of the `getAvailableAudioTracks` method is an array of objects.
Each of this objects corresponds to the `IAvailableAudioTrack` interface.

Example:

```js
// the type(s) wanted
import { IAvailableAudioTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

function getAvailableAudioTracks() : IAvailableAudioTrack[] {
  return rxPlayer.getAvailableAudioTracks();
}
```


### getAvailableTextTracks method / availabletextTracksChange event ############

The return type of the `getAvailableTextTracks` method is an array of objects.
Each of this objects corresponds to the `IAvailableTextTrack` interface.

Example:

```js
// the type(s) wanted
import { IAvailableTextTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

function getAvailableTextTracks() : IAvailableTextTrack[] {
  return rxPlayer.getAvailableTextTracks();
}
```


### getAvailableVideoTracks method / availableVideoTracksChange event ##########

The return type of the `getAvailableVideoTracks` method is an array of objects.
Each of this objects corresponds to the `IAvailableVideoTrack` interface.

Example:

```js
// the type(s) wanted
import { IAvailableVideoTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

function getAvailableVideoTracks() : IAvailableVideoTrack[] {
  return rxPlayer.getAvailableVideoTracks();
}
```


### getAudioTrack method /audioTrackChange event ###############################

The `IAudioTrack` corresponds to both the type returned by the `getAudioTrack`
method and emitted as the payload of the `audioTrackChange` event.

Example:

```js
// the type(s) wanted
import { IAudioTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

rxPlayer.addEventListener("audioTrackChange", (track : IAudioTrack) => {
  console.log("current track:", track);
});

function getCurrentlyDownloadedAudioTrack() : IAudioTrack {
  return rxPlayer.getAudioTrack();
}
```


### getTextTrack method / textTrackChange event ################################

The `ITextTrack` corresponds to both the type returned by the `getTextTrack`
method and emitted as the payload of the `textTrackChange` event.

Example:

```js
// the type(s) wanted
import { ITextTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

rxPlayer.addEventListener("textTrackChange", (track : ITextTrack) => {
  console.log("current track:", track);
});

function getCurrentlyDownloadedTextTrack() : ITextTrack {
  return rxPlayer.getTextTrack();
}
```


### getVideoTrack method / videoTrackChange event ##############################

The `IVideoTrack` corresponds to both the type returned by the `getVideoTrack`
method and emitted as the payload of the `videoTrackChange` event.

Example:

```js
// the type(s) wanted
import { IVideoTrack } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

// hypothetical file exporting a configuration object
import config from "./config"; // define a global config

rxPlayer.addEventListener("videoTrackChange", (track : IVideoTrack) => {
  console.log("current track:", track);
});

function getCurrentlyDownloadedVideoTrack() : IVideoTrack {
  return rxPlayer.getVideoTrack();
}
```

### streamEvent / streamEventSkip events #######################################

The type `IStreamEvent` corresponds to the payload of either a `streamEvent` or
a `streamEventSkip` event.

The type `IStreamEventData` is the type of its `data` property.

Example:

```js
// the type(s) wanted
import { IStreamEvent, IStreamEventData } from "rx-player/types";

// hypothetical file exporting an RxPlayer instance
import rxPlayer from "./player";

function processEventData(eventData : IStreamEventData) {
  if (eventData.type === "dash-event-stream") {
    console.log("DASH EventStream's event received!");
  }
}

rxPlayer.addEventListener("streamEvent", (evt : IStreamEvent) {
  processEventData(evt.data);
});
```
