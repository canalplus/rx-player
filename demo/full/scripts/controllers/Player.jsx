import React from "react";
import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { createModule } from "../lib/vespertine.js";
import PlayerModule from "../modules/player";
import ControlBar from "./ControlBar.jsx";
import ContentList from "./ContentList.jsx";
import ErrorDisplayer from "./ErrorDisplayer.jsx";
import LogDisplayer from "./LogDisplayer.jsx";
import ChartsManager from "./charts/index.jsx";
import PlayerKnobsSettings from "./PlayerKnobsSettings.jsx";

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

class Player extends React.Component {
  constructor(...args) {
    super(...args);
    this.state = {
      player: null,
      displaySpinner: false,
      displaySettings: false,
      isStopped: true,
      isCatchingUp: false,
      lastCatchUpRate: undefined,
      hasSeeked: false,
    };
  }

  componentDidMount() {
    const player = createModule(PlayerModule, {
      videoElement: this.videoElement,
      textTrackElement: this.textTrackElement,
    });

    this._$destroySubject = new Subject();
    this._$destroySubject.subscribe(() => player.destroy());

    player.$get("isSeeking",
                "isBuffering",
                "isLoading",
                "isReloading",
                "isStopped",
                "liveGap",
                "lowLatencyMode"
    )
      .pipe(takeUntil(this._$destroySubject))
      .subscribe(([
        isSeeking,
        isBuffering,
        isLoading,
        isReloading,
        isStopped,
        liveGap,
        lowLatencyMode,
      ]) => {
        const { isCatchingUp,
                lastCatchUpRate,
                hasSeeked } = this.state;

        if (player) {
          const shouldCatchUp = (liveGap > 6 ||
                                 isCatchingUp && liveGap > 4) &&
                                !hasSeeked;

          if (shouldCatchUp) {
            if (liveGap > (lowLatencyMode ? 10 : 20)) {
              const maximumPosition = player.get("maximumPosition");
              const distanceToLiveEdge = lowLatencyMode ? 4 : 10;
              player.dispatch("SEEK", maximumPosition - distanceToLiveEdge);
            } else if (lowLatencyMode) {
              const factor = (liveGap - 4) / 4;
              const rate = Math.round(
                (liveGap > 4 ? Math.min(10, 1.1 + factor) : 1) * 10
              ) / 10;
              if (rate !== lastCatchUpRate) {
                this.setState({
                  lastCatchUpRate: rate,
                  lowLatencyMode,
                  isCatchingUp: true,
                });
                player.dispatch("SET_PLAYBACK_RATE", rate);
              }
            }
          } else if (isCatchingUp) {
            this.setState({
              lastCatchUpRate: 1,
              isCatchingUp: false,
            });
            player.dispatch("SET_PLAYBACK_RATE", 1);
          } else {
            this.setState({
              lastCatchUpRate: undefined,
            });
          }
        }

        this.setState({ isStopped });
        if (isLoading || isReloading) {
          this.setState({ displaySpinner: true });
        } else if (isSeeking || isBuffering) {
          this._displaySpinnerTimeout = setTimeout(() => {
            this.setState({ displaySpinner: true });
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
    const { isPaused, isContentLoaded } =
      this.state.player.get();

    if (!isContentLoaded) {
      return;
    }

    this.state.player.dispatch(isPaused ? "PLAY"  : "PAUSE");
  }

  render() {
    const { player, displaySpinner, isStopped, hasSeeked } =
      this.state;

    const loadVideo = (video) => this.state.player.dispatch("LOAD", video);
    const stopVideo = () => this.state.player.dispatch("STOP");

    const closeSettings = () => {
      this.setState({ displaySettings: false });
    };
    const toggleSettings = () => {
      this.setState({ displaySettings: !this.state.displaySettings });
    };

    const toggleHasSeeked = (hasSeeked) => {
      this.setState({ hasSeeked });
    };

    return (
      <section className="video-player-section">
        <div className="video-player-content">
          <ContentList
            loadVideo={loadVideo}
            isStopped={isStopped}
          />
          <div
            className="video-player-wrapper"
            ref={element => this.playerWrapperElement = element }
          >
            <div className="video-screen-parent">
              <div
                className="video-screen"
                onClick={() => this.onVideoClick()}
              >
                <ErrorDisplayer player={player} />
                {
                  displaySpinner ?
                    <img
                      src="./assets/spinner.gif"
                      className="video-player-spinner"
                    /> :
                    null
                }
                <div
                  className="text-track"
                  ref={element => this.textTrackElement = element }
                />
                <video ref={element => this.videoElement = element }/>

              </div>
              <PlayerKnobsSettings
                close={closeSettings}
                shouldDisplay={this.state.displaySettings}
                player={player}
              />
            </div>
            {
              player ?
                <ControlBar
                  player={player}
                  videoElement={this.playerWrapperElement}
                  toggleSettings={toggleSettings}
                  toggleHasSeeked={toggleHasSeeked}
                  hasSeeked={hasSeeked}
                  stopVideo={stopVideo}
                /> : null}
          </div>
          {player ?  <ChartsManager player={player} /> : null }
          {player ?  <LogDisplayer player={player} /> : null}
        </div>
      </section>
    );
  }
}

export default Player;
