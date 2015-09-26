require("./styles/style.css");
var React = require("react");

var RxPlayer = require("../src");
var DemoPlayer = require("./player");

var contentsDatabase = require("./contents");

function getKeySystems(content) {
  if (!content.ciphered)
    return null;

  throw "not implemented";
}

function getParameterByName(name) {
  name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  var regex = new RegExp("[\\?&]" + name + "=([^&#]*)", "i"),
      results = regex.exec(location.search);
  return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var DemoZapper = React.createClass({
  componentDidMount() {
    var url = getParameterByName("url");
    if (url) {
      var autoPlay = getParameterByName("autoplay") !== "false";
      var ciphered = getParameterByName("ciphered");
      var transport = getParameterByName("transport");
      this.zap({ url, ciphered, transport, autoPlay });
    }
  },

  onSelectionChange: function(e) {
    this.zap(+e.target.value);
  },

  zap: function(content) {
    if (typeof content == "number")
      content = contentsDatabase[content];

    if (content == null) {
      this.player.stop();
      return;
    }

    var videoUrl = content.url;
    var keySystems = getKeySystems(content);
    var transport = content.transport;
    var autoPlay = content.autoPlay === false ? false : true;

    this.player.loadVideo({
      url: videoUrl,
      transport: transport,
      keySystems: keySystems,
      autoPlay: autoPlay,
    });
  },

  createPlayer: function(videoElement) {
    var player = new RxPlayer({
      videoElement: videoElement,
    });

    this.player = player;
    this.player.log.setLevel("DEBUG");
    this.player.addEventListener("error", function(error) {
      alert(error.message);
    });

    window.player = player;
    return player;
  },

  render: function() {
    var contentsOptions = contentsDatabase.map(function(content, index) {
      return (<option key={index} value={index}>{content.transport}: {content.name}{content.live ? " (live)" : ""}</option>);
    });

    return (
      <div>
        <section id="title">
          <h1 className="title">
            <span className="light">rx-player</span>
          </h1>
        </section>

        <section className="content-selection">
          <select onChange={this.onSelectionChange}>
            <option value={null}>Select content...</option>
            {contentsOptions}
          </select>
        </section>

        <DemoPlayer createPlayer={this.createPlayer} />
      </div>
    );
  }
});

window.mountDemoPlayer = function(element, props) {
  return React.render(<DemoZapper {...props} />, element);
};
