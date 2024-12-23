import * as React from "react";
import Checkbox from "../CheckBox";
import Select from "../Select";

/**
 * @param {Object} props
 * @returns {Object}
 */
function TrackSwitchConfig({
  enableFastSwitching,
  defaultAudioTrackSwitchingMode,
  onCodecSwitch,
  onDefaultAudioTrackSwitchingModeChange,
  onCodecSwitchChange,
  onEnableFastSwitchingChange,
  onAudioTracksNotPlayable,
  onAudioTracksNotPlayableChange,
  onVideoTracksNotPlayable,
  onVideoTracksNotPlayableChange,
}: {
  defaultAudioTrackSwitchingMode: string;
  onDefaultAudioTrackSwitchingModeChange: (newVal: string) => void;
  enableFastSwitching: boolean;
  onCodecSwitch: string;
  onCodecSwitchChange: (val: string) => void;
  onEnableFastSwitchingChange: (val: boolean) => void;
  onAudioTracksNotPlayable: string;
  onAudioTracksNotPlayableChange: (val: string) => void;
  onVideoTracksNotPlayable: string;
  onVideoTracksNotPlayableChange: (val: string) => void;
}): React.JSX.Element {
  const defaultAudioTrackSwitchingModeDescMsg = React.useMemo(() => {
    switch (defaultAudioTrackSwitchingMode) {
      case "reload":
        return "Reloading by default when the audio track is changed";
      case "direct":
        return "Directly audible transition when the audio track is changed";
      case "seamless":
        return "Smooth transition when the audio track is changed";
      default:
        return "Unknown value";
    }
  }, [defaultAudioTrackSwitchingMode]);

  const onCodecSwitchDescMsg = React.useMemo(() => {
    switch (onCodecSwitch) {
      case "reload":
        return "Reloading buffers when the codec changes";
      case "continue":
        return "Keeping the same buffers even when the codec changes";
      default:
        return "Unknown value";
    }
  }, [onCodecSwitch]);

  const onAudioTracksNotPlayableDescMsg = React.useMemo(() => {
    switch (onAudioTracksNotPlayable) {
      case "error":
        return "Throw an error if no audio track can be played";
      case "continue":
        return "Continue with video only if no audio track is playable";
      default:
        return "Unknown value";
    }
  }, [onAudioTracksNotPlayable]);

  const onVideoTracksNotPlayableDescMsg = React.useMemo(() => {
    switch (onVideoTracksNotPlayable) {
      case "error":
        return "Throw an error if no video track can be played";
      case "continue":
        return "Continue with audio only if no video track is playable";
      default:
        return "Unknown value";
    }
  }, [onVideoTracksNotPlayable]);

  const onCodecSwitchSelection = React.useCallback(
    ({ value }: { value: string }) => onCodecSwitchChange(value),
    [onCodecSwitchChange],
  );

  const onDefaultAudioTrackSwitchingModeSelection = React.useCallback(
    ({ value }: { value: string }) => onDefaultAudioTrackSwitchingModeChange(value),
    [onDefaultAudioTrackSwitchingModeChange],
  );

  const onAudioTracksNotPlayableSelection = React.useCallback(
    ({ value }: { value: string }) => onAudioTracksNotPlayableChange(value),
    [onAudioTracksNotPlayableChange],
  );

  const onVideoTracksNotPlayableSelection = React.useCallback(
    ({ value }: { value: string }) => onVideoTracksNotPlayableChange(value),
    [onVideoTracksNotPlayableChange],
  );

  return (
    <>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          ariaLabel="Fast switching option"
          name="fastSwitching"
          checked={enableFastSwitching}
          onChange={onEnableFastSwitchingChange}
        >
          Fast Switching
        </Checkbox>
        <span className="option-desc">
          {enableFastSwitching
            ? "Fast quality switch by replacing lower qualities in the buffer by higher ones when possible."
            : "Not replacing lower qualities in the buffer by an higher one when possible."}
        </span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the defaultAudioTrackSwitchingMode attribute"
          disabled={false}
          className="playerOptionInput"
          name="defaultAudioTrackSwitchingMode"
          onChange={onDefaultAudioTrackSwitchingModeSelection}
          selected={{ value: defaultAudioTrackSwitchingMode, index: undefined }}
          options={["seamless", "direct", "reload"]}
        >
          Audio track switching mode
        </Select>
        <span className="option-desc">{defaultAudioTrackSwitchingModeDescMsg}</span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the onCodecSwitch attribute"
          disabled={false}
          className="playerOptionInput"
          name="onCodecSwitch"
          onChange={onCodecSwitchSelection}
          selected={{ value: onCodecSwitch, index: undefined }}
          options={["continue", "reload"]}
        >
          On Codec Switch
        </Select>
        <span className="option-desc">{onCodecSwitchDescMsg}</span>
      </li>
      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the onAudioTracksNotPlayable attribute"
          disabled={false}
          className="playerOptionInput"
          name="onAudioTracksNotPlayable"
          onChange={onAudioTracksNotPlayableSelection}
          selected={{ value: onAudioTracksNotPlayable, index: undefined }}
          options={["continue", "error"]}
        >
          On Audio Tracks Not Playable
        </Select>
        <span className="option-desc">{onAudioTracksNotPlayableDescMsg}</span>
      </li>

      <li className="featureWrapperWithSelectMode">
        <Select
          ariaLabel="Selecting the onVideoTracksNotPlayable attribute"
          disabled={false}
          className="playerOptionInput"
          name="onVideoTracksNotPlayable"
          onChange={onVideoTracksNotPlayableSelection}
          selected={{ value: onVideoTracksNotPlayable, index: undefined }}
          options={["continue", "error"]}
        >
          On Video Tracks Not Playable
        </Select>
        <span className="option-desc">{onVideoTracksNotPlayableDescMsg}</span>
      </li>
    </>
  );
}

export default React.memo(TrackSwitchConfig);
