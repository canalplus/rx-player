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

const { localStorage } = window;
const hasLocalStorage = !!localStorage;

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
const TRANSPORT_TYPES = ["DASH", "Smooth", "DirectFile"];
const DRM_TYPES = ["Widevine", "Playready", "Clearkey"];

const URL_DENOMINATIONS = {
  DASH: "URL to the MPD",
  Smooth: "URL to the Manifest",
  DirectFile: "URL to the content",
};

function formatContentForDisplay(content) {
  let name = content.name;
  let disabled = false;

  if (IS_HTTPS) {
    if (content.url.startsWith("http:")) {
      name = "[HTTP only] " + name;
      disabled = true;
    }
  } else if (!HAS_EME_APIs &&
             content.drmInfos &&
             content.drmInfos.length
  ) {
    name = "[HTTPS only] " + name;
    disabled = true;
  }

  if (content.live) {
    name += " (live)";
  }

  const localContent = !!content.localContent;
  return { content, name, disabled, localContent };
}

const CONTENTS_PER_TYPE = TRANSPORT_TYPES.reduce((acc, tech) => {
  acc[tech] = contentsDatabase
    .filter(({ transport }) => transport === tech.toLowerCase())
    .map(formatContentForDisplay);

  return acc;
}, {});

Object.keys(CONTENTS_PER_TYPE).forEach((key) => {
  CONTENTS_PER_TYPE[key].unshift({ name: "Custom link", disabled: false });
});

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    const contents = CONTENTS_PER_TYPE[TRANSPORT_TYPES[0]];
    const firstEnabledContentIndex =
      contents.findIndex((c) => !c.disabled && c.name !== "Custom link");

    const localStorageContents = [];

    if (hasLocalStorage) {
      const localContentItems = localStorage.getItem("rxPlayerLocalContents");
      if (hasLocalStorage && localContentItems) {
        try {
          localStorageContents.push(...JSON.parse(localContentItems));
        } catch(err) {
          /* eslint-disable-next-line */
          console.warn("Demo: Can't parse local storage content.");
        }
      }
    }

    const index = firstEnabledContentIndex > -1 ? firstEnabledContentIndex : 0;
    this.state = {
      transportType: TRANSPORT_TYPES[0],
      contentChoiceIndex: index,
      hasTextInput: index === 0,
      displayDRMSettings: false,
      manifestUrl: "",
      savedContentName: "",
      drm: DRM_TYPES[0],
      autoPlay: true,
      localStorageContents,
      isSavingOrUpdating: false,
      chosenContent: undefined,
    };
  }

  addContentToLocalStorage(content) {
    if (!hasLocalStorage) {
      /* eslint-disable-next-line */
      console.warn("Demo: No local storage support for adding content.");
      return null;
    }

    const { localStorageContents } = this.state;
    const idx = localStorageContents.findIndex((e) => {
      return e.id === content.id;
    });

    if (idx > -1) {
      localStorageContents.splice(idx, 1, content);
      this.setState({ localStorageContents });
      localStorage.setItem("rxPlayerLocalContents", JSON.stringify(localStorageContents));
      return null;
    }

    localStorageContents.push(content);
    this.setState({ localStorageContents });
    localStorage.setItem("rxPlayerLocalContents", JSON.stringify(localStorageContents));
    return content;
  }

  removeContentFromLocalStorage(content) {
    if (!hasLocalStorage) {
      /* eslint-disable-next-line */
      console.warn("Demo: No local storage support for removing content.");
      return null;
    }

    const { localStorageContents } = this.state;
    const idx = localStorageContents.findIndex((e) => {
      return e.name === content.name;
    });

    if (idx < 0) {
      return null;
    }

    localStorageContents.splice(idx, 1);
    this.setState({ localStorageContents });
    localStorage.setItem("rxPlayerLocalContents", JSON.stringify(localStorageContents));
    return content;
  }

  loadContent(content) {
    const { loadVideo, stopVideo } = this.props;
    const { autoPlay } = this.state;
    if (content == null) {
      stopVideo();
      return;
    }

    const {
      url,
      transport,
      supplementaryImageTracks,
      supplementaryTextTracks,
      drmInfos = [],
    } = content;

    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({
          url,
          transport,
          autoPlay,
          supplementaryImageTracks,
          supplementaryTextTracks,
          textTrackMode: "html",
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
      contents.findIndex((c) => !c.disabled && c.name !== "Custom link");

    const index = firstEnabledContentIndex > -1 ? firstEnabledContentIndex : 0;
    this.setState({
      transportType,
      contentChoiceIndex: index,
      hasTextInput: index === 0,
      manifestUrl: "",
      savedContentName: "",
      licenseServerUrl: "",
      setServerCertificate: "",
      isSavingOrUpdating: false,
      content: undefined,
    });
  }

  changeContent(index, content) {
    const hasTextInput = index === 0;

    let manifestUrl = "";
    let savedContentName = "";
    let licenseServerUrl = "";
    let setServerCertificate = "";

    if (content && content.localContent) {
      manifestUrl = content.url;
      savedContentName = content.name;
      licenseServerUrl = (
        content.drmInfos &&
        content.drmInfos[0]
      ) ? content.drmInfos[0].licenseServerUrl : "";
      setServerCertificate = (
        content.drmInfos &&
        content.drmInfos[0]
      ) ? content.drmInfos[0].setServerCertificate : "";
    }

    this.setState({
      contentChoiceIndex: index,
      hasTextInput,
      chosenContent: content,
      manifestUrl,
      savedContentName,
      licenseServerUrl,
      setServerCertificate,
      isSavingOrUpdating: false,
    });
  }

  onDisplayDRMSettings(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({
      displayDRMSettings: value,
    });
  }

  onAutoPlayClick(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({ autoPlay: value });
  }

  render() {
    const {
      autoPlay,
      contentChoiceIndex,
      displayDRMSettings,
      drm,
      hasTextInput,
      licenseServerUrl,
      manifestUrl,
      savedContentName,
      serverCertificateUrl,
      transportType,
      localStorageContents,
      isSavingOrUpdating,
      chosenContent,
    } = this.state;

    // get local storage content here, and concat
    const contentsFromLocalStorage = localStorageContents
      .filter(({ transport }) => transport === transportType.toLowerCase())
      .map(formatContentForDisplay);

    const contentsToSelect = CONTENTS_PER_TYPE[transportType]
      .slice()
      .concat(contentsFromLocalStorage)
      .map((content) => {
        if (content.localContent) {
          content.name = "[Local storage] " + content.name;
        }
        return content;
      });

    const onTechChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        this.changeTransportType(TRANSPORT_TYPES[index]);
      }
    };

    const onContentInputChange = (evt) => {
      const index = +evt.target.value;
      const { content } = contentsToSelect[index];
      this.changeContent(index, content);
    };

    const onClickLoad = () => {
      if (contentChoiceIndex === 0) {
        const drmInfos = [{
          licenseServerUrl,
          serverCertificateUrl,
          drm,
        }];
        this.loadUrl(manifestUrl, drmInfos, autoPlay);
      } else {
        this.loadContent(contentsToSelect[contentChoiceIndex].content);
      }
    };

    const activeSaveOption = manifestUrl !== "" &&
                             manifestUrl != null &&
                             transportType != null;

    const onClickValid = (id) => {
      if (activeSaveOption) {
        const content = {
          name: savedContentName,
          url: manifestUrl,
          transport: transportType.toLowerCase(),
          drmInfos: (drm && licenseServerUrl) ? [
            {
              drm,
              licenseServerUrl,
              serverCertificateUrl,
            },
          ] : [],
          localContent: true,
          id: id == null ?
            (Date.now() + "_" + Math.random() + "_" + savedContentName) : id,
        };
        const hasAdded = this.addContentToLocalStorage(content);
        if (hasAdded) {
          this.changeContent(contentsToSelect.length, content);
        }
        this.setState({
          isSavingOrUpdating: false,
        });
      }
    };

    const onClickSave = () => {
      this.setState({
        isSavingOrUpdating: true,
      });
    };

    const onClickErase = () => {
      const { content } = contentsToSelect[contentChoiceIndex];
      if (content) {
        const hasRemoved = this.removeContentFromLocalStorage(content);
        if (hasRemoved) {
          const newContent = contentsToSelect[contentChoiceIndex - 1].content;
          this.changeContent(contentChoiceIndex - 1, newContent);
        }
      }
    };

    const onNameInput = (evt) =>
      this.setState({ savedContentName: evt.target.value });

    const onManifestInput = (evt) =>
      this.setState({ manifestUrl: evt.target.value });

    const onLicenseServerInput = (evt) =>
      this.setState({ licenseServerUrl: evt.target.value });

    const onServerCertificateInput = (evt) =>
      this.setState({ serverCertificateUrl: evt.target.value });

    const onDisplayDRMSettings = (evt) =>
      this.onDisplayDRMSettings(evt);

    const onAutoPlayClick = (evt) => {
      this.onAutoPlayClick(evt);
    };

    const onDRMTypeClick = (type) => {
      this.setState({ drm: type });
    };

    const onCancel = () => {
      this.setState({ isSavingOrUpdating: false });
    };

    const shouldDisableEncryptedContent = !HAS_EME_APIs && !IS_HTTPS;

    const generateDRMButtons = () => {
      return DRM_TYPES.map(type =>
        <Button
          className={"choice-input-button drm-button" +
            (drm === type ? " selected" : "")}
          onClick={() => onDRMTypeClick(type)}
          value={type}
        />);
    };

    const isLocalContent = !!(chosenContent && chosenContent.localContent);
    const chosenContentHasDRMInfo = chosenContent &&
                        chosenContent.drmInfos &&
                        chosenContent.drmInfos[0];

    return (
      <div className="choice-inputs-wrapper">
        <div className="content-inputs">
          <div className="content-inputs-left">
            <div className="content-inputs-selects">
              <Select
                className="choice-input transport-type-choice white-select"
                onChange={onTechChange}
                options={TRANSPORT_TYPES}
              />
              <Select
                className="choice-input content-choice white-select"
                onChange={onContentInputChange}
                options={contentsToSelect}
                selected={contentChoiceIndex}
              />
            </div>
            <div className="content-inputs-middle">
              {
                (hasLocalStorage && (hasTextInput || isLocalContent)) ?
                  (<Button
                    className={"choice-input-button save-button" +
                      (!activeSaveOption ? " disabled" : "")}
                    onClick={onClickSave}
                    disabled={!activeSaveOption || isSavingOrUpdating}
                    value={isLocalContent ?
                      (isSavingOrUpdating ? "Updating" : "Update content") :
                      (isSavingOrUpdating ? "Saving" : "Save content")}
                  />) :
                  null
              }
              {
                (hasLocalStorage && isLocalContent) ?
                  (<Button
                    className="choice-input-button erase-button"
                    onClick={onClickErase}
                    value={String.fromCharCode(0xf1f8)}
                  />) :
                  null
              }
            </div>
          </div>
          <div className="choice-input-button-wrapper">
            <div class="auto-play">
              AutoPlay
              <label class="input switch">
                <input type="checkbox" checked={autoPlay} onChange={onAutoPlayClick} />
                <span class="slider round"></span>
              </label>
            </div>
            <Button
              className="choice-input-button load-button"
              onClick={onClickLoad}
              value={String.fromCharCode(0xf144)}
            />
          </div>
        </div>
        {
          (hasTextInput || (isLocalContent && isSavingOrUpdating)) ?
            (
              <div className="custom-input-wrapper">
                {
                  isSavingOrUpdating ?
                    (<div className="update-control">
                      <TextInput
                        className={"text-input" + (savedContentName === "" ? " need-to-fill" : "")}
                        onChange={onNameInput}
                        value={savedContentName}
                        placeholder={"Content name"}
                      />
                      <div className="update-control-buttons">
                        {
                          (isSavingOrUpdating) ?
                            (<Button
                              className={"choice-input-button save-button"}
                              onClick={
                                () => onClickValid(
                                  chosenContent ?
                                    chosenContent.id :
                                    undefined
                                )
                              }
                              value={isLocalContent ? "Update content" : "Save content"}
                            />) :
                            null
                        }
                        {
                          (isSavingOrUpdating) ?
                            (<Button
                              className={"choice-input-button save-button"}
                              onClick={onCancel}
                              value={"Cancel"}
                            />) :
                            null
                        }
                      </div>
                    </div>)
                    : null
                }
                <TextInput
                  className="text-input"
                  onChange={onManifestInput}
                  value={manifestUrl}
                  placeholder={
                    isLocalContent ? chosenContent.url :
                      (
                        URL_DENOMINATIONS[transportType] ||
                        `URL to the ${transportType} content`
                      ) + (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
                  }
                />
                <div className="player-box">
                  <span className={"encryption-checkbox" + (shouldDisableEncryptedContent ? " disabled" : "")}>
                    {(shouldDisableEncryptedContent ? "[HTTPS only] " : "") + "Encrypted content"}
                    <label class="switch">
                      <input
                        disabled={shouldDisableEncryptedContent}
                        name="displayDRMSettingsTextInput"
                        type="checkbox"
                        checked={displayDRMSettings}
                        onChange={onDisplayDRMSettings}
                      />
                      <span class="slider round"></span>
                    </label>
                  </span>
                  {
                    displayDRMSettings ?
                      <div className="drm-settings">
                        <div className="drm-choice">
                          {generateDRMButtons()}
                        </div>
                        <div>
                          <TextInput
                            className="choice-input text-input"
                            onChange={onLicenseServerInput}
                            value={licenseServerUrl}
                            placeholder={
                              chosenContentHasDRMInfo &&
                              chosenContent.drmInfos[0]
                                .licenseServerUrl != "" &&
                              chosenContent.drmInfos[0]
                                .licenseServerUrl != null ?
                                chosenContent.drmInfos[0].licenseServerUrl :
                                "License URL Server"
                            }
                          />
                        </div>
                        <TextInput
                          className="choice-input text-input"
                          onChange={onServerCertificateInput}
                          value={serverCertificateUrl}
                          placeholder={
                            chosenContentHasDRMInfo &&
                            chosenContent.drmInfos[0]
                              .serverCertificateUrl != "" &&
                            chosenContent.drmInfos[0]
                              .serverCertificateUrl != null ?
                              chosenContent.drmInfos[0]
                                .serverCertificateUrl :
                              "Server certificate URL (optional)"
                          }
                        />
                      </div> :
                      null
                  }
                </div>
              </div>
            ) : null
        }
      </div>
    );
  }
}

export default ContentList;
