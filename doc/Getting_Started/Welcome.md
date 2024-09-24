<p align="center">
  <img style="max-width: 250px; margin: 30px;" src="../static/img/logo.png" />
</p>

## The RxPlayer

The RxPlayer is a media player library allowing to play DASH, Smooth streaming and other
similar streaming contents in any application.

The RxPlayer does not come with an UI in itself as the idea is to let you have a full
control over your application's experience.

What happens here is that you provide only a `<video>` or `<audio>` element to it (and
optionally a separate element to display text tracks) an URL to the content (for example,
to the DASH's MPD) and the configuration you want (the languages, control over the quality
etc.) and the RxPlayer takes care of every little details to play the content inside that
element:

```js
import RxPlayer from "rx-player";

// take the first video element on the page
const videoElement = document.querySelector("video");

const player = new RxPlayer({ videoElement });

player.loadVideo({
  url: "https://www.example.com/Manifest.mpd",
  transport: "dash",
  autoPlay: true,
});
```

## The documentation pages

Those pages are splitted into multiple categories:

- You're here in the "Getting Started" category which provides tutorials and other
  resources allowing to help you with basic usage of the RxPlayer.

- You can also dive into the [API](../api/Overview.md), which specifies the behavior of
  everything that is possible with the RxPlayer.
