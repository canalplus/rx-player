# Tutorial: Quick Start ########################################################

Because the RxPlayer exports a lot of functionnalities, you might want to
quickly test basic use cases before you dive deep into the [whole API
documentation](../api/index.md).

We will here learn how to simply load a video and to react to basic events.



## Instanciating a Player ######################################################

The first step is to instanciate a new RxPlayer.

Each RxPlayer instance is attached to a single video (or audio) HTML element,
and is able to play a single content at once.

To instanciate it with a linked video element you can just do something along
the lines of:
```js
import RxPlayer from "rx-player";

const videoElement = document.querySelector("video");
const player = new RxPlayer({ videoElement });
```

``videoElement`` is an RxPlayer option and will be the HTMLElement the RxPlayer
will load your media on.

Despite its name, you can also give it an `<audio>` element. It will still be
able to play an audio content without issue.

When you are ready to make use of more advanced features, you can look at the
other possible options in the [Player Options page](../api/player_options.md).



## Loading a content ###########################################################

The next logical step is to load a content (audio, video or both).

Loading a new content is done through the ``loadVideo`` method.

``loadVideo`` takes an object as arguments. There is here also [a lot of
possible options](../api/loadVideo_options.md), but to simplify we will start
with just three:

  - ``transport``: String describing the transport protocol (can be ``"dash"``,
    ``"smooth"`` or ``"directfile"`` for now).

  - ``url``: URL to the content (to the Manifest for Smooth contents, to the MPD
    for DASH contents or to the whole file for DirectFile contents).

  - ``autoPlay``: Boolean indicating if you want the content to automatically
    begin to play once loaded. ``false`` by default (which means, the player
    will not begin to play on its own).

Here is a quick example which will load and play a DASH content:
```js
player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```



## Reacting to basic events ####################################################

Now that we are loading a content, we might want to know:
  - if it succeed
  - if it failed
  - when we are able to interact with the content

To do all three of those things, you will need to listen to player events.
This is done through the [addEventListener
method](../api/index.md#meth-addEventListener).

This method works the same way than the native one you might already use on
HTML elements.

For example, to know if a fatal error happened (this is an error which
interrupted the playback of the current content), you will just have to do:
```js
player.addEventListener("error", (err) => {
  console.log("the content stopped with the following error", err);
});
```

And to know if the player successfully loaded a content and if you can now
interact with it, you can just do:
```js
player.addEventListener("playerStateChange", (state) => {
  if (state === "LOADED") {
    console.log("the content is loaded");
    // interact with the content...
  }
});
```

There is multiple other events, all documented in [the events documentation
](../api/player_events.md).

As the state is a central focus of our API, we also heavily documented states in
[the player states documentation](../api/states.md).



## Interacting with the player #################################################

We're now ready to interact with the current content.

There is [a huge list of APIs](../api/index.md) you can use.
Some are useful only when a content is currently loaded (like ``play``,
``pause``, ``seekTo`` or ``setAudioTrack``) and others can be used in any case
(like ``setVolume``, ``getVideoElement`` or ``loadVideo``).

Here is a complete example where I:
  1. Instanciate an RxPlayer
  2. load a content with it with autoPlay
  3. toggle between play and pause once the content is loaded and the user click
     on the video element.

```js
import RxPlayer from "rx-player";

// take the first video element on the page
const videoElement = document.querySelector("video");

const player = new RxPlayer({ videoElement });

player.addEventListener("error", (err) => {
  console.log("the content stopped with the following error", err);
});

player.addEventListener("playerStateChange", (state) => {
  if (state === "LOADED") {
    console.log("the content is loaded");

    // toggle between play and pause when the user clicks on the video
    videoElement.onclick = function() {
      if (player.getPlayerState() === "PLAYING") {
        player.pause();
      } else {
        player.play();
      }
    };
  }
});

player.loadVideo({
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```


## And now?

Now that you know the basic RxPlayer APIs, you might want to dive deep into [the
whole API documentation](./api/index.md).

You can also read our next tutorial, on how to play contents with DRM,
[here](./contents_with_DRM.md).
