import * as React from "react";
import type { IVideoTrack, IAvailableVideoTrack } from "rx-player/types";
import Knob from "../../components/Knob";
import useModuleState from "../../lib/useModuleState";
import type { IPlayerModule } from "../../modules/player/index";

function findVideoTrackIndex(
  videoTrack: IVideoTrack,
  availableVideoTracks: IAvailableVideoTrack[],
) {
  return availableVideoTracks.findIndex((t) => t.id === videoTrack.id);
}

/**
 * Input for video track selection of a media content.
 * @param {Object} props
 * @returns {Object}
 */
function VideoTrackKnob({
  player,
  className,
}: {
  player: IPlayerModule;
  className?: string;
}): JSX.Element {
  const currentVideoTrack = useModuleState(player, "videoTrack");
  const availableVideoTracks = useModuleState(player, "availableVideoTracks");
  const [options, selectedIndex]: [string[], number] = React.useMemo(() => {
    if (availableVideoTracks.length === 0) {
      return [["Not available"], 0];
    }
    return [
      ["no video track"].concat(
        availableVideoTracks.map((track, i) => `track ${i}: ${track.id}`),
      ),
      currentVideoTrack != null
        ? 1 + findVideoTrackIndex(currentVideoTrack, availableVideoTracks)
        : 0,
    ];
  }, [currentVideoTrack, availableVideoTracks]);

  const onVideoTrackChange = React.useCallback(
    ({ index }: { index: number }) => {
      if (index > 0) {
        const track = availableVideoTracks[index - 1];
        if (track !== undefined) {
          player.actions.setVideoTrack(track);
        } else {
          // eslint-disable-next-line no-console
          console.error("Error: video track not found");
        }
      } else {
        player.actions.disableVideoTrack();
      }
    },
    [availableVideoTracks, player],
  );

  return (
    <Knob
      name="Video Track"
      ariaLabel="Update the video track"
      className={className}
      disabled={options.length <= 1}
      onChange={onVideoTrackChange}
      options={options}
      selected={{ index: selectedIndex, value: undefined }}
    />
  );
}

export default React.memo(VideoTrackKnob);
