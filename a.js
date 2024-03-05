import RxPlayer from "./src/index";
import { DUMMY_MEDIA_ELEMENT } from "rx-player/experimental/features";

const videoElement = document.querySelector("video");

// Play current content on media element
const player = new RxPlayer({ videoElement });
player.addEventListener("newAvailablePeriods", selectTracks);
// ... Other events handling

player.loadVideo({
  url: initialWantedContentUrl,
  transport: "dash",
  // ... Other options
});

// Pre-load future content without media element
const preloadMediaElement = DUMMY_MEDIA_ELEMENT.create();
const preloadPlayer = new RxPlayer({ videoElement: preloadMediaElement });

// Heavily recommended: set limits on how much data is being loaded
preloadPlayer.setWantedBufferAhead(10);
preloadPlayer.setMaxVideoBufferSize(50_000);

preloadPlayer.addEventListener("newAvailablePeriods", selectTracks);
// ... Other track selection events handling

preloadPlayer.loadVideo({
  url: preloadedContentUrl,
  transport: "dash",
  // ...
});

// ... Wait until initially loaded content ended

// stop `preloadPlayer` and play it on the real media element
const preloadedData = preloadMediaElement.getLoadedData();
preloadPlayer.stop();
player.loadVideo({
  url: preloadedContentUrl,
  transport: "dash",
  preloadedData,
});
