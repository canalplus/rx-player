import * as React from "react";
import {
  hasLocalStorage,
  getLocalStorageContents,
  storeContent,
  removeStoredContent,
} from "../lib/localStorage";
import type { IContentInfo, IStoredContentInfo } from "../lib/localStorage";
import parseDRMConfigurations from "../lib/parseDRMConfigurations";
import { ContentConfig, parseHashInURL } from "../lib/url_hash";
import Button from "../components/Button";
import Checkbox from "../components/CheckBox";
import FocusedTextInput from "../components/FocusedInput";
import TextInput from "../components/Input";
import Select from "../components/Select";
import DEFAULT_CONTENTS from "../contents";
import type { IDefaultContent, IDrmInfo } from "../contents";
import type { IKeySystemOption, ILoadVideoOptions } from "../../../../src/public_types";

/* eslint-disable */
const win = window as any;
const MediaKeys_ =
  win.MediaKeys || win.MozMediaKeys || win.WebKitMediaKeys || win.MSMediaKeys || null;

const HAS_EME_APIs =
  typeof navigator.requestMediaKeySystemAccess === "function" ||
  (MediaKeys_ != null &&
    MediaKeys_.prototype &&
    typeof MediaKeys_.isTypeSupported === "function") ||
  typeof (HTMLVideoElement.prototype as any).webkitGenerateKeyRequest === "function";
/* eslint-enable */

const IS_HTTPS = window.location.protocol.startsWith("https");

const CUSTOM_DRM_NAME = "Other";

const TRANSPORT_TYPES = ["DASH", "Smooth", "DirectFile", "MetaPlaylist"];
const DRM_TYPES = ["Widevine", "Playready", "Clearkey", CUSTOM_DRM_NAME];

const DISABLE_ENCRYPTED_CONTENT = !HAS_EME_APIs && !IS_HTTPS;

const URL_DENOMINATIONS: Partial<Record<string, string>> = {
  DASH: "URL to the MPD",
  Smooth: "URL to the Manifest",
  DirectFile: "URL to the content",
};

interface IPlayableContent {
  url: string | undefined;
  transport: string | undefined;
  fallbackKeyError: boolean | undefined;
  fallbackLicenseRequest: boolean | undefined;
  isLowLatency: boolean;
  drmInfos: IDrmInfo[] | null;
}

/** Contents that exist in the preset list have a name, an id, ...
 *  Custom contents does not have such infos
 */
interface IDisplayedContent extends IPlayableContent {
  contentName: string;
  displayName: string;
  id: number | undefined;
  isDisabled: boolean;
  isLocalContent: boolean;
}

/**
 * Format content for using in component.
 * @param {Object} content
 * @returns {Object} - formatted content
 */
function formatContent(content: IStoredContentInfo | IDefaultContent): IDisplayedContent {
  let displayName = content.name ?? "undefined";
  let isDisabled = false;
  let isLocalContent = false;
  const url = content.url ?? "";

  if (IS_HTTPS) {
    if ("localContent" in content && !content.localContent && url.startsWith("http:")) {
      displayName = "[HTTP only] " + displayName;
      isDisabled = true;
    }
  } else if (!HAS_EME_APIs && content.drmInfos && content.drmInfos.length) {
    displayName = "[HTTPS only] " + displayName;
    isDisabled = true;
  }

  if ("live" in content && content.live) {
    displayName += " (live)";
  }

  if ("localContent" in content && content.localContent) {
    displayName = (hasLocalStorage ? "[Stored] " : "[Saved] ") + displayName;
    isLocalContent = true;
  }

  return {
    contentName: content.name ?? "undefined",
    displayName,
    drmInfos: content.drmInfos ?? null,
    fallbackKeyError: "fallbackKeyError" in content && content.fallbackKeyError,
    fallbackLicenseRequest:
      "fallbackLicenseRequest" in content && content.fallbackLicenseRequest,
    id: "id" in content ? content.id : undefined,
    isDisabled,
    isLocalContent,
    isLowLatency: "lowLatency" in content && !!content.lowLatency,
    transport: content.transport,
    url,
  };
}

