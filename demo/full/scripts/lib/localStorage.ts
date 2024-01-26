import { IDrmInfo } from "../contents";

const { localStorage } = window;
export const hasLocalStorage = !!localStorage;

if (!hasLocalStorage) {
  /* eslint-disable-next-line no-console */
  console.warn(
    "`localStorage` is not available." +
      " You will not be able to store content information.",
  );
}

/**
 * If the current browser does not support local storage, contents will be saved
 * locally in that array.
 * @type {Array.<Object>}
 */
let JS_LOCAL_STORAGE: IStoredContentInfo[] = [];

/**
 * Fetch contents saved locally.
 * @returns {Array.<Object>}
 */
export function getLocalStorageContents(): IStoredContentInfo[] {
  if (!hasLocalStorage) {
    return JS_LOCAL_STORAGE;
  }
  const localStorageContents: IStoredContentInfo[] = [];
  const localContentItems = localStorage.getItem("rxPlayerLocalContents");
  if (localContentItems !== null) {
    try {
      const parsed = JSON.parse(localContentItems) as IStoredContentInfo[];
      localStorageContents.push(...parsed);
    } catch (err) {
      /* eslint-disable-next-line */
      console.warn("Demo: Can't parse local storage content.");
    }
  }
  return localStorageContents;
}

/**
 * Save contents locally.
 * @param {Array.<Object>} localStorageContents
 */
export function saveLocalStorageContents(localStorageContents: IStoredContentInfo[]) {
  if (!hasLocalStorage) {
    JS_LOCAL_STORAGE = localStorageContents;
    return;
  }
  localStorage.setItem("rxPlayerLocalContents", JSON.stringify(localStorageContents));
}

/**
 * Save a new content to local storage (or just to the state if localStorage
 * is not available.
 * @param {Object} content - content to save
 * @returns {Object} - The content created
 */
export function storeContent(content: IContentInfo): IStoredContentInfo {
  const localStorageContents = getLocalStorageContents();
  let id: number;
  let index;
  if (content.id != null) {
    index = localStorageContents.findIndex((e) => e.id === id);
    id = content.id;
  } else {
    const lastContentID = localStorageContents.reduce((acc, val) => {
      const contentId = val.id || 0;
      return Math.max(acc, contentId);
    }, 0);
    id = lastContentID + 1;
    index = -1;
  }

  const localContent: IStoredContentInfo = {
    drmInfos: content.drmInfos,
    fallbackKeyError: content.fallbackKeyError,
    fallbackLicenseRequest: content.fallbackLicenseRequest,
    id,
    localContent: true,
    lowLatency: content.lowLatency,
    name: content.name,
    transport: content.transport,
    url: content.url,
  };

  if (index > -1) {
    localStorageContents.splice(index, 1, localContent);
  } else {
    localStorageContents.push(localContent);
  }
  saveLocalStorageContents(localStorageContents);
  return localContent;
}

/**
 * Remove saved content from localStorage if available.
 * @param {number} id - ID of the content you want to remove.
 * @returns {Boolean} - `false` if the object was not found. `true` otherwise.
 */
export function removeStoredContent(id: number): boolean {
  const localStorageContents = getLocalStorageContents();
  const idx = localStorageContents.findIndex((e) => e.id === id);

  if (idx < 0) {
    return false;
  }

  localStorageContents.splice(idx, 1);
  saveLocalStorageContents(localStorageContents);
  return true;
}

export interface IStoredContentInfo extends IContentInfo {
  id: number;
  localContent: true;
}

export interface IContentInfo {
  id: number | undefined | null;
  drmInfos: IDrmInfo[] | null;
  fallbackKeyError: boolean | undefined;
  fallbackLicenseRequest: boolean | undefined;
  lowLatency: boolean | undefined;
  name: string | undefined;
  transport: string | undefined;
  url: string | undefined;
}
