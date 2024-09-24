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
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const videoBitrateAuto = useModuleState(player, "videoBitrateAuto");
  const videoBitrate = useModuleState(player, "videoBitrate");
  const availableVideoBitrates = useModuleState(player, "availableVideoBitrates");

  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (!availableVideoBitrates.length) {
      return [["Not available"], 0];
    }
    if (availableVideoBitrates.length > 1) {
      const autoValue = videoBitrateAuto ? `auto (${videoBitrate ?? "unknown"})` : "auto";
      return [
        [autoValue, ...availableVideoBitrates.map(String)],
        videoBitrateAuto || videoBitrate === undefined
          ? 0
          : availableVideoBitrates.indexOf(videoBitrate) + 1 || 0,
      ];
    }
    return [availableVideoBitrates.map(String), 0];
  }, [availableVideoBitrates, videoBitrateAuto, videoBitrate]);

  const onVideoBitrateChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const bitrate = availableVideoBitrates[index - 1];
        player.actions.setVideoBitrate(bitrate);
      } else if (index === 0) {
        player.actions.setVideoBitrate(-1);
      } else {
        /* eslint-disable-next-line no-console */
        console.error("Error: video bitrate not found");
      }
    },
    [availableVideoBitrates, player],
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
