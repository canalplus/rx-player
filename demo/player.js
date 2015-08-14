var React = require("react");

var PlayPause = React.createClass({
  render: function() {
    return (
      <button
        id="play-pause"
        className={"control-button " + (this.props.isPlaying ? "pause" : "play")}
        onClick={this.props.togglePlay}>
      </button>
    );
  }
});

var Progressbar = React.createClass({
  getInitialState: function() {
    return {
      duration: 0,
      playingPosition: 0,
      bufferPosition: 0
    };
  },

  seek: function(event) {
    var target = this.getDOMNode();
    var rect = target.getBoundingClientRect();
    var position = (event.clientX - rect.left) / target.offsetWidth;
    this.props.seekTo(position * this.state.duration);
  },

  componentWillReceiveProps: function(nextProps) {
    var currentTime = nextProps.currentTime;
    if (!currentTime) {
      this.setState({
        duration: 0,
        playingPosition: 0,
        bufferPosition: 0,
      });
    }
    else {
      this.setState({
        duration: currentTime.duration,
        playingPosition: (currentTime.ts / currentTime.duration),
        bufferPosition: ((currentTime.gap + currentTime.ts) / currentTime.duration)
      });
    }
  },

  render: function() {
    var playingPosition = this.state.playingPosition;
    var bufferPosition = this.state.bufferPosition;
    return (
      <div className="progress-bar-container" onClick={this.seek}>
        <div
          id="progress-bar-played"
          className="progress-bar"
          style={{ width: playingPosition * 100 + "%" }}>
        </div>
        <div
          id="progress-bar-buffered"
          className="progress-bar"
          style={{ width: bufferPosition * 100 + "%" }}>
        </div>
      </div>
    );
  }
});

var Volume = React.createClass({
  getInitialState: function() {
    return { isVisible: false, };
  },

  setVolume: function(event) {
    var target = React.findDOMNode(this.refs.volumeBar);
    var height = target.offsetHeight;
    var rect = target.getBoundingClientRect();
    var v = Math.min(((rect.top + height) - event.clientY) / height, 1);
    this.props.setVolume(v);
  },

  onMouseOver: function() {
    if (this.timeout)
      clearTimeout(this.timeout);

    this.setState({ isVisible: true });
  },

  onMouseOut: function() {
    if (this.timeout)
      clearTimeout(this.timeout);

    var _this = this;
    this.timeout = setTimeout(function() {
      _this.setState({ isVisible: false });
    }, 200);
  },

  render: function() {
    var isVisible = this.state.isVisible;
    var volume = this.props.value;
    return (
      <div id="volume">
        { isVisible ? <div
          id="volume-bar-container"
          className="volumeBar"
          ref="volumeBar"
          onClick={this.setVolume}
          onMouseOver={this.onMouseOver}
          onMouseOut={this.onMouseOut}>

          <div
            id="currentVolume"
            className="volumeBar"
            onClick={this.setVolume}
            onMouseOver={this.onMouseOver}
            onMouseOut={this.onMouseOut}
            style={{ "height": (volume * 100) + "%" }}/>
        </div> : null }
        <button
          id="volumeButton"
          className={"control-button " + (this.props.isMuted ? "muted" : "unmuted")}
          onMouseOver={this.onMouseOver}
          onClick={this.props.toggleMute}
          onMouseOut={this.onMouseOut}>
        </button>
      </div>
    );
  }
});

var FullScreen = React.createClass({
  render: function() {
    return (
      <button
        id="fullScr"
        className="control-button"
        onClick={this.props.setFullscreen}>&#xf065;</button>
    );
  }
});

var Languages = React.createClass({
  changeLanguage: function(event) {
    this.props.setLanguage(event.target.value);
  },

  getLanguagesOptions: function() {
    return this.props.availableLanguages.map(function(language){
      var langName = (language === "fra")
        ? "Français"
        : "English";

      return <option className={language} value={language}>
        {langName}
      </option>;
    });
  },

  render: function() {
    return (
      <div>
        <p className="optionLabel">Langue</p>
        <select id="languages" className="optionSelector" onChange={this.changeLanguage}>
          {this.getLanguagesOptions()}
        </select>
      </div>
    );
  }
});

var Subtitles = React.createClass({
  changeSubtitles: function(event) {
    this.props.setSubtitle(event.target.value);
  },

  getSubtitlesOptions: function() {
    return this.props.availableSubtitles.map(function(subtitle) {
      return (
        <option className={subtitle} value={subtitle}>
          {subtitle}
        </option>
      );
    });
  },

  render: function() {
    return (
      <div>
        <p className="optionLabel">Sous-titres</p>
        <select id="subtitles" value={this.props.subtitle} className="optionSelector" onChange={this.changeSubtitles}>
          {this.getSubtitlesOptions()}
        </select>
      </div>
    );
  }
});

