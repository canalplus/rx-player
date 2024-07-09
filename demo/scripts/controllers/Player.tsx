import * as React from "react";
import type {
  IAudioRepresentationsSwitchingMode,
  ILoadVideoOptions,
  IVideoRepresentationsSwitchingMode,
} from "../../../src/public_types";
import PlayerModule from "../modules/player";
import type { IPlayerModule } from "../modules/player";
import ControlBar from "./ControlBar";
import ContentList from "./ContentList";
import Settings from "./Settings";
import ErrorDisplayer from "./ErrorDisplayer";
import ChartsManager from "./charts/index";
import PlayerKnobsSettings from "./PlayerKnobsSettings";
import defaultOptionsValues from "../lib/defaultOptionsValues";
import type {
  ILoadVideoSettings,
  IConstructorSettings,
} from "../lib/defaultOptionsValues";

const { useCallback, useEffect, useRef, useState } = React;

// time in ms while seeking/loading/buffering after which the spinner is shown
const SPINNER_TIMEOUT = 300;

function Player(): JSX.Element {
  const [
    defaultAudioRepresentationsSwitchingMode,
    setDefaultAudioRepresentationsSwitchingMode,
  ] = useState<IAudioRepresentationsSwitchingMode>("reload");
  const [
    defaultVideoRepresentationsSwitchingMode,
    setDefaultVideoRepresentationsSwitchingMode,
  ] = useState<IVideoRepresentationsSwitchingMode>("reload");
  const [playerModule, setPlayerModule] = useState<IPlayerModule | null>(null);
  const [autoPlayBlocked, setAutoPlayBlocked] = useState(false);
  const [displaySpinner, setDisplaySpinner] = useState(false);
  const [displaySettings, setDisplaySettings] = useState(false);
  const [enableVideoThumbnails, setEnableVideoThumbnails] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [playerOpts, setPlayerOpts] = useState<IConstructorSettings>(
    defaultOptionsValues.player,
  );
  const [loadVideoOpts, setLoadVideoOpts] = useState<ILoadVideoSettings>(
    defaultOptionsValues.loadVideo,
  );
  const [relyOnWorker, setRelyOnWorker] = useState(false);
  const [hasUpdatedPlayerOptions, setHasUpdatedPlayerOptions] = useState(false);
  const displaySpinnerTimeoutRef = useRef<number | null>(null);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const textTrackElementRef = useRef<HTMLDivElement>(null);
  const debugElementRef = useRef<HTMLDivElement>(null);
  const playerWrapperElementRef = useRef<HTMLDivElement>(null);

  const onOptionToggle = useCallback(() => {
    setShowOptions((prevState) => !prevState);
  }, []);

  const clearSpinner = useCallback(() => {
    if (displaySpinnerTimeoutRef.current) {
      clearTimeout(displaySpinnerTimeoutRef.current);
      displaySpinnerTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (playerModule === null) {
      return;
    }
    playerModule.actions.updateWorkerMode(relyOnWorker);
  }, [relyOnWorker, playerModule]);

  // Bind events on player module creation and destroy old when it changes
  useEffect(() => {
    if (playerModule === null) {
      return;
    }
    function reCheckSpinner() {
      if (playerModule === null) {
        if (displaySpinnerTimeoutRef.current !== null) {
          clearTimeout(displaySpinnerTimeoutRef.current);
          displaySpinnerTimeoutRef.current = null;
        }
        setDisplaySpinner(false);
        return;
      }
      playerModule.actions.setDefaultAudioRepresentationSwitchingMode(
        defaultAudioRepresentationsSwitchingMode,
      );
      playerModule.actions.setDefaultVideoRepresentationSwitchingMode(
        defaultVideoRepresentationsSwitchingMode,
      );
      const isSeeking = playerModule.getState("isSeeking");
      const isBuffering = playerModule.getState("isBuffering");
      const isLoading = playerModule.getState("isLoading");
      const isReloading = playerModule.getState("isReloading");
      if (isLoading || isReloading) {
        // When loading/reloading: show spinner immediately
        if (displaySpinnerTimeoutRef.current !== null) {
          clearTimeout(displaySpinnerTimeoutRef.current);
          displaySpinnerTimeoutRef.current = null;
        }
        setDisplaySpinner(true);
      } else if (isSeeking || isBuffering) {
        // When seeking/rebuffering: show spinner after a delay
        if (displaySpinnerTimeoutRef.current === null) {
          displaySpinnerTimeoutRef.current = window.setTimeout(() => {
            setDisplaySpinner(true);
          }, SPINNER_TIMEOUT);
        }
      } else {
        if (displaySpinnerTimeoutRef.current !== null) {
          clearTimeout(displaySpinnerTimeoutRef.current);
          displaySpinnerTimeoutRef.current = null;
        }
        setDisplaySpinner(false);
      }
    }

    playerModule.listenToState(
      "defaultAudioRepresentationsSwitchingMode",
      (newVal: IAudioRepresentationsSwitchingMode) =>
        setDefaultAudioRepresentationsSwitchingMode(newVal),
    );
    playerModule.listenToState(
      "defaultVideoRepresentationsSwitchingMode",
      (newVal: IVideoRepresentationsSwitchingMode) =>
        setDefaultVideoRepresentationsSwitchingMode(newVal),
    );
    playerModule.listenToState("autoPlayBlocked", (newAutoPlayBlocked) => {
      setAutoPlayBlocked(newAutoPlayBlocked);
    });
    playerModule.listenToState("videoTrackHasTrickMode", (videoTrackHasTrickMode) => {
      setEnableVideoThumbnails(videoTrackHasTrickMode);
    });
    playerModule.listenToState("isSeeking", reCheckSpinner);
    playerModule.listenToState("isBuffering", reCheckSpinner);
    playerModule.listenToState("isLoading", reCheckSpinner);
    playerModule.listenToState("isReloading", reCheckSpinner);
    reCheckSpinner();
    return () => {
      playerModule.destroy();
      clearSpinner();
    };
  }, [playerModule]);

  const createNewPlayerModule = useCallback(() => {
    if (
      videoElementRef.current === null ||
      textTrackElementRef.current === null ||
      debugElementRef.current === null
    ) {
      return;
    }
    if (playerModule) {
      playerModule.destroy();
    }
    const playerMod = new PlayerModule(
      Object.assign(
        {},
        {
          videoElement: videoElementRef.current,
          textTrackElement: textTrackElementRef.current,
          debugElement: debugElementRef.current,
        },
        playerOpts,
      ),
    );
    setPlayerModule(playerMod);
    return playerMod;
  }, [playerOpts, playerModule]);

  const onVideoClick = useCallback(() => {
    if (playerModule === null) {
      return;
    }
    const isPaused = playerModule.getState("isPaused");
    const isContentLoaded = playerModule.getState("isContentLoaded");

    if (!isContentLoaded) {
      return;
    }

    if (isPaused) {
      playerModule.actions.play();
    } else {
      playerModule.actions.disableLiveCatchUp();
      playerModule.actions.pause();
    }
  }, [playerModule]);

  const startContent = useCallback(
    (contentInfo: ILoadVideoOptions) => {
      let playerMod = playerModule;
      if (playerMod === null || hasUpdatedPlayerOptions) {
        setHasUpdatedPlayerOptions(false);
        const created = createNewPlayerModule();
        if (created === undefined) {
          return;
        }
        created.actions.updateWorkerMode(relyOnWorker);
        playerMod = created;
      }
      loadContent(playerMod, contentInfo, loadVideoOpts);
    },
    [
      playerModule,
      relyOnWorker,
      hasUpdatedPlayerOptions,
      createNewPlayerModule,
      loadVideoOpts,
    ],
  );

  const stopVideo = useCallback(() => {
    playerModule?.actions.stop();
  }, [playerModule]);

  const closeSettings = useCallback(() => {
    setDisplaySettings(false);
  }, []);

  const toggleSettings = useCallback(() => {
    setDisplaySettings(!displaySettings);
  }, [displaySettings]);

  const updatePlayerOptions = useCallback(
    (cb: React.SetStateAction<IConstructorSettings>) => {
      setHasUpdatedPlayerOptions(true);
      setPlayerOpts(cb);
    },
    [],
  );

  const updateDefaultAudioRepresentationsSwitchingMode = useCallback(
    (mod: IAudioRepresentationsSwitchingMode) => {
      if (playerModule === null) {
        setDefaultAudioRepresentationsSwitchingMode(mod);
        setHasUpdatedPlayerOptions(true);
        return;
      }
      playerModule.actions.setDefaultAudioRepresentationSwitchingMode(mod);
    },
    [playerModule],
  );

  const updateDefaultVideoRepresentationsSwitchingMode = useCallback(
    (mod: IVideoRepresentationsSwitchingMode) => {
      if (playerModule === null) {
        setDefaultVideoRepresentationsSwitchingMode(mod);
        setHasUpdatedPlayerOptions(true);
        return;
      }
      playerModule.actions.setDefaultVideoRepresentationSwitchingMode(mod);
    },
    [playerModule],
  );

  return (
    <section className="video-player-section">
      <div className="video-player-content">
        <ContentList
          loadVideo={startContent}
          showOptions={showOptions}
          onOptionToggle={onOptionToggle}
        />
        <Settings
          playerOptions={playerOpts}
          updatePlayerOptions={updatePlayerOptions}
          loadVideoOptions={loadVideoOpts}
          updateLoadVideoOptions={setLoadVideoOpts}
          showOptions={showOptions}
          defaultAudioRepresentationsSwitchingMode={
            defaultAudioRepresentationsSwitchingMode
          }
          updateDefaultAudioRepresentationsSwitchingMode={
            updateDefaultAudioRepresentationsSwitchingMode
          }
          defaultVideoRepresentationsSwitchingMode={
            defaultVideoRepresentationsSwitchingMode
          }
          updateDefaultVideoRepresentationsSwitchingMode={
            updateDefaultVideoRepresentationsSwitchingMode
          }
          tryRelyOnWorker={relyOnWorker}
          updateTryRelyOnWorker={setRelyOnWorker}
        />
        <div className="video-player-wrapper" ref={playerWrapperElementRef}>
          <div className="video-screen-parent">
            <div
              className="video-screen"
              onKeyDown={(evt: React.KeyboardEvent<HTMLDivElement>): void => {
                if (evt.keyCode === 32 || evt.code === "Space") {
                  onVideoClick();
                }
              }}
              onClick={() => onVideoClick()}
            >
              {playerModule ? <ErrorDisplayer player={playerModule} /> : null}
              {autoPlayBlocked ? (
                <div className="video-player-manual-play-container">
                  <img
                    className="video-player-manual-play"
                    alt="Play"
                    src="./assets/play.svg"
                  />
                </div>
              ) : null}
              {!autoPlayBlocked && displaySpinner ? (
                <img src="./assets/spinner.gif" className="video-player-spinner" />
              ) : null}
              <div className="text-track" ref={textTrackElementRef} />
              <div className="debug-element" ref={debugElementRef} />
              <video ref={videoElementRef} />
            </div>
            {playerModule ? (
              <PlayerKnobsSettings
                close={closeSettings}
                shouldDisplay={displaySettings}
                player={playerModule}
              />
            ) : null}
          </div>
          {playerModule && playerWrapperElementRef ? (
            <ControlBar
              player={playerModule}
              playerWrapperElementRef={playerWrapperElementRef}
              toggleSettings={toggleSettings}
              stopVideo={stopVideo}
              enableVideoThumbnails={enableVideoThumbnails}
            />
          ) : null}
        </div>
        <ChartsManager player={playerModule} />
      </div>
    </section>
  );
}

function loadContent(
  playerModule: IPlayerModule,
  contentInfo: ILoadVideoOptions,
  loadVideoOpts: ILoadVideoSettings,
) {
  if (contentInfo.lowLatencyMode) {
    playerModule.actions.enableLiveCatchUp();
  } else {
    playerModule.actions.disableLiveCatchUp();
  }
  playerModule.actions.setPlaybackRate(1);
  playerModule.actions.load(Object.assign({}, contentInfo, loadVideoOpts));
}

export default Player;
