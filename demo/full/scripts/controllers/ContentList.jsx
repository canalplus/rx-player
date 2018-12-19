import React from "react";
import parseDRMConfigurations from "../lib/parseDRMConfigurations.js";
import Button from "../components/Button.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const MediaKeys_ =
  window.MediaKeys ||
  window.MozMediaKeys ||
  window.WebKitMediaKeys ||
  window.MSMediaKeys ||
  null;

const HAS_EME_APIs = (
  typeof navigator.requestMediaKeySystemAccess === "function" ||
  (
    MediaKeys_ != null &&
    MediaKeys_.prototype &&
    typeof MediaKeys_.isTypeSupported === "function"
  ) ||
  typeof HTMLVideoElement.prototype.webkitGenerateKeyRequest === "function"
);

const IS_HTTPS = window.location.protocol.startsWith("https");

const TRANSPORT_TYPES = ["DASH", "Smooth", "DirectFile", "MetaPlaylist"];
const DRM_TYPES = ["Widevine", "Playready", "Clearkey"];

const URL_DENOMINATIONS = {
  DASH: "URL to the MPD",
  Smooth: "URL to the Manifest",
  DirectFile: "URL to the content",
};

const CONTENTS_PER_TYPE = TRANSPORT_TYPES.reduce((acc, tech) => {
  acc[tech] = contentsDatabase
    .filter(({ transport }) =>
      transport === tech.toLowerCase()
    ).map((content) => {
      let name = content.name;
      let disabled = false;

      if (IS_HTTPS) {
        if (content.url.startsWith("http:")) {
          name = "[HTTP only] " + name;
          disabled = true;
        }
      } else if (!HAS_EME_APIs && content.drmInfos && content.drmInfos.length) {
        name = "[HTTPS only] " + name;
        disabled = true;
      }

      if (content.live) {
        name += " (live)";
      }

      return { content, name, disabled };
    });
  return acc;
}, {});