var Player = React.createClass({
  getDefaultProps: function () {
    return {
      transport: "dash",
      autoPlay: true
    };
  },

  getInitialState: function() {
    return {
      active: false,
      player: null,
      isPlaying: false,
      language: null,
      subtitle: null,
      currentTime: null,
      volume: 0,
    };
  },

  activityDebounce: function() {
    if (!this.state.active)
      this.setState({ active: true });

    if (this.activityTimeout)
      clearTimeout(this.activityTimeout);

    var _this = this;
    this.activityTimeout = setTimeout(function() {
      _this.setState({ active: false });
    }, 5000);
  },

  componentDidMount: function() {
    var rootNode = this.getDOMNode();
    var videoElement = React.findDOMNode(this.refs.video);

    var player = this.props.createPlayer(videoElement);
    this.player = player;
    this.setState({ volume: player.getVolume() });

    var _this = this;

    rootNode.addEventListener("mousemove", this.activityDebounce);
    rootNode.addEventListener("click", this.activityDebounce);

    this.onPlayerStateChange = function(state) {
      _this.setState({
        isPlaying: state === "PLAYING"
      });

      if (state == "STOPPED") {
        _this.setState({
          currentTime: null,
          language: null,
          subtitle: null,
        });
      }
    };

    this.onCurrentTimeChange = function(currentTime) {
      _this.setState({ currentTime: currentTime });
    };

    this.onLangChange = function() {
      _this.setState({
        language: player.getLanguage(),
        subtitle: player.getSubtitle(),
      });
    };

    this.onVolumeChange = function(volume) {
      _this.setState({ volume: volume });
    };

    player.addEventListener("playerStateChange", this.onPlayerStateChange);
    player.addEventListener("currentTimeChange", this.onCurrentTimeChange);
    player.addEventListener("languageChange", this.onLangChange);
    player.addEventListener("subtitleChange", this.onLangChange);
    player.addEventListener("volumeChange", this.onVolumeChange);

    if (this.props.autoPlay) {
      setTimeout(this.loadVideo, 0);
    }
  },

  componentWillUnmount: function () {
    var player = this.player;
    if (player) {
      player.dispose();
      player.removeEventListener("playerStateChange", this.onPlayerStateChange);
      player.removeEventListener("currentTimeChange", this.onCurrentTimeChange);
      player.removeEventListener("languageChange", this.onLangChange);
      player.removeEventListener("subtitleChange", this.onLangChange);
      player.removeEventListener("volumeChange", this.onVolumeChange);
    }
    var rootNode = this.getDOMNode();
    rootNode.removeEventListener("mousemove", this.activityDebounce);
    rootNode.removeEventListener("click", this.activityDebounce);
  },

  componentWillReceiveProps: function (nextProps) {
    if (nextProps.url !== this.props.url) {
      setTimeout(this.loadVideo, 0);
    }
  },

  loadVideo: function() {
    if (!this.props.autoLoadVideo)
      return;

    this.setState({
      language: null,
      subtitle: null,
      currentTime: null
    });

    this.player.stop();

    if (!this.props.url)
      return;

    return this.player.loadVideo({
      url: this.props.url,
      transport: this.props.transport,
      keySystems: this.props.keySystems,
      autoPlay: true
    });
  },

  togglePlay: function() {
    if (this.player.getPlayerState() === "PAUSED") {
      this.player.play();
    } else {
      this.player.pause();
    }
  },

  seekTo: function(pos) {
    this.player.seekTo(pos);
  },

  setVolume: function(vol) {
    this.player.setVolume(vol);
  },

  toggleMute: function() {
    if (this.player.getVolume() === 0) {
      this.player.unMute();
    } else {
      this.player.mute();
    }
  },

  toggleFullscreen: function() {
    this.player.setFullscreen(!this.player.isFullscreen());
  },

  setSubtitle: function(sub) {
    this.player.setSubtitle(sub);
  },

  setLanguage: function(lng) {
    this.player.setLanguage(lng);
  },

  render: function() {
    var player = this.player;

    return (
      <div style={ {position: "relative"} }>
        <video ref="video" width="100%" id="videoEl" className="video" />

        { player ?
          <div id="controls-bar">
            <PlayPause
              isPlaying={this.state.isPlaying}
              togglePlay={this.togglePlay} />
            <Progressbar
              currentTime={this.state.currentTime}
              seekTo={this.seekTo} />
            <Volume
              value={this.state.volume}
              isMuted={this.state.volume === 0}
              setVolume={this.setVolume}
              toggleMute={this.toggleMute} />
            <FullScreen
              toggleFullscreen={this.toggleFullscreen} />
          </div> : null }

        { /* player ?
          <div id="options">
            <Languages
              availableLanguages={this.player.getAvailableLanguages()}
              language={this.state.language}
              setLanguage={this.setLanguage} />
            <Subtitles
              availableSubtitles={this.player.getAvailableSubtitles()}
              subtitle={this.state.subtitle}
              setSubtitle={this.setSubtitle} />
          </div> : null */ }

      </div>
    );
  }
});

module.exports = Player;
