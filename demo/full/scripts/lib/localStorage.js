const { localStorage } = window;
export const hasLocalStorage = !!localStorage;

if (!hasLocalStorage) {
  /* eslint-disable-next-line no-console */
  console.warn("`localStorage` is not available." +
               " You will not be able to store content information.");
}

/**
 * If the current browser does not support local storage, contents will be saved
 * locally in that array.
 * @type {Array.<Object>}
 */
let JS_LOCAL_STORAGE = [];

/**
 * Fetch contents saved locally.
 * @returns {Array.<Object>}
 */
export function getLocalStorageContents() {
  if (!hasLocalStorage) {
    return JS_LOCAL_STORAGE;
  }
  const localStorageContents = [];
  const localContentItems = localStorage.getItem("rxPlayerLocalContents");
  if (localContentItems) {
    try {
      localStorageContents.push(...JSON.parse(localContentItems));
    } catch(err) {
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
export function saveLocalStorageContents(localStorageContents) {
  if (!hasLocalStorage) {
    JS_LOCAL_STORAGE = localStorageContents;
    return;
  }
  localStorage.setItem("rxPlayerLocalContents",
                       JSON.stringify(localStorageContents));
}

/**
 * Save a new content to local storage (or just to the state if localStorage
 * is not available.
 * @param {Object} content - content to save
 * @returns {Object} - The content created
 */
export function storeContent(content) {
  const localStorageContents = getLocalStorageContents();
  let id = content.id;
  let index;
  if (content.id != null) {
    index = localStorageContents.findIndex(e => e.id === id);
  } else {
    const lastContentID = localStorageContents.reduce((acc, val) => {
      const id = val.id || 0;
      return Math.max(acc, id);
    }, 0);
    id = lastContentID + 1;
    index = -1;
  }

  const localContent = { name: content.name,
                         url: content.url,
                         transport: content.transport,
                         drmInfos: content.drmInfos,
                         id,
                         localContent: true };


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
 * @param {string} id - ID of the content you want to remove.
 * @returns {Object|null} - `null` if the object was not found. Or the
 * corresponding content if it was.
 */
export function removeStoredContent(id) {
  const localStorageContents = getLocalStorageContents();
  const idx = localStorageContents.findIndex(e => e.id === id);

  if (idx < 0) {
    return null;
  }

  const content = localStorageContents[idx];
  localStorageContents.splice(idx, 1);
  saveLocalStorageContents(localStorageContents);
  return content;
}