Object.keys(CONTENTS_PER_TYPE).forEach((key) => {
  CONTENTS_PER_TYPE[key].push({ name: "Custom link", disabled: false });
});

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    const contents = CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]];
    const firstEnabledContentIndex =
      contents.findIndex((content) => !content.disabled);

    this.state = {
      transportType: TRANSPORT_TYPES[0],
      choiceIndex: firstEnabledContentIndex,
      hasTextInput: CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]].length - 1 ===
        firstEnabledContentIndex,
      displayDRMSettings: false,
      manifestUrl: "",
      drm: DRM_TYPES[0],
      autoPlay: true,
    };
  }

  loadContent(content) {
    const { loadVideo, stopVideo } = this.props;
    if (content == null) {
      stopVideo();
      return;
    }

    const {
      url,
      transport,
      supplementaryImageTracks,
      supplementaryTextTracks,
      textTrackMode,
      drmInfos = [],
    } = content;

    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport,
          autoPlay: !(this.state.autoPlay === false),
          supplementaryImageTracks,
          supplementaryTextTracks,
          textTrackMode,
          keySystems,
        });
      });
  }


  loadUrl(url, drmInfos, autoPlay) {
    const { loadVideo } = this.props;
    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport: this.state.transportType.toLowerCase(),
          autoPlay,

          // native browser subtitles engine (VTTCue) doesn"t render stylized
          // subs.  We force HTML textTrackMode to vizualise styles.
          textTrackMode: "html",
          keySystems,
        });
      });
  }

  changeTransportType(transportType) {
    const contents = CONTENTS_PER_TYPE[transportType];
    const firstEnabledContentIndex =
      contents.findIndex((content) => !content.disabled);
    this.setState({
      transportType,
      choiceIndex: firstEnabledContentIndex,
      hasTextInput: CONTENTS_PER_TYPE[transportType].length - 1 ===
        firstEnabledContentIndex,
    });
  }

  changeContentIndex(index) {
    const { transportType } = this.state;
    const hasTextInput = CONTENTS_PER_TYPE[transportType].length - 1 === index;

    this.setState({
      choiceIndex: index,
      hasTextInput,
    });
  }

  // TODO Better event?
  onManifestInput(evt) {
    this.setState({
      manifestUrl: evt.target.value,
    });
  }

  onLicenseServerInput(evt) {
    this.setState({
      licenseServerUrl: evt.target.value,
    });
  }

  onServerCertificateInput(evt) {
    this.setState({
      serverCertificateUrl: evt.target.value,
    });
  }

  onDRMChange(evt) {
    const index = evt.target.value;
    this.setState({ drm: DRM_TYPES[index] });
  }

  onDisplayDRMSettings(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      displayDRMSettings: value,
    });
  }

  onToggleAutoPlay(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      autoPlay: value,
    });
  }

  render() {
    const {
      transportType,
      choiceIndex,
      hasTextInput,
      manifestUrl,
      licenseServerUrl,
      serverCertificateUrl,
      drm,
      displayDRMSettings,
      autoPlay,
    } = this.state;
    const { isStopped } = this.props;
    const contentsToSelect = CONTENTS_PER_TYPE[transportType];

    const onTechChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.changeTransportType(TRANSPORT_TYPES[index]);
      }
    };

    const onContentChange = (evt) => {
      const index = +evt.target.value;
      this.changeContentIndex(index);
    };

    const onClickLoad = () => {
      if (choiceIndex === contentsToSelect.length - 1) {
        const drmInfos = [{
          licenseServerUrl,
          serverCertificateUrl,
          drm,
        }];
        this.loadUrl(manifestUrl, drmInfos, autoPlay);
      } else {
        this.loadContent(contentsToSelect[choiceIndex].content);
      }
    };

    const onClickStop = () => {
      const { stopVideo } = this.props;
      stopVideo();
    };

    const onManifestInput = (evt) =>
      this.onManifestInput(evt);
    const onLicenseServerInput = (evt) =>
      this.onLicenseServerInput(evt);
    const onServerCertificateInput = (evt) =>
      this.onServerCertificateInput(evt);
    const onDRMChange = (evt) =>
      this.onDRMChange(evt);
    const onDisplayDRMSettings = (evt) =>
      this.onDisplayDRMSettings(evt);
    const onAutoPlayCheckbox = (evt) =>
      this.onToggleAutoPlay(evt);

    const shouldDisableEncryptedContent = !HAS_EME_APIs && !IS_HTTPS;

    return (
      <div className="choice-inputs-wrapper">
        <div className="content-inputs">
          <div className="content-inputs-selects">
            <Select
              className="choice-input transport-type-choice white-select"
              onChange={onTechChange}
              options={TRANSPORT_TYPES}
            />
            <Select
              className="choice-input content-choice white-select"
              onChange={onContentChange}
              options={contentsToSelect}
              selected={choiceIndex}
            />
          </div>
          <div className="choice-input-button-wrapper">
            <div className="autoplay-checkbox">
              Auto Play
              <input
                name="displayBufferSizeChart"
                type="checkbox"
                checked={autoPlay}
                onChange={onAutoPlayCheckbox}
              />
            </div>
            <Button
              className="choice-input choice-input-button load-button"
              onClick={onClickLoad}
              value={String.fromCharCode(0xf144)}
            />
            <Button
              className="choice-input choice-input-button stop-load-button"
              onClick={onClickStop}
              value={String.fromCharCode(0xf04d)}
              disabled={isStopped}
            />
          </div>
        </div>
        {
          hasTextInput ?
            (
              <div className="choice-input custom-input-wrapper">
                <TextInput
                  className="choice-input text-input"
                  onChange={onManifestInput}
                  value={manifestUrl}
                  placeholder={
                    (
                      URL_DENOMINATIONS[transportType] ||
                      `URL to the ${transportType} content`
                    ) + (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
                  }
                />
                <span className={"encryption-checkbox" + (shouldDisableEncryptedContent ? " disabled" : "")}>
                  {(shouldDisableEncryptedContent ? "[HTTPS only] " : "") + "Encrypted content"}
                  <input
                    disabled={shouldDisableEncryptedContent}
                    name="displayDRMSettingsTextInput"
                    type="checkbox"
                    checked={displayDRMSettings}
                    onChange={onDisplayDRMSettings} />
                </span>
                {
                  displayDRMSettings ?
                    <div className="drm-settings">
                      <div>
                        <Select
                          className="choice-input white-select"
                          onChange={onDRMChange}
                          options={DRM_TYPES}
                        />
                        <TextInput
                          className="choice-input text-input"
                          onChange={onLicenseServerInput}
                          value={licenseServerUrl}
                          placeholder={"License server URL"}
                        />
                      </div>
                      <TextInput
                        className="choice-input text-input"
                        onChange={onServerCertificateInput}
                        value={serverCertificateUrl}
                        placeholder={"Server certificate URL (optional)"}
                      />
                    </div> :
                    null
                }
              </div>
            ) : null
        }
      </div>
    );
  }
}

export default ContentList;
