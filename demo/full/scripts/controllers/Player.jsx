import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
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

function Player() {
  const [player, setPlayer] = useState(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [displaySpinner, setDisplaySpinner] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [enableVideoThumbnails, setEnableVideoThumbnails] = useState(false);

  const videoElement = useRef(null);
  const textTrackElement = useRef(null);
  const playerWrapperElement = useRef(null);

  useEffect(() => {
    const playerMod = createModule(PlayerModule, {
      videoElement: videoElement.current,
      textTrackElement: textTrackElement.current,
    });

    const $destroySubject = new Subject();
    $destroySubject.subscribe(() => playerMod.destroy());

    let displaySpinnerTimeout = 0;

    // update isStopped and displaySpinner
    playerMod.$get("autoPlayBlocked" ,
                   "isSeeking",
                   "isBuffering",
                   "isLoading",
                   "isReloading",
                   "isStopped",
                   "videoTrackHasTrickMode")
      .pipe(takeUntil($destroySubject))
      .subscribe(([
        newAutoPlayBlocked,
        isSeeking,
        isBuffering,
        isLoading,
        isReloading,
        newIsStopped,
        videoTrackHasTrickMode,
      ]) => {
        setAutoPlayBlocked(newAutoPlayBlocked);
        setIsStopped(newIsStopped);
        if (isLoading || isReloading) {
          setDisplaySpinner(true);
        } else if (isSeeking || isBuffering) {
          if (displaySpinnerTimeout) {
            clearTimeout(displaySpinnerTimeout);
          }
          displaySpinnerTimeout = setTimeout(() => {
            setDisplaySpinner(true);
          }, SPINNER_TIMEOUT);
        } else {
          if (displaySpinnerTimeout) {
            clearTimeout(displaySpinnerTimeout);
            displaySpinnerTimeout = 0;
          }
          setDisplaySpinner(false);
        }
        if (enableVideoThumbnails !== videoTrackHasTrickMode) {
          setEnableVideoThumbnails(videoTrackHasTrickMode);
        }
      });

    setPlayer(playerMod);

    return () => {
      if ($destroySubject) {
        $destroySubject.next();
        $destroySubject.complete();
      }
      if (displaySpinnerTimeout) {
        clearTimeout(displaySpinnerTimeout);
      }
    };
  }, []);

  const onVideoClick = useCallback(() => {
    const { isPaused, isContentLoaded } = player.get();

    if (!isContentLoaded) {
      return;
    }

    if (isPaused) {
      player.dispatch("PLAY");
    } else {
      player.dispatch("DISABLE_LIVE_CATCH_UP");
      player.dispatch("PAUSE");
    }
  }, [player]);

  const loadVideo = useCallback((video) => {
    if (video.lowLatencyMode) {
      player.dispatch("ENABLE_LIVE_CATCH_UP");
    } else {
      player.dispatch("DISABLE_LIVE_CATCH_UP");
    }
    player.dispatch("SET_PLAYBACK_RATE", 1);
    player.dispatch("LOAD", video);
  }, [player]);

  const stopVideo = useCallback(() => player.dispatch("STOP"), [player]);

  const closeSettings = useCallback(() => {
    setDisplaySettings(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setDisplaySettings(!displaySettings);
  }, [displaySettings]);

  return (
    <section className="video-player-section">
      <div className="video-player-content">
        <ContentList
          loadVideo={loadVideo}
          isStopped={isStopped}
        />
        <div
          className="video-player-wrapper"
          ref={playerWrapperElement}
        >
          <div className="video-screen-parent">
            <div
              className="video-screen"
              onClick={() => onVideoClick()}
            >
              <ErrorDisplayer player={player} />
              {
                autoPlayBlocked ?
                  <div className="video-player-manual-play-container" >
                    <img
                      className="video-player-manual-play"
                      alt="Play"
                      src="./assets/play.svg"/>
                  </div> :
                  null
              }
              {
                !autoPlayBlocked && displaySpinner ?
                  <img
                    src="./assets/spinner.gif"
                    className="video-player-spinner"
                  /> :
                  null
              }
              <div
                className="text-track"
                ref={textTrackElement}
              />
              <video ref={videoElement}/>

            </div>
            <PlayerKnobsSettings
              close={closeSettings}
              shouldDisplay={displaySettings}
              player={player}
            />
          </div>
          {
            player ?
              <ControlBar
                player={player}
                videoElement={playerWrapperElement.current}
                toggleSettings={toggleSettings}
                stopVideo={stopVideo}
                enableVideoThumbnails={enableVideoThumbnails}
              /> : null
          }
        </div>
        {player ?  <ChartsManager player={player} /> : null }
        {player ?  <LogDisplayer player={player} /> : null}
      </div>
    </section>
  );
}

export default Player;
