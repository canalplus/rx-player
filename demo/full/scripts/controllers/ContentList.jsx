import React from "react";
import {
  hasLocalStorage,
  getLocalStorageContents,
  storeContent,
  removeStoredContent,
} from "../lib/localStorage.js";
import parseDRMConfigurations from "../lib/parseDRMConfigurations.js";
import {
  generateLinkForCustomContent,
  parseHashInURL,
} from "../lib/url_hash.js";
import Button from "../components/Button.jsx";
import FocusedTextInput from "../components/FocusedInput.jsx";
import TextInput from "../components/Input.jsx";
import Select from "../components/Select.jsx";
import contentsDatabase from "../contents.js";
import GenerateLinkButton from "../components/GenerateLinkButton.jsx";

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

  return { contentName: content.name,
           displayName,
           drmInfos: content.drmInfos,
           fallbackKeyError: !!content.fallbackKeyError,
           fallbackLicenseRequest: !!content.fallbackLicenseRequest,
           id: content.id,
           isDisabled,
           isLocalContent,
           isLowLatency: !!content.lowLatency,
           supplementaryImageTracks: content.supplementaryImageTracks,
           supplementaryTextTracks: content.supplementaryTextTracks,
           transport: content.transport,
           url: content.url };
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
 * Generate URL with hash-string which can be used to reload the page with the
 * current stored content or demo content. This can be used for example to
 * share some content with other people.
 * Returns null if it could not generate an URL for the current content.
 * @param {Object} content - The content object as constructed in the
 * ContentList.
 * @param {Object} state - The current ContentList state.
 * @returns {string|null}
 */
function generateLinkForContent(
  content,
  { autoPlay,
    transportType,
    fallbackKeyError,
    fallbackLicenseRequest },
) {
  if (content == null) {
    return null;
  }
  const licenseServerUrl = content.drmInfos && content.drmInfos[0] &&
    content.drmInfos[0].licenseServerUrl;
  const serverCertificateUrl = content.drmInfos && content.drmInfos[0] &&
    content.drmInfos[0].serverCertificateUrl;
  return generateLinkForCustomContent({
    autoPlay,
    drmType: content.drmInfos && content.drmInfos[0] && content.drmInfos[0].drm,
    fallbackKeyError,
    fallbackLicenseRequest,
    manifestURL: content.url,
    licenseServerUrl,
    lowLatency: !!content.isLowLatency,
    serverCertificateUrl,
    transport: transportType,
  });
}

/**
 * @param {HTMLElement} checkBoxElt
 * @returns {boolean}
 */
