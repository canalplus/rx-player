import * as React from "react";
import { IVideoRepresentation } from "rx-player/types";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

/**
 * @param {Object} props
 * @returns {Object}
 */
function VideoRepresentationKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const isVideoRepresentationLocked = useModuleState(
    player,
    "videoRepresentationsLocked",
  );
  const videoRepresentation = useModuleState(player, "videoRepresentation");
  const videoTrack = useModuleState(player, "videoTrack");

  const availableVideoRepresentations =
    videoTrack === null || videoTrack === undefined ? [] : videoTrack.representations;

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableVideoRepresentations.length || videoRepresentation == null) {
      return [["Not available"], 0];
    }
    if (availableVideoRepresentations.length > 1) {
      let autoValue = "auto";
      if (!isVideoRepresentationLocked) {
        const info = getVideoRepresentationInfo(videoRepresentation);
        if (info.length > 0) {
          autoValue += " (" + info.join(", ") + ")";
        }
      }

      const correspondingInfo = availableVideoRepresentations.map((r) =>
        getVideoRepresentationInfo(r).join(", "),
      );

      return [
        [autoValue, ...correspondingInfo],
        isVideoRepresentationLocked
          ? availableVideoRepresentations.findIndex(
              (r) => r.id === videoRepresentation?.id,
            ) + 1 || 0
          : 0,
      ];
    }
    return [
      availableVideoRepresentations.map((r) => getVideoRepresentationInfo(r).join(", ")),
      0,
    ];
  }, [availableVideoRepresentations, isVideoRepresentationLocked, videoRepresentation]);

  const onVideoRepresentationChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const rep = availableVideoRepresentations[index - 1];
        player.actions.lockVideoRepresentations([rep]);
      } else {
        player.actions.unlockVideoRepresentations();
      }
    },
    [availableVideoRepresentations, player],
  );

  return (
    <Knob
      name="Video quality"
      ariaLabel="Update the video quality"
      className={className}
      disabled={availableVideoRepresentations.length < 2}
      onChange={onVideoRepresentationChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default VideoRepresentationKnob;

function getVideoRepresentationInfo(videoRepresentation: IVideoRepresentation): string[] {
  const info = [];
  if (videoRepresentation.height !== undefined) {
    info.push(`${videoRepresentation.height}p`);
  }
  if (videoRepresentation.bitrate !== undefined) {
    info.push(`${Math.round(videoRepresentation.bitrate / 1000)}kbps`);
  }
  if (info.length === 0) {
    info.push("id: " + videoRepresentation.id);
  }
  return info;
}
