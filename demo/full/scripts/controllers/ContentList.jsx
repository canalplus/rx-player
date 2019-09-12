import React from "react";
import {
  hasLocalStorage,
  getLocalStorageContents,
  storeContent,
  removeStoredContent,
} from "../lib/localStorage.js";
import parseDRMConfigurations from "../lib/parseDRMConfigurations.js";
import Button from "../components/Button.jsx";
import FocusedTextInput from "../components/FocusedInput.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";

const MediaKeys_ = window.MediaKeys ||
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

const DISABLE_ENCRYPTED_CONTENT = !HAS_EME_APIs && !IS_HTTPS;

const URL_DENOMINATIONS = { DASH: "URL to the MPD",
                            Smooth: "URL to the Manifest",
                            DirectFile: "URL to the content" };

/**
 * Format content for using in component.
 * @param {Object} content
 * @returns {Object} - formatted content
 */
function formatContent(content) {
  let displayName = content.name;
  let isDisabled = false;
  let isLocalContent = false;

  if (IS_HTTPS) {
    if (!content.localContent && content.url.startsWith("http:")) {
      displayName = "[HTTP only] " + displayName;
      isDisabled = true;
    }
  } else if (!HAS_EME_APIs &&
             content.drmInfos &&
               content.drmInfos.length)
  {
    displayName = "[HTTPS only] " + displayName;
    isDisabled = true;
  }

  if (content.live) {
    displayName += " (live)";
  }

  if (content.localContent) {
    displayName = (hasLocalStorage ?  "[Stored] " : "[Saved] ") +
      displayName;
    isLocalContent = true;
  }

  return { url: content.url,
           contentName: content.name,
           id: content.id,
           transport: content.transport,
           supplementaryImageTracks: content.supplementaryImageTracks,
           supplementaryTextTracks: content.supplementaryTextTracks,
           drmInfos: content.drmInfos,
           displayName,
           isDisabled,
           isLowLatency: !!content.lowLatency,
           isLocalContent };
}

/**
 * Contruct list of contents per type of transport from:
 *   - contents stored in local storage (or just memory)
 *   - contents declared locally
 * @returns {Object}
 */
function constructContentList() {
  const localStorageContents = getLocalStorageContents();
  const reversedStoredContents = localStorageContents.slice().reverse();
  const storedAndRegularContents = reversedStoredContents
    .concat(contentsDatabase);
  return TRANSPORT_TYPES.reduce((acc, tech) => {
    const customLinkContent = { url: "",
                                contentName: "",
                                transport: tech,
                                drmInfos: [],
                                displayName: "Custom link",
                                isLocalContent: false,
                                isDisabled: false,
                                isLowLatency: false };
    acc[tech] = [customLinkContent]
      .concat(storedAndRegularContents
        .filter(({ transport }) => transport === tech.toLowerCase())
        .map(formatContent));
    return acc;
  }, {});
}

/**
 * Returns index of the first content to display according to all contents
 * available.
 * @param {Array.<Object>} contentList
 * @returns {number}
 */
function getIndexOfFirstEnabledContent(contentList) {
  let contentChoiceIndex = 1;
  if (contentList.length <= 0) {
    throw new Error("No content for the transport: ", TRANSPORT_TYPES[0]);
  }
  while(contentChoiceIndex < contentList.length &&
        contentList[contentChoiceIndex].isDisabled) {
    contentChoiceIndex++;
  }
  if (contentChoiceIndex >= contentList.length) {
    return 0;
  }
  return contentChoiceIndex;
}

class ContentList extends React.Component {
  constructor(...args) {
    super(...args);

    const contentsPerType = constructContentList();
    const transportType = TRANSPORT_TYPES[0];

    this.state = { autoPlay: true,
                   contentChoiceIndex: 0,
                   contentNameField: "",
                   contentsPerType,
                   currentDRMType: DRM_TYPES[0],
                   currentManifestURL: "",
                   displayDRMSettings: false,
                   isSavingOrUpdating: false,
                   licenseServerUrl: "",
                   lowLatencyChecked: false,
                   serverCertificateUrl: "",
                   transportType };
  }

