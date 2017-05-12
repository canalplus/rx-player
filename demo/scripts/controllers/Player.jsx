const React = require("react");
const { Subject } = require("rxjs/Subject");
const { createModule } = require("../lib/vespertine.js");
const PlayerModule = require("../modules/player");
const ControlBar = require("./ControlBar.jsx");
const ContentList = require("./ContentList.jsx");
const ErrorDisplayer = require("./ErrorDisplayer.jsx");
const PlayerKnobsManager = require("./PlayerKnobs.jsx");
const LogDisplayer = require("./LogDisplayer.jsx");
const ChartsManager = require("./charts/index.jsx");

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

class Player extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      player: null,
      displaySpinner: false,
    };

  }

  componentDidMount() {
    const player = createModule(PlayerModule, {
      videoElement: this.videoElement,
    });

    this._$destroySubject = new Subject();
    this._$destroySubject.subscribe(() => player.destroy());

    player.$get("isSeeking", "isBuffering", "isLoading")
      .takeUntil(this._$destroySubject)
      .subscribe(([isSeeking, isBuffering, isLoading]) => {
        if (isSeeking || isBuffering || isLoading) {
          this._displaySpinnerTimeout = setTimeout(() => {
            this.setState({
              displaySpinner: true,
            });
          }, SPINNER_TIMEOUT);
        } else {
          if (this._displaySpinnerTimeout) {
            clearTimeout(this._displaySpinnerTimeout);
            this._displaySpinnerTimeout = 0;
          }

          if (this.state.displaySpinner) {
            this.setState({
              displaySpinner: false,
            });
          }
        }

      });

    this.setState({ player });
    // for DEV mode
    window.playerModule = player;
  }

  // will never happen, but still
  componentWillUnmount() {
    if (this._$destroySubject) {
      this._$destroySubject.next();
      this._$destroySubject.complete();
    }
    if (this._displaySpinnerTimeout) {
      clearTimeout(this._displaySpinnerTimeout);
    }
  }

  onVideoClick() {
    const { isPaused, hasLoadedContent, hasEnded } =
      this.state.player.get();

    if (!hasLoadedContent || hasEnded) {
      return;
    }

    this.state.player.dispatch(isPaused ? "PLAY"  : "PAUSE");
  }

  render() {
    const { player, displaySpinner } = this.state;
    const loadVideo = (video) => this.state.player.dispatch("LOAD", video);
    const stopVideo = () => this.state.player.dispatch("STOP");

    return (
      <section className="video-player-section">
        <div className="video-player-content">
          <ContentList
            loadVideo={loadVideo}
            stopVideo={stopVideo}
          />
          <div className="video-player-wrapper">
            <div
              className="video-wrapper"
              onClick={() => this.onVideoClick()}
            >
              <ErrorDisplayer player={player} />
              { displaySpinner ?
                  <img
                    src="./assets/spinner.gif"r
                    className="video-player-spinner"
                  /> : null
              }
              <video
                ref={element => this.videoElement = element }
              />
            </div>
            { player ? <ControlBar player={player} /> : null}
          </div>
          {player ?  <PlayerKnobsManager player={player} /> : null}
          {player ?  <ChartsManager player={player} /> : null }
          {player ?  <LogDisplayer player={player} /> : null}
        </div>
      </section>
    );
  }
}

module.exports = Player;
