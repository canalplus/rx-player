var RxPlayer = require("../dist/rx-player.node.js");
var contents = require("./contents");

var FileSourceBuffer = RxPlayer.buffers.createFileSourceBuffer("/tmp");
var { H264SourceBuffer } = RxPlayer.buffers.H264SourceBuffer;

class SourceBuffer extends mixin(FileSourceBuffer, H264SourceBuffer) {

}

var nodeFsMediaSource = RxPlayer.createHeadlessMediaSource(new SourceBuffer());

RxPlayer.injectDefaultCompatibilityModule(RxPlayer.createNodeCompatibilityModule(nodeFsMediaSource));

var content = contents[0];
var player = new RxPlayer();
player.log.setLevel("DEBUG");
player.loadVideo({
  url: content.url,
  transport: content.transport,
  autoPlay: true
});
