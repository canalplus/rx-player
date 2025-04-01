import * as React from "react";
import Button from "../components/Button";
import {
  addFullscreenListener,
  exitFullscreen,
  isFullscreen,
  removeFullscreenListener,
  requestFullscreen,
} from "../lib/fullscreen";
import useModuleState from "../lib/useModuleState";
import type { IPlayerModule } from "../modules/player/index";

const { useCallback, useEffect, useMemo, useState } = React;

/**
 * Simple fullscreen button.
 * Triggers the right callback on click.
 *
 * @param {Object} props
 * @returns {Object}
 */
function FullscreenButton({
  playerWrapperElementRef,
  player,
  className,
}: {
  playerWrapperElementRef: { current: HTMLElement | null };
  player: IPlayerModule;
  className: string;
}): React.JSX.Element {
  const hasCurrentContent = useModuleState(player, "hasCurrentContent");
  const isInitiallyFullscreen = useMemo(() => isFullscreen(), []);
  const [isCurrentlyFullScreen, setIsCurrentlyFullScreen] =
    useState(isInitiallyFullscreen);

  useEffect(() => {
    const fullscreenListener = () => {
      const isInFullscreen = isFullscreen();
      if (!isInFullscreen && playerWrapperElementRef.current !== null) {
        playerWrapperElementRef.current.classList.remove("fullscreen");
      }
      setIsCurrentlyFullScreen(isInFullscreen);
    };

    addFullscreenListener(fullscreenListener);

    return () => {
      removeFullscreenListener(fullscreenListener);
    };
  }, [playerWrapperElementRef]);

  const setFullscreen = useCallback(() => {
    if (playerWrapperElementRef.current === null) {
      return;
    }
    requestFullscreen(playerWrapperElementRef.current);
    playerWrapperElementRef.current.classList.add("fullscreen");
  }, [playerWrapperElementRef]);

  return (
    <Button
      ariaLabel="Go/Quit fullscreen"
      className={"fullscreen-button " + className}
      onClick={isCurrentlyFullScreen ? exitFullscreen : setFullscreen}
      disabled={!hasCurrentContent}
      value={String.fromCharCode(isCurrentlyFullScreen ? 0xf066 : 0xf065)}
    />
  );
}

export default React.memo(FullscreenButton);
