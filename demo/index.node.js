var RxPlayer = require("../dist/rx-player.node.js");
var contents = require("./contents");

var ms = RxPlayer.createMediaSource(RxPlayer.buffers.createFileSourceBuffer("/tmp"));
RxPlayer.injectCompatibilityModule(RxPlayer.compat({
  HTMLVideoElement: ms.HTMLVideoElement,
  MediaSource: ms.MediaSource,
  URL: ms.URL,
}));

var content = contents[1];
var player = new RxPlayer();
player.loadVideo({
  url: content.url,
  transport: content.transport,
  autoPlay: true
});
