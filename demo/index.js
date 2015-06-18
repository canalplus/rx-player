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

var DemoZapper = React.createClass({
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

    this.player.loadVideo({
      url: videoUrl,
      transport: transport,
      keySystems: keySystems,
      autoPlay: true,
    });
  },

  createPlayer: function(videoElement) {
    var player = new RxPlayer({
      videoElement: videoElement,
    });

    this.player = player;
    this.player.addEventListener("error", function(error) {
      alert(error.message);
    });

    window.player = player;
    return player;
  },

  render: function() {
    var contentsOptions = contentsDatabase.map(function(content, index) {
      return (<option key={index} value={index}>{content.name}</option>);
    });

    return (
      <div>
        <section id="title">
          <h1 className="title">
            <span className="light">CANAL+ HTML5 Player</span>
          </h1>
        </section>

        <section className="content-selection">
          <select onChange={this.onSelectionChange}>
            <option value={null}>Sélectionnez un contenu</option>
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