/**
 * Contruct list of contents per type of transport from:
 *   - contents stored in local storage (or just memory)
 *   - contents declared locally
 * @returns {Object}
 */
function constructContentList(): Partial<Record<string, IDisplayedContent[]>> {
  const localStorageContents = getLocalStorageContents();
  const reversedStoredContents = localStorageContents.slice().reverse();
  const storedAndRegularContents = [...reversedStoredContents, ...DEFAULT_CONTENTS];
  return TRANSPORT_TYPES.reduce(
    (acc: Partial<Record<string, IDisplayedContent[]>>, tech: string) => {
      const customLinkContent: IDisplayedContent = {
        url: "",
        contentName: "",
        transport: tech,
        drmInfos: null,
        displayName: "Custom link",
        isLocalContent: false,
        isDisabled: false,
        isLowLatency: false,
        fallbackKeyError: undefined,
        fallbackLicenseRequest: undefined,
        id: undefined,
      };

      const contents: IDisplayedContent[] = storedAndRegularContents
        .filter(({ transport }) => transport === tech.toLowerCase())
        .map(formatContent);

      acc[tech] = [customLinkContent].concat(contents);
      return acc;
    },
    {},
  );
}
/**
 * Generate a config object which can be used to reload the page with the
 * current stored content or demo content. This can be used for example to
 * share some content with other people.
 * Returns null if it could not generate a config for the current content.
 * @param {Object} content - The content object as constructed in the
 * ContentList.
 * @param {Object} state - The current ContentList state.
 * @returns {Object|null} The content config
 */
function generateConfigForContent(
  content: IPlayableContent,
  {
    transportType,
    fallbackKeyError,
    fallbackLicenseRequest,
  }: {
    transportType: string;
    fallbackKeyError: boolean;
    fallbackLicenseRequest: boolean;
  },
): ContentConfig | null {
  if (content == null) {
    return null;
  }
  const drmInfos = content.drmInfos && content.drmInfos[0];
  const licenseServerUrl = drmInfos && drmInfos.licenseServerUrl;
  const serverCertificateUrl = drmInfos && drmInfos.serverCertificateUrl;
  return {
    chosenDRMType: content.drmInfos?.[0]?.drm,
    customKeySystem: content.drmInfos?.[0]?.customKeySystem ?? undefined,
    fallbackKeyError,
    fallbackLicenseRequest,
    manifestURL: content.url,
    licenseServerUrl: licenseServerUrl ?? undefined,
    lowLatency: !!content.isLowLatency,
    serverCertificateUrl: serverCertificateUrl ?? undefined,
    transport: transportType,
  };
}

/**
 * Returns index of the first content to display according to all contents
 * available.
 * @param {Array.<Object>} contentList
 * @returns {number}
 */
function getIndexOfFirstEnabledContent(contentList: IDisplayedContent[]): number {
  let contentChoiceIndex = 1;
  if (contentList.length <= 0) {
    throw new Error("No content for the transport: " + TRANSPORT_TYPES[0]);
  }
  while (
    contentChoiceIndex < contentList.length &&
    contentList[contentChoiceIndex].isDisabled
  ) {
    contentChoiceIndex++;
  }
  if (contentChoiceIndex >= contentList.length) {
    return 0;
  }
  return contentChoiceIndex;
}

/**
 * @param {Array.<Object>} drmInfos
 * @param {Object} fallbacks
 * @returns {Promise.<Array.<Object>>}
 */
function getKeySystemsOption(
  drmInfos: IDrmInfo[],
  {
    fallbackKeyError,
    fallbackLicenseRequest,
  }: {
    fallbackKeyError: boolean;
    fallbackLicenseRequest: boolean;
  },
): Promise<IKeySystemOption[]> {
  const wantedDRMs = drmInfos
    .map((drmInfo) => ({
      drm: drmInfo.drm === CUSTOM_DRM_NAME ? drmInfo.customKeySystem : drmInfo.drm,
      licenseServerUrl: drmInfo.licenseServerUrl,
      serverCertificateUrl: drmInfo.serverCertificateUrl,
      fallbackKeyError,
      fallbackLicenseRequest,
    }))

    // TODO better way of explaining to TypeScript what's going on here
    .filter((drmInfo) => drmInfo.drm !== undefined) as Array<{
    drm: string;
    fallbackKeyError: boolean;
    fallbackLicenseRequest: boolean;
    licenseServerUrl: string;
    serverCertificateUrl: string | undefined;
  }>;

  return parseDRMConfigurations(wantedDRMs);
}