function getCheckBoxValue(checkBoxElt) {
  return checkBoxElt.type === "checkbox" ?
    !!checkBoxElt.checked : !!checkBoxElt.value;
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
                   displayGeneratedLink: false,
                   displayDRMSettings: false,
                   fallbackKeyError: false,
                   fallbackLicenseRequest: false,
                   isSavingOrUpdating: false,
                   licenseServerUrl: "",
                   lowLatencyChecked: false,
                   serverCertificateUrl: "",
                   transportType };
  }

  componentDidMount() {
    const parsedHash = parseHashInURL(location.hash);
    if (parsedHash !== null) {
      const { tech } = parsedHash;
      if (TRANSPORT_TYPES.includes(tech)) {
        const { fallbackKeyError,
                fallbackLicenseRequest,
                lowLatency } = parsedHash;
        const newState = { autoPlay: !parsedHash.noAutoplay,
                           contentChoiceIndex: 0,
                           contentNameField: "",
                           contentList: this.state.contentsPerType[tech],
                           currentManifestURL: parsedHash.manifest,
                           fallbackKeyError: !!fallbackKeyError,
                           fallbackLicenseRequest: !!fallbackLicenseRequest,
                           lowLatencyChecked: tech === "DASH" && !!lowLatency,
                           transportType: tech };

        const drmType = DRM_TYPES.includes(parsedHash.drm) ?
          parsedHash.drm : undefined;
        if (drmType !== undefined) {
          newState.displayDRMSettings = true;
          newState.currentDRMType = drmType;
          newState.licenseServerUrl = parsedHash.licenseServ || "";
          newState.serverCertificateUrl = parsedHash.certServ || "";
        }
        this.setState(newState);
        return;
      }
    }

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
            fallbackKeyError,
            fallbackLicenseRequest,
            supplementaryImageTracks,
            supplementaryTextTracks,
            isLowLatency,
            drmInfos = [] } = content;

    parseDRMConfigurations(drmInfos,
                           { fallbackLicenseRequest, fallbackKeyError })
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
    const { lowLatencyChecked,
            fallbackKeyError,
            fallbackLicenseRequest } = this.state;

    parseDRMConfigurations(drmInfos,
                           { fallbackLicenseRequest, fallbackKeyError })
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
                    displayGeneratedLink: false,
                    fallbackLicenseRequest: false,
                    fallbackKeyError: false,
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
    const fallbackKeyError = !!content.fallbackKeyError;
    const fallbackLicenseRequest = !!content.fallbackLicenseRequest;
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
                    displayGeneratedLink: false,
                    fallbackLicenseRequest,
                    fallbackKeyError,
                    isSavingOrUpdating: false,
                    lowLatencyChecked: isLowLatency,
                    licenseServerUrl,
                    serverCertificateUrl });
  }

  render() {
    const { autoPlay,
            contentChoiceIndex,
            contentNameField,
            contentsPerType,
            currentDRMType,
            currentManifestURL,
            displayGeneratedLink,
            displayDRMSettings,
            fallbackKeyError,
            fallbackLicenseRequest,
            isSavingOrUpdating,
            licenseServerUrl,
            lowLatencyChecked,
            serverCertificateUrl,
            transportType } = this.state;

    const isCustomContent = contentChoiceIndex === 0;

    const contentsToSelect = contentsPerType[transportType];
    const chosenContent = contentsToSelect[contentChoiceIndex];

    let generatedLink = null;
    if (displayGeneratedLink) {
      generatedLink = contentChoiceIndex === 0 || isSavingOrUpdating ?
        generateLinkForCustomContent({
          autoPlay,
          drmType: displayDRMSettings ?
            currentDRMType :
            undefined,
          fallbackKeyError,
          fallbackLicenseRequest,
          manifestURL: currentManifestURL,
          licenseServerUrl: displayDRMSettings ?
            licenseServerUrl :
            undefined,
          lowLatency: lowLatencyChecked,
          serverCertificateUrl: displayDRMSettings ?
            serverCertificateUrl :
            undefined,
          transport: transportType,
        }) : generateLinkForContent(chosenContent, this.state);
    }

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
                              fallbackLicenseRequest,
                              fallbackKeyError,
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

    const onChangeDisplayDRMSettings = (evt) => {
      const value = getCheckBoxValue(evt.target);
      if (value) {
        this.setState({ displayDRMSettings: true });
        return;
      }
      this.setState({ displayDRMSettings: false,
                      licenseServerUrl: "",
                      serverCertificateUrl: "" });
    };

    const onAutoPlayClick = (evt) =>
      this.setState({ autoPlay: getCheckBoxValue(evt.target) });

    const onLowLatencyClick = (evt) => {
      this.setState({ lowLatencyChecked: getCheckBoxValue(evt.target) });
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

    const onClickGenerateLink = () => {
      this.setState({ displayGeneratedLink: !displayGeneratedLink });
    };

    const onChangeFallbackLicenseRequest = (evt) => {
      this.setState({ fallbackLicenseRequest: getCheckBoxValue(evt.target) });
    };

    const onChangeFallbackKeyError = (evt) => {
      this.setState({ fallbackKeyError: getCheckBoxValue(evt.target) });
    };

    const selectValues = contentsToSelect.map(c => {
      return { name: c.displayName,
               disabled: c.isDisabled };
    });

    return (
      <div className="choice-inputs-wrapper">
        <span className={"generated-url" + (displayGeneratedLink ? " enabled" : "")}>
          { displayGeneratedLink ?
            [
              "URL : ",
              generatedLink ?
                <a className="generated-url-link" href={generatedLink}>
                  {generatedLink}
                </a> :
                <a className="generated-url-link none">
                  Not a valid content!
                </a>,
            ] : ""
          }
        </span>
        <div className="content-inputs">
          <div className="content-inputs-selects">
            <Select
              className="choice-input transport-type-choice white-select"
              ariaLabel="Select a transport"
              onChange={onTransportChange}
              options={TRANSPORT_TYPES}
              selected={TRANSPORT_TYPES.indexOf(transportType)}
            />
            <Select
              className="choice-input content-choice white-select"
              ariaLabel="Select a content"
              onChange={onContentChoiceChange}
              options={selectValues}
              selected={contentChoiceIndex}
            />
          </div>
          <div className="content-inputs-middle">
            {
              (isCustomContent || isLocalContent) ?
                ([
                  <Button
                    className={"choice-input-button content-button enter-name-button" +
                      (!hasURL ? " disabled" : "")}
                    ariaLabel="Save or update custom content"
                    onClick={onClickSaveOrUpdate}
                    disabled={!hasURL || isSavingOrUpdating}
                    value={isLocalContent ?
                      (isSavingOrUpdating ? "Updating..." : "Update content") :
                      (isSavingOrUpdating ? "Saving..." : "Store content")}
                  />,
                  <GenerateLinkButton
                    enabled={displayGeneratedLink}
                    onClick={onClickGenerateLink} />,
                ]) :
                null
            }
            {
              isLocalContent ?
                (<Button
                  className="choice-input-button erase-button"
                  ariaLabel="Remove custom content from saved contents"
                  onClick={onClickErase}
                  value={String.fromCharCode(0xf1f8)}
                />) :
                null
            }
          </div>
          <div className="choice-input-button-wrapper">
            <div className="auto-play">
              AutoPlay
              <label className="input switch">
                <input
                  type="checkbox"
                  aria-label="Enable/Disable AutoPlay"
                  checked={autoPlay}
                  onChange={onAutoPlayClick}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <Button
              className="choice-input-button load-button"
              ariaLabel="Load the selected content now"
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
                        ariaLabel="Name of the custom content to save"
                        onChange={onNameInput}
                        value={contentNameField}
                        placeholder={"Content name"}
                      />
                      <div className="update-control-buttons">
                        <Button
                          className={"choice-input-button content-button save-button"}
                          ariaLabel="Save/Update custom content"
                          onClick={saveCurrentContent}
                          disabled={!contentNameField || !currentManifestURL}
                          value={isLocalContent ? "Update" : "Save"}
                        />
                        <Button
                          ariaLabel="Cancel current modifications for the custom content"
                          className={"choice-input-button content-button cancel-button"}
                          onClick={onCancel}
                          value={"Cancel"}
                        />
                      </div>
                    </div>)
                    : null
                }
                <TextInput
                  ariaLabel="Enter here the Manifest's URL"
                  className="text-input"
                  onChange={onManifestInput}
                  value={currentManifestURL}
                  placeholder={
                    (URL_DENOMINATIONS[transportType] ||
                     `URL to the ${transportType} content`) +
                    (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
                  }
                />
                <div className="player-box player-box-load">
                  <span className={
                    "encryption-checkbox custom-checkbox" +
                    (DISABLE_ENCRYPTED_CONTENT ? " disabled" : "")}
                  >
                    {(DISABLE_ENCRYPTED_CONTENT ? "[HTTPS only] " : "") + "Encrypted content"}
                    <label className="switch">
                      <input
                        aria-label="Enable for an encrypted content"
                        disabled={DISABLE_ENCRYPTED_CONTENT}
                        name="displayDRMSettingsTextInput"
                        type="checkbox"
                        checked={displayDRMSettings}
                        onChange={onChangeDisplayDRMSettings}
                      />
                      <span className="slider round"></span>
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
                            ariaLabel="URL for the license server"
                            className="choice-input text-input"
                            onChange={onLicenseServerInput}
                            value={licenseServerUrl}
                            placeholder={"License URL Server"}
                          />
                        </div>
                        <TextInput
                          ariaLabel="URL for the server certificate (optional)"
                          className="choice-input text-input"
                          onChange={onServerCertificateInput}
                          value={serverCertificateUrl}
                          placeholder={"Server certificate URL (optional)"}
                        />
                        <div>
                          <span className={"custom-checkbox fallback-checkbox"}>
                            <span>
                              {"Fallback if a key is refused "}
                              <span className="checkbox-indication">
                                (for content with multiple keys)
                              </span>
                            </span>
                            <label className="input switch fallback-switch">
                              <input
                                type="checkbox"
                                checked={fallbackKeyError}
                                onChange={onChangeFallbackKeyError} />
                              <span className="slider round"></span>
                            </label>
                          </span>
                        </div>
                        <div>
                          <span className={"custom-checkbox fallback-checkbox"}>
                            <span>
                              {"Fallback if the license request fails "}
                              <span className="checkbox-indication">
                                (for content with multiple keys)
                              </span>
                            </span>
                            <label className="input switch fallback-switch">
                              <input
                                type="checkbox"
                                checked={fallbackLicenseRequest}
                                onChange={onChangeFallbackLicenseRequest} />
                              <span className="slider round"></span>
                            </label>
                          </span>
                        </div>
                      </div> :
                      null
                  }
                </div>
                { transportType === "DASH" ?
                  <div className="player-box player-box-load button-low-latency">
                    <span className={"low-latency-checkbox custom-checkbox"}>
                      Low-Latency content
                      <label className="input switch">
                        <input
                          aria-label="Enable for a low-latency content"
                          type="checkbox"
                          checked={lowLatencyChecked}
                          onChange={onLowLatencyClick}
                        />
                        <span className="slider round"></span>
                      </label>
                    </span>
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
