import RxPlayer from "./core/api";

// const videoUrl = "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd";
// const workerUrl = "./worker.js";
// const videoElementRef = document.getElementsByTagName("video")[0];

window.RxPlayer = RxPlayer;
// const player = new RxPlayer({ videoElement: videoElementRef }, workerUrl);
// player.loadVideo({ url: videoUrl,
//                    transport: "dash",
//                    autoPlay: true });

// window.player = player;

export { IContentProtection } from "./core/decrypt";
export {
  IContentInitializationData,
  IMainThreadMessage,
  IWorkerPlaybackObservation,
  IReferenceUpdateMessage,
  IStartContentMessageValue,
} from "./send_message";