function getLoadVideoOptions(content: IPlayableContent): Promise<ILoadVideoOptions> {
  const {
    url,
    transport,
    fallbackKeyError,
    fallbackLicenseRequest,
    isLowLatency,
    drmInfos,
  } = content;
  return new Promise((resolve, reject) => {
    getKeySystemsOption(drmInfos ?? [], {
      fallbackKeyError: !!fallbackKeyError,
      fallbackLicenseRequest: !!fallbackLicenseRequest,
    }).then(
      (keySystems) => {
        resolve({
          url: url ?? "",
          transport: transport ?? "",
          textTrackMode: "html",
          lowLatencyMode: isLowLatency,
          keySystems,
        });
      },
      () => reject("Could not construct key systems option"),
    );
  });
}

function ContentList({
  loadVideo,
  onContentConfigChange,
  showOptions,
  onOptionToggle,
  isReactiveURLEnabled,
  onIsReactiveURLEnabledChange,
}: {
  loadVideo: (opts: ILoadVideoOptions) => void;
  onContentConfigChange: (config: ContentConfig) => void;
  showOptions: boolean;
  onOptionToggle: () => void;
  isReactiveURLEnabled: boolean;
  onIsReactiveURLEnabledChange: (newVal: boolean) => void;
}): JSX.Element {
  const initialContents = React.useMemo(() => {
    return constructContentList();
  }, []);
  const [transportType, setTransportType] = React.useState(TRANSPORT_TYPES[0]);
  const [contentChoiceIndex, setContentChoiceIndex] = React.useState(0);
  const [contentNameField, setContentNameField] = React.useState("");
  const [contentsPerType, setContentsPerType] = React.useState(initialContents);
  // TODO?
  // const [contentList, setContentList] = React.useState(initialContents);
  const [chosenDRMType, setChosenDRMType] = React.useState(DRM_TYPES[0]);
  const [customKeySystem, setCustomKeySystem] = React.useState("");
  const [currentManifestURL, setCurrentManifestUrl] = React.useState("");
  const [shouldDisplayDRMSettings, setShouldDisplayDRMSettings] = React.useState(false);
  const [shouldFallbackOnKeyError, setShouldFallbackOnKeyError] = React.useState(false);
  const [shouldFallbackOnLicenseReqError, setShouldFallbackOnLicenseReqError] =
    React.useState(false);
  const [isSavingOrUpdating, setIsSavingOrUpdating] = React.useState(false);
  const [licenseServerUrl, setLicenseServerUrl] = React.useState("");
  const [serverCertificateUrl, setServerCertificateUrl] = React.useState("");
  const [isLowLatencyChecked, setIsLowLatencyChecked] = React.useState(false);
  const [isAlreadyLoading, setIsAlreadyLoading] = React.useState(false);

  /**
   * Load the given content through the player.
   * @param {Object|null} content
   */
  const loadContent = React.useCallback(
    async (content: IPlayableContent) => {
      if (!isAlreadyLoading) {
        setIsAlreadyLoading(true);
        try {
          const loadVideoOptions = await getLoadVideoOptions(content);
          loadVideo(loadVideoOptions);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        } finally {
          setIsAlreadyLoading(false);
        }
      }
    },
    [loadVideo],
  );

  /**
   * Change the content chosen in the list.
   * @param {number} index - index in the lsit
   * @param {Object} content - content object
   */
  const changeSelectedContent = React.useCallback(
    (index: number, content: IDisplayedContent): void => {
      const fallbackKeyError = !!content.fallbackKeyError;
      const fallbackLicenseRequest = !!content.fallbackLicenseRequest;
      const isLowLatency = !!content.isLowLatency;

      let hasDRMSettings = false;
      let drm = null;
      let customKeySystem = "";
      let licenseServerUrl = "";
      let serverCertificateUrl = "";
      if (content.drmInfos != null && content.drmInfos.length > 0) {
        hasDRMSettings = true;
        drm = content.drmInfos[0].drm;
        customKeySystem = content.drmInfos[0].customKeySystem || "";
        licenseServerUrl = content.drmInfos[0].licenseServerUrl;
        serverCertificateUrl = content.drmInfos[0].serverCertificateUrl ?? "";
      }
      setContentChoiceIndex(index);
      setContentNameField(content.contentName);
      setChosenDRMType(drm ?? DRM_TYPES[0]);
      setCustomKeySystem(customKeySystem);
      setCurrentManifestUrl(content.url ?? "");
      setShouldDisplayDRMSettings(hasDRMSettings);
      setShouldFallbackOnLicenseReqError(fallbackLicenseRequest);
      setShouldFallbackOnKeyError(fallbackKeyError);
      setIsSavingOrUpdating(false);
      setIsLowLatencyChecked(isLowLatency);
      setLicenseServerUrl(licenseServerUrl);
      setServerCertificateUrl(serverCertificateUrl);
    },
    [],
  );

  React.useEffect(() => {
    const parsedHash = parseHashInURL(decodeURI(location.hash));
    if (parsedHash !== null) {
      const { tech } = parsedHash;
      if (typeof tech === "string" && TRANSPORT_TYPES.includes(tech)) {
        const { fallbackKeyError, fallbackLicenseRequest, lowLatency } = parsedHash;
        setContentChoiceIndex(0);
        setContentNameField("");
        if (typeof parsedHash.manifest === "string") {
          setCurrentManifestUrl(parsedHash.manifest);
        }
        setShouldFallbackOnKeyError(!!fallbackKeyError);
        setShouldFallbackOnLicenseReqError(!!fallbackLicenseRequest);
        setIsLowLatencyChecked(tech === "DASH" && !!lowLatency);
        setTransportType(tech);

        const chosenDRMType =
          typeof parsedHash.drm === "string" && DRM_TYPES.includes(parsedHash.drm)
            ? parsedHash.drm
            : undefined;

        if (chosenDRMType !== undefined) {
          setShouldDisplayDRMSettings(true);
          setChosenDRMType(chosenDRMType);
          if (typeof parsedHash.customKeySystem === "string") {
            setCustomKeySystem(parsedHash.customKeySystem);
          }
          if (typeof parsedHash.licenseServ === "string") {
            setLicenseServerUrl(parsedHash.licenseServ);
          }
          if (typeof parsedHash.certServ === "string") {
            setServerCertificateUrl(parsedHash.certServ);
          }
        }
        return;
      }
    }

    // estimate first index which should be selected
    const contentList = contentsPerType[transportType] ?? [];
    const firstEnabledContentIndex = getIndexOfFirstEnabledContent(contentList);
    const content = contentList[firstEnabledContentIndex];
    changeSelectedContent(firstEnabledContentIndex, content);
  }, []);

  const contentsToSelect = contentsPerType[transportType] ?? [];
  const chosenContent = contentsToSelect[contentChoiceIndex];

  const isCustomContent = contentChoiceIndex === 0;

  const isCustomDRM = chosenDRMType === CUSTOM_DRM_NAME;

  const hasURL = currentManifestURL !== "";

  const isLocalContent = !!(chosenContent && chosenContent.isLocalContent);

  const onTransportChange = React.useCallback(
    ({ value }: { value: string; index: number }) => {
      setContentChoiceIndex(0);
      setContentNameField("");
      setChosenDRMType(DRM_TYPES[0]);
      setCustomKeySystem("");
      setCurrentManifestUrl("");
      setShouldDisplayDRMSettings(false);
      setShouldFallbackOnLicenseReqError(false);
      setShouldFallbackOnKeyError(false);
      setIsSavingOrUpdating(false);
      setLicenseServerUrl("");
      setIsLowLatencyChecked(false);
      setServerCertificateUrl("");
      setTransportType(value);

      const contents = contentsPerType[value] ?? [];
      const firstEnabledContentIndex = getIndexOfFirstEnabledContent(contents);
      changeSelectedContent(firstEnabledContentIndex, contents[firstEnabledContentIndex]);
    },
    [contentsPerType, changeSelectedContent],
  );
  React.useEffect(() => {
    const isCustomizedContent = contentChoiceIndex === 0 || isSavingOrUpdating;
    let config: ContentConfig | null;
    if (isCustomizedContent) {
      config = {
        chosenDRMType: shouldDisplayDRMSettings ? chosenDRMType : undefined,
        customKeySystem: shouldDisplayDRMSettings ? customKeySystem : undefined,
        fallbackKeyError: shouldFallbackOnKeyError,
        fallbackLicenseRequest: shouldFallbackOnLicenseReqError,
        manifestURL: currentManifestURL,
        licenseServerUrl: shouldDisplayDRMSettings ? licenseServerUrl : undefined,
        lowLatency: isLowLatencyChecked,
        serverCertificateUrl: shouldDisplayDRMSettings ? serverCertificateUrl : undefined,
        transport: transportType,
      };
    } else {
      config = generateConfigForContent(chosenContent, {
        transportType: transportType,
        fallbackKeyError: shouldFallbackOnKeyError,
        fallbackLicenseRequest: shouldFallbackOnLicenseReqError,
      });
    }
    if (config !== null) {
      onContentConfigChange(config);
    }
  }, [
    contentChoiceIndex,
    isSavingOrUpdating,
    shouldDisplayDRMSettings,
    chosenDRMType,
    customKeySystem,
    shouldFallbackOnKeyError,
    shouldFallbackOnLicenseReqError,
    currentManifestURL,
    licenseServerUrl,
    isLowLatencyChecked,
    serverCertificateUrl,
    transportType,
    chosenContent,
  ]);

  const onContentChoiceChange = React.useCallback(
    ({ index }: { index: number }): void => {
      const content = contentsToSelect[index];
      changeSelectedContent(index, content);
    },
    [contentsToSelect, changeSelectedContent],
  );

  const onClickLoad = () => {
    let content: IPlayableContent;
    if (contentChoiceIndex === 0) {
      content = {
        url: currentManifestURL,
        transport: transportType.toLowerCase(),
        fallbackKeyError: !!shouldFallbackOnKeyError,
        fallbackLicenseRequest: !!shouldFallbackOnLicenseReqError,
        isLowLatency: isLowLatencyChecked,
        drmInfos: [
          {
            licenseServerUrl,
            serverCertificateUrl,
            drm: chosenDRMType,
            customKeySystem,
          },
        ],
      };
    } else {
      content = contentsToSelect[contentChoiceIndex];
    }
    loadContent(content);
  };

  const saveCurrentContent = () => {
    const contentToSave: IContentInfo = {
      name: contentNameField,
      url: currentManifestURL,
      fallbackLicenseRequest: shouldFallbackOnLicenseReqError,
      fallbackKeyError: shouldFallbackOnKeyError,
      lowLatency: isLowLatencyChecked,
      transport: transportType.toLowerCase(),
      drmInfos: shouldDisplayDRMSettings
        ? [
            {
              drm: chosenDRMType,
              customKeySystem,
              licenseServerUrl,
              serverCertificateUrl,
            },
          ]
        : null,
      id: chosenContent.id,
    };

    const storedContent = storeContent(contentToSave);

    // reconstruct list of contents
    const contentList = constructContentList();
    setContentsPerType(contentList);
    setIsSavingOrUpdating(false);

    // update content selection
    const contents = contentList[transportType] ?? [];
    const firstEnabledContentIndex = contents.findIndex((c) => c.id === storedContent.id);
    if (firstEnabledContentIndex < 0) {
      /* eslint-disable-next-line no-console */
      console.warn("Stored content not found in local storage.");
      changeSelectedContent(0, contents[0]);
    } else {
      changeSelectedContent(firstEnabledContentIndex, contents[firstEnabledContentIndex]);
    }
  };

  const onClickSaveOrUpdate = React.useCallback(() => {
    setIsSavingOrUpdating(true);
  }, []);

  const onClickErase = React.useCallback(() => {
    const content = contentsToSelect[contentChoiceIndex];
    if (content) {
      if (content.id === undefined) {
        /* eslint-disable-next-line no-console */
        console.error("Cannot erase: no id on the content");
        return;
      }
      const hasRemoved = removeStoredContent(content.id);
      if (hasRemoved) {
        // reconstruct list of contents
        const contentList = constructContentList();
        setContentsPerType(contentList);

        // update content selection
        const contents = contentList[transportType] ?? [];
        if (contentChoiceIndex >= contents.length) {
          changeSelectedContent(0, contents[0]);
        } else {
          changeSelectedContent(contentChoiceIndex, contents[contentChoiceIndex]);
        }
      }
    }
  }, [contentsToSelect, contentChoiceIndex]);

  const onNameInput = React.useCallback((name: string) => {
    setContentNameField(name);
  }, []);

  const onManifestInput = React.useCallback((manifestUrl: string) => {
    setCurrentManifestUrl(manifestUrl);
  }, []);

  const onCustomKeySystemInput = React.useCallback((customKs: string) => {
    setCustomKeySystem(customKs);
  }, []);

  const onLicenseServerInput = React.useCallback((licenseServUrl: string) => {
    setLicenseServerUrl(licenseServUrl);
  }, []);

  const onServerCertificateInput = React.useCallback((serverCertUrl: string) => {
    setServerCertificateUrl(serverCertUrl);
  }, []);

  const onChangeDisplayDRMSettings = React.useCallback((shouldDisplay: boolean) => {
    if (shouldDisplay) {
      setShouldDisplayDRMSettings(true);
    } else {
      setShouldDisplayDRMSettings(false);
      setLicenseServerUrl("");
      setServerCertificateUrl("");
    }
  }, []);

  const onLowLatencyClick = React.useCallback((value: boolean) => {
    setIsLowLatencyChecked(value);
  }, []);

  const onDRMTypeClick = React.useCallback((value: string) => {
    setChosenDRMType((oldType: string) => {
      if (oldType === value) {
        return value;
      }
      setCustomKeySystem("");
      return value;
    });
  }, []);

  const onCancel = React.useCallback(() => {
    setIsSavingOrUpdating(false);

    // re-load content
    changeSelectedContent(contentChoiceIndex, chosenContent);
  }, [changeSelectedContent, contentChoiceIndex, chosenContent]);

  const generateDRMButtons = React.useCallback(() => {
    return DRM_TYPES.map((typ) => (
      <span key={typ}>
        <Button
          className={
            "choice-input-button drm-button" + (chosenDRMType === typ ? " selected" : "")
          }
          ariaLabel="Key system choice"
          onClick={() => onDRMTypeClick(typ)}
          value={typ}
          disabled={false}
        />
      </span>
    ));
  }, [onDRMTypeClick, chosenDRMType]);

  const onChangeFallbackLicenseRequest = React.useCallback((should: boolean) => {
    setShouldFallbackOnLicenseReqError(should);
  }, []);

  const onChangeFallbackKeyError = React.useCallback((should: boolean) => {
    setShouldFallbackOnKeyError(should);
  }, []);

  const selectValues = React.useMemo(() => {
    return contentsToSelect.map((c) => {
      return { name: c.displayName, disabled: c.isDisabled };
    });
  }, [contentsToSelect]);

  return (
    <div className="choice-inputs-wrapper">
      <div className="content-inputs">
        <div className="content-inputs-selects">
          <Select
            className="choice-input transport-type-choice white-select"
            ariaLabel="Select a transport"
            name="transport"
            onChange={onTransportChange}
            options={TRANSPORT_TYPES}
            selected={{ index: undefined, value: transportType }}
            disabled={false}
          />
          <Select
            className="choice-input content-choice white-select"
            ariaLabel="Select a content"
            name="content"
            onChange={onContentChoiceChange}
            options={selectValues}
            selected={{ index: contentChoiceIndex, value: undefined }}
            disabled={false}
          />
        </div>
        <div className="content-inputs-middle">
          {isCustomContent || isLocalContent ? (
            <Button
              key={0}
              className={
                "choice-input-button content-button enter-name-button" +
                (!hasURL ? " disabled" : "")
              }
              ariaLabel="Save or update custom content"
              onClick={onClickSaveOrUpdate}
              disabled={!hasURL || isSavingOrUpdating}
              value={
                isLocalContent
                  ? isSavingOrUpdating
                    ? "Updating..."
                    : "Update content"
                  : isSavingOrUpdating
                    ? "Saving..."
                    : "Store content"
              }
            />
          ) : null}
          <Checkbox
            className="enable-reactive-url"
            ariaLabel="Enable reactive url"
            checked={isReactiveURLEnabled}
            onChange={onIsReactiveURLEnabledChange}
            name="enableReactiveUrl"
          >
            Store config in URL
          </Checkbox>

          {isLocalContent ? (
            <Button
              className="choice-input-button erase-button"
              ariaLabel="Remove custom content from saved contents"
              onClick={onClickErase}
              value={String.fromCharCode(0xf1f8)}
              disabled={false}
            />
          ) : null}
        </div>
        <div className="choice-input-button-wrapper">
          <Checkbox
            className="show-options"
            ariaLabel="Show player options"
            checked={showOptions}
            onChange={onOptionToggle}
            name="showOptions"
          >
            Show Options
          </Checkbox>
          <Button
            className="choice-input-button load-button"
            ariaLabel="Load the selected content now"
            onClick={onClickLoad}
            value={String.fromCharCode(0xf144)}
            disabled={false}
          />
        </div>
      </div>
      {isCustomContent || (isLocalContent && isSavingOrUpdating) ? (
        <div className="custom-input-wrapper">
          {isSavingOrUpdating ? (
            <div className="update-control">
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
                  disabled={false}
                />
              </div>
            </div>
          ) : null}
          <TextInput
            ariaLabel="Enter here the Manifest's URL"
            className="text-input"
            onChange={onManifestInput}
            value={currentManifestURL}
            placeholder={
              (URL_DENOMINATIONS[transportType] ??
                `URL to the ${transportType} content`) +
              (IS_HTTPS ? " (HTTPS only if mixed contents disabled)" : "")
            }
          />
          <div className="player-box player-box-load">
            <span
              className={
                "encryption-checkbox custom-checkbox" +
                (DISABLE_ENCRYPTED_CONTENT ? " disabled" : "")
              }
            >
              {(DISABLE_ENCRYPTED_CONTENT ? "[HTTPS only] " : "") + "Encrypted content"}
              <Checkbox
                ariaLabel="Enable for an encrypted content"
                disabled={DISABLE_ENCRYPTED_CONTENT}
                name="displayDRMSettingsTextInput"
                checked={shouldDisplayDRMSettings}
                onChange={onChangeDisplayDRMSettings}
              />
            </span>
            {shouldDisplayDRMSettings ? (
              <div className="drm-settings">
                <div className="drm-choice">{generateDRMButtons()}</div>
                {isCustomDRM ? (
                  <div>
                    <TextInput
                      ariaLabel={
                        'Key system reverse domain name (e.g. "org.w3.clearkey")'
                      }
                      className="choice-input text-input"
                      onChange={onCustomKeySystemInput}
                      value={customKeySystem}
                      placeholder={"Key system (reverse domain name)"}
                    />
                  </div>
                ) : null}
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
                    <Checkbox
                      ariaLabel="Should fallback on key errors"
                      name="shouldFallbackOnKeyError"
                      checked={shouldFallbackOnKeyError}
                      onChange={onChangeFallbackKeyError}
                    />
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
                    <Checkbox
                      ariaLabel="Should fallback on license requesting errors"
                      name="shouldFallbackOnLicenseReqError"
                      checked={shouldFallbackOnLicenseReqError}
                      onChange={onChangeFallbackLicenseRequest}
                    />
                  </span>
                </div>
              </div>
            ) : null}
          </div>
          {transportType === "DASH" ? (
            <div className="player-box player-box-load button-low-latency">
              <span className={"low-latency-checkbox custom-checkbox"}>
                Low-Latency content
                <Checkbox
                  ariaLabel="Enable for a low-latency content"
                  name="isLowLatencyChecked"
                  checked={isLowLatencyChecked}
                  onChange={onLowLatencyClick}
                />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(ContentList);