  componentDidMount() {
    // estimate first index which should be selected
    const contentList = this.state.contentsPerType[this.state.transportType];
    const firstEnabledContentIndex = getIndexOfFirstEnabledContent(contentList);
    const content = contentList[firstEnabledContentIndex];
    this.changeSelectedContent(firstEnabledContentIndex, content);
  }

  /**
   * Load the given content through the player.
   * @param {Object} content
   */
  loadContent(content) {
    const { loadVideo, stopVideo } = this.props;
    const { autoPlay } = this.state;
    if (content == null) {
      stopVideo();
      return;
    }

    const { url,
            transport,
            supplementaryImageTracks,
            supplementaryTextTracks,
            isLowLatency,
            drmInfos = [] } = content;

    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({ url,
                    transport,
                    autoPlay,
                    supplementaryImageTracks,
                    supplementaryTextTracks,
                    textTrackMode: "html",
                    lowLatencyMode: isLowLatency,
                    keySystems });
      });
  }


  /**
   * @param {string} url
   * @param {Array.<Object>} drmInfos
   * @param {boolean} autoPlay
   */
  loadUrl(url, drmInfos, autoPlay) {
    const { loadVideo } = this.props;
    const { lowLatencyChecked } = this.state;

    parseDRMConfigurations(drmInfos)
      .then((keySystems) => {
        loadVideo({ url,
                    transport: this.state.transportType.toLowerCase(),
                    autoPlay,

                    // native browser subtitles engine (VTTCue) doesn"t render
                    // stylized subs.  We force HTML textTrackMode to vizualise
                    // styles.
                    textTrackMode: "html",
                    keySystems,
                    lowLatencyMode: lowLatencyChecked });
      });
  }

  /**
   * Update type of transport chosen.
   * @param {string} transportType
   */
  changeTransportType(transportType) {
    this.setState({ contentChoiceIndex: 0,
                    contentNameField: "",
                    currentDRMType: DRM_TYPES[0],
                    currentManifestURL: "",
                    displayDRMSettings: false,
                    isSavingOrUpdating: false,
                    licenseServerUrl: "",
                    lowLatencyChecked: false,
                    serverCertificateUrl: "",
                    transportType });
  }

  /**
   * Change the content chosen in the list.
   * @param {number} index - index in the lsit
   * @param {Object} content - content object
   */
  changeSelectedContent(index, content) {
    let currentManifestURL = "";
    let contentNameField = "";
    let licenseServerUrl = "";
    let serverCertificateUrl = "";
    const hasDRMSettings = content.drmInfos != null &&
                           content.drmInfos.length > 0;
    let drm  = null;
    currentManifestURL = content.url;
    contentNameField = content.contentName;
    const isLowLatency = !!content.isLowLatency;
    if (hasDRMSettings) {
      drm = content.drmInfos[0].drm;
      licenseServerUrl = content.drmInfos[0].licenseServerUrl;
      serverCertificateUrl = content.drmInfos[0].serverCertificateUrl;
    }
    this.setState({ contentChoiceIndex: index,
                    contentNameField,
                    currentDRMType: drm != null ? drm : DRM_TYPES[0],
                    currentManifestURL,
                    displayDRMSettings: hasDRMSettings,
                    isSavingOrUpdating: false,
                    lowLatencyChecked: isLowLatency,
                    licenseServerUrl,
                    serverCertificateUrl });
  }

  /**
   * Display/hide the DRM settings according to the checkbox state.
   * @param {Event} evt - Event sent by the checkbox when it was changed.
   */
  onChangeDisplayDRMSettings(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked :
      target.value;
    if (value) {
      this.setState({ displayDRMSettings: true });
      return;
    }
    this.setState({ displayDRMSettings: false,
                    licenseServerUrl: "",
                    serverCertificateUrl: "" });
  }

  /**
   * Enable/disable autoPlay according to the checkbox state.
   * @param {Event} evt - Event sent by the checkbox when it was changed.
   */
  onChangeAutoPlay(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({ autoPlay: value });
  }

  onLowLatencyClick(evt) {
    const { target } = evt;
    const value = target.type === "checkbox" ?
      target.checked : target.value;
    this.setState({ lowLatencyChecked: value });
  }

  render() {
    const { autoPlay,
            contentChoiceIndex,
            contentNameField,
            contentsPerType,
            currentDRMType,
            currentManifestURL,
            displayDRMSettings,
            isSavingOrUpdating,
            licenseServerUrl,
            lowLatencyChecked,
            serverCertificateUrl,
            transportType } = this.state;

    const isCustomContent = contentChoiceIndex === 0;

    const contentsToSelect = contentsPerType[transportType];
    const chosenContent = contentsToSelect[contentChoiceIndex];

    const hasURL = currentManifestURL !== "";
    const isLocalContent = !!(chosenContent &&
                              chosenContent.isLocalContent);

    const onTransportChange = (evt) => {
      const index = +evt.target.value;
      if (index >= 0) {
        const newTransportType = TRANSPORT_TYPES[index];
        this.changeTransportType(newTransportType);

        // update content selection
        const contents = contentsPerType[newTransportType];
        const firstEnabledContentIndex =
          getIndexOfFirstEnabledContent(contents);
        this.changeSelectedContent(firstEnabledContentIndex,
                                   contents[firstEnabledContentIndex]);
      }
    };

    const onContentChoiceChange = (evt) => {
      const index = +evt.target.value;
      const content = contentsToSelect[index];
      this.changeSelectedContent(index, content);
    };

    const onClickLoad = () => {
      if (contentChoiceIndex === 0) {
        const drmInfos = [{ licenseServerUrl,
                            serverCertificateUrl,
                            drm: currentDRMType }];
        this.loadUrl(currentManifestURL, drmInfos, autoPlay);
      } else {
        this.loadContent(contentsToSelect[contentChoiceIndex]);
      }
    };

    const saveCurrentContent = () => {
      const contentToSave = { name: contentNameField,
                              url: currentManifestURL,
                              lowLatency: lowLatencyChecked,
                              transport: transportType.toLowerCase(),
                              drmInfos: displayDRMSettings ?
                                [ { drm: currentDRMType,
                                    licenseServerUrl,
                                    serverCertificateUrl } ] :
                                undefined,
                              id: chosenContent.id };

      const storedContent = storeContent(contentToSave);

      // reconstruct list of contents
      const contentList = constructContentList();
      this.setState({ contentsPerType: contentList,
                      isSavingOrUpdating: false });

      // update content selection
      const contents = contentList[transportType];
      const firstEnabledContentIndex = contents
        .findIndex(c => c.id === storedContent.id);
      if (firstEnabledContentIndex < 0) {
        /* eslint-disable-next-line no-console */
        console.warn("Stored content not found in local storage.");
        this.changeSelectedContent(0, contents[0]);
      } else {
        this.changeSelectedContent(firstEnabledContentIndex,
                                   contents[firstEnabledContentIndex]);
      }
    };

    const onClickSaveOrUpdate = () =>
      this.setState({ isSavingOrUpdating: true });

    const onClickErase = () => {
      const content = contentsToSelect[contentChoiceIndex];
      if (content) {
        const hasRemoved = removeStoredContent(content.id);
        if (hasRemoved) {
          // reconstruct list of contents
          const contentList = constructContentList();
          this.setState({ contentsPerType: contentList });

          // update content selection
          const contents = contentList[transportType];
          if (contentChoiceIndex >= contentList.length) {
            this.changeSelectedContent(0, contents[0]);
          } else {
            this.changeSelectedContent(contentChoiceIndex,
                                       contents[contentChoiceIndex]);
          }
        }
      }
    };

    const onNameInput = (evt) =>
      this.setState({ contentNameField: evt.target.value });

    const onManifestInput = (evt) =>
      this.setState({ currentManifestURL: evt.target.value });

    const onLicenseServerInput = (evt) =>
      this.setState({ licenseServerUrl: evt.target.value });

    const onServerCertificateInput = (evt) =>
      this.setState({ serverCertificateUrl: evt.target.value });

    const onChangeDisplayDRMSettings = (evt) =>
      this.onChangeDisplayDRMSettings(evt);

    const onAutoPlayClick = (evt) =>
      this.onChangeAutoPlay(evt);

    const onLowLatencyClick = (evt) => {
      this.onLowLatencyClick(evt);
    };

    const onDRMTypeClick = (type) => {
      this.setState({ currentDRMType: type });
    };

    const onCancel = () => {
      this.setState({ isSavingOrUpdating: false });

      // re-load content
      this.changeSelectedContent(contentChoiceIndex, chosenContent);
    };

    const generateDRMButtons = () => {
      return DRM_TYPES.map(type =>
        <Button
          className={"choice-input-button drm-button" +
            (currentDRMType === type ? " selected" : "")}
          onClick={() => onDRMTypeClick(type)}
          value={type}
        />);
    };

    const selectValues = contentsToSelect.map(c => {
      return { name: c.displayName,
               disabled: c.isDisabled };
    });

    return (
      <div className="choice-inputs-wrapper">
        <div className="content-inputs">
          <div className="content-inputs-selects">
            <Select
              className="choice-input transport-type-choice white-select"
              onChange={onTransportChange}
              options={TRANSPORT_TYPES}
            />
            <Select
              className="choice-input content-choice white-select"
              onChange={onContentChoiceChange}
              options={selectValues}
              selected={contentChoiceIndex}
            />
          </div>
          <div className="content-inputs-middle">
            {
              (isCustomContent || isLocalContent) ?
                (<Button
                  className={"choice-input-button content-button enter-name-button" +
                    (!hasURL ? " disabled" : "")}
                  onClick={onClickSaveOrUpdate}
                  disabled={!hasURL || isSavingOrUpdating}
                  value={isLocalContent ?
                    (isSavingOrUpdating ? "Updating..." : "Update content") :
                    (isSavingOrUpdating ? "Saving..." : "Store content")}
                />) :
                null
            }
            {
              isLocalContent ?
                (<Button
                  className="choice-input-button erase-button"
                  onClick={onClickErase}
                  value={String.fromCharCode(0xf1f8)}
                />) :
                null
            }
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
          (isCustomContent || (isLocalContent && isSavingOrUpdating)) ?
            (
              <div className="custom-input-wrapper">
                {
                  isSavingOrUpdating ?
                    (<div className="update-control">
                      <FocusedTextInput
                        className={"text-input need-to-fill"}
                        onChange={onNameInput}
                        value={contentNameField}
                        placeholder={"Content name"}
                      />
                      <div className="update-control-buttons">
                        <Button
                          className={"choice-input-button content-button save-button"}
                          onClick={saveCurrentContent}
                          disabled={!contentNameField || !currentManifestURL}
                          value={isLocalContent ? "Update" : "Save"}
                        />
                        <Button
                          className={"choice-input-button content-button cancel-button"}
                          onClick={onCancel}
                          value={"Cancel"}
                        />
                      </div>
                    </div>)
                    : null
                }
                <TextInput
                  className="text-input"
                  onChange={onManifestInput}
                  value={currentManifestURL}
                  placeholder={
                    (URL_DENOMINATIONS[transportType] ||
                     `URL to the ${transportType} content`) +
                    (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
                  }
                />
                <div className="player-box">
                  <span className={"encryption-checkbox" + (DISABLE_ENCRYPTED_CONTENT ? " disabled" : "")}>
                    {(DISABLE_ENCRYPTED_CONTENT ? "[HTTPS only] " : "") + "Encrypted content"}
                    <label class="switch">
                      <input
                        disabled={DISABLE_ENCRYPTED_CONTENT}
                        name="displayDRMSettingsTextInput"
                        type="checkbox"
                        checked={displayDRMSettings}
                        onChange={onChangeDisplayDRMSettings}
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
                            placeholder={"License URL Server"}
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
                <div class="player-box button-low-latency">
                  Low-Latency content
                  <label class="input switch">
                    <input type="checkbox" checked={lowLatencyChecked} onChange={onLowLatencyClick} />
                    <span class="slider round"></span>
                  </label>
                </div>
              </div>
            ) : null
        }
      </div>
    );
  }
}

export default ContentList;
