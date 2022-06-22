import * as React from "react";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

/**
 * Input for video bitrate selection of a media content.
 * @param {Object} props
 * @returns {Object}
 */
function VideoBitrateKnob({
  player,
  className,
}: {
  player: IPlayerModule
  className?: string;
}): JSX.Element {
  const videoBitrateAuto = useModuleState(player, "videoBitrateAuto");
  const videoRepresentation = useModuleState(player, "videoRepresentation");
  const videoTrack =
    useModuleState(player, "videoTrack");

  const availableVideoBitrates =
    videoTrack === null || videoTrack === undefined ?
      [] :
      videoTrack.representations
        .map(r => r.bitrate)
        .filter(b => b !== undefined);

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableVideoBitrates.length) {
      return [["Not available"], 0];
    }
    if (availableVideoBitrates.length > 1) {
      const autoValue =
        videoBitrateAuto &&
        typeof videoRepresentation?.bitrate === "number" ?
          `auto (${videoRepresentation.bitrate})` :
          "auto";
      return [
        [autoValue, ...availableVideoBitrates.map(String)],
        videoBitrateAuto || videoRepresentation?.bitrate === undefined ?
          0 : (
            availableVideoBitrates.indexOf(videoRepresentation.bitrate) + 1 || 0
          )
      ];
    }
    return [availableVideoBitrates.map(String), 0];
  }, [availableVideoBitrates, videoBitrateAuto, videoRepresentation]);

  const onVideoBitrateChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const bitrate = availableVideoBitrates[index - 1];
        player.actions.setVideoBitrate(bitrate);
      } else {
        /* eslint-disable-next-line no-console */
        console.error("Error: video bitrate not found");
      }
    },
    [availableVideoBitrates, player]
  );

  return (
    <Knob
      name="Video Bitrate"
      ariaLabel="Update the video bitrate"
      className={className}
      disabled={availableVideoBitrates.length < 2}
      onChange={onVideoBitrateChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(VideoBitrateKnob);
