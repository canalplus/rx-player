import * as React from "react";
import Checkbox from "../CheckBox";

/**
 * @param {Object} props
 * @returns {Object}
 */
function PlaybackConfig({
  autoPlay,
  onAutoPlayChange,
  tryRelyOnWorker,
  onTryRelyOnWorkerChange,
  useDummyMediaElement,
  onUseDummyMediaElementChange,
}: {
  autoPlay: boolean;
  onAutoPlayChange: (val: boolean) => void;
  tryRelyOnWorker: boolean;
  onTryRelyOnWorkerChange: (val: boolean) => void;
  useDummyMediaElement: boolean;
  onUseDummyMediaElementChange: (val: boolean) => void;
}): JSX.Element {
  return (
    <>
      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="autoPlay"
          ariaLabel="Auto play option"
          checked={autoPlay}
          onChange={onAutoPlayChange}
        >
          Auto Play
        </Checkbox>
        <span className="option-desc">
          {autoPlay
            ? "Playing directly when the content is loaded."
            : "Staying in pause when the content is loaded."}
        </span>
      </li>

      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="tryRelyOnWorker"
          ariaLabel="Rely in a WebWorker when possible"
          checked={tryRelyOnWorker}
          onChange={onTryRelyOnWorkerChange}
        >
          Multithread mode (when possible)
        </Checkbox>
        <span className="option-desc">
          {tryRelyOnWorker
            ? "Running the RxPlayer's main logic in a WebWorker when possible"
            : "Currently running the RxPlayer's main logic only in main thread."}
        </span>
      </li>

      <li>
        <Checkbox
          className="playerOptionsCheckBox playerOptionsCheckBoxTitle"
          name="useDummyMediaElement"
          ariaLabel="Rely in a WebWorker when possible"
          checked={useDummyMediaElement}
          onChange={onUseDummyMediaElementChange}
        >
          Dummy Media API
        </Checkbox>
        <span className="option-desc">
          {useDummyMediaElement
            ? "Use mocked media API. The content will not really play but the " +
              "RxPlayer will believe it does (useful for debugging inaccessible content)."
            : "Actually play the chosen content."}
        </span>
      </li>
    </>
  );
}

export default React.memo(PlaybackConfig);
