let rootUrl = window.rootUrl;
{
  // From relative to absolute URL
  const a = document.createElement("a");
  a.href = rootUrl;
  rootUrl = a.href;

  if (rootUrl[rootUrl.length - 1] === "/") {
    rootUrl = rootUrl.substring(0, rootUrl.length - 1);
  }
}

/** Information on the initialization of the search feature. */
const searchState = {
  /**
   * Status of the search initialization (loading + building of the index).
   * Can be:
   *   1. "not-loaded": when... not loaded.
   *   2. "loading": when in the process of being loaded (e.g. the index request
   *      is pending).
   *   3. "loaded": Search is initialized with success. This is the only state
   *      under which search operations can be performed.
   *   4. "failed": Search initialization failed.
   * @type {string}
   */
  initStatus: "not-loaded",
  /**
   * Promise resolving when search is initialized (in the "loaded" status) and
   * rejecting when search initialization fails (in the "failed" status).
   * Set to `null` if search initialization never began yet.
   */
  promise: null,

  /**
   * Last searched text.
   * `null` if nothing was yet searched in the current searching session.
   * @type {string|null}
   */
  lastSearch: null,
};

/**
 * Absolute URL to the page that is currently wanted to be displayed.
 * `null` if we're not wanting to load any other page.
 */
let currentlyWantedPage = null;

let fuse = null;

/**
 * Contains the links to search results.
 * The elements of this array are in this same order than `Fuse.js`'s index.
 * @type {Array.<Object>}
 */
let searchIndexLinks = [];

/** If `true` the header on the top of the page is currently visible. */
let isHeaderShown = true;

/** Map linking the URL accessible through the sidebar to the sidebar element itself. */
let sidebarLinksToLinkElements = new Map();

/** Associate URLs accessible through the sidebar to the corresponding HTML content. */
const linksCache = [];

/**
 * Set timeout after which we will automatically ask the browser to load a
 * given URL if "soft navigation" it takes too much time.
 */
let currentDisplayTimeout = null;

/**
 * Initialize all dynamic behaviors on the page.
 *
 * The returned callback allows to free all reserved resources, mainly to allow
 * re-initialize the page from a clean state.
 */
let removeListeners = initializePage();

const spinnerSvg = `<svg
  width="24"
  height="24"
  viewBox="0 0 24 24"
  xmlns="http://www.w3.org/2000/svg"
  class="spinner-svg"
>
  <path
    d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"
    class="spinner"
  />
</svg>`;

const pageIndex = [];
/**
 * Perform all actions and register all event handlers that should be done in
 * the page.
 */
function initializePage() {
  currentlyWantedPage = null;
  searchState.lastSearch = null;
  const deInitSearchIcons = initializeSearchIcons();
  const deInitSearchBar = initializeSearchBar();
  const deInitPageGroups = initializePageGroups();
  const deInitHamburgerMenu = initializeHamburgerMenu();
  initializeHeaderLinks();
  const deInitSidebarLinks = initializeSideBarLinks();
  const deInitContentLinks = initializeContentLinks();
  performSearchInUrlIfOne();
  scrollInSidebarToSeeActiveElement();
  const deInitScrollBehavior = initializeScrollBehavior();

  window.addEventListener("popstate", onPopState);

  // Work-arounds to make sure the header doesn't go on top
  // of a link
  if (window.location.hash !== "" && window.scrollY > 0) {
    hideHeader();
  }

  return function () {
    deInitSearchIcons();
    deInitSearchBar();
    deInitPageGroups();
    deInitHamburgerMenu();
    deInitScrollBehavior();
    deInitSidebarLinks();
    deInitContentLinks();
    window.removeEventListener("popstate", onPopState);
  };
}

/**
 * Initialize behavior allowing to show or hide the header depending on the
 * scroll position and on anchors.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeScrollBehavior() {
  let prevScroll = window.scrollY;
  window.addEventListener("scroll", onScroll);
  window.addEventListener("hashchange", onHashChange);

  return function () {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("hashchange", onHashChange);
  };

  function onScroll() {
    const curScroll = window.scrollY;
    if (curScroll === 0) {
      showHeader();
      return;
    }

    if (Math.abs(curScroll - prevScroll) < 5) {
      return;
    }
    if (curScroll > prevScroll) {
      hideHeader();
    } else if (curScroll < prevScroll) {
      showHeader();
    }
    prevScroll = curScroll;
  }

  function onHashChange() {
    if (window.scrollY !== 0) {
      hideHeader();
    }
    prevScroll = window.scrollY;
  }
}

/**
 * Add or replace `onclick` handlers to the search icons on the page.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeSearchIcons() {
  const eventListenerRemovers = [];
  const searchParams = new URLSearchParams(window.location.search);
  const searchBarElt = getSearchBarElement();
  const searchResultsElt = getSearchResultElement();
  const searchIconElts = getSearchIconElements();
  for (let i = searchIconElts.length - 1; i >= 0; i--) {
    searchIconElts[i].classList.remove("active");
  }
  const searchWrapperElt = getSearchWrapperElement();
  if (searchIconElts.length > 0) {
    for (let i = searchIconElts.length - 1; i >= 0; i--) {
      const searchIconElt = searchIconElts[i];
      searchIconElt.addEventListener("click", onClick);
      eventListenerRemovers.push(function () {
        searchIconElt.removeEventListener("click", onClick);
      });
    }
  }
  return function () {
    eventListenerRemovers.forEach((cb) => cb());
  };

  function onClick() {
    searchState.lastSearch = null;
    searchResultsElt.innerHTML = "";
    searchBarElt.value = "";
    if (searchWrapperElt.classList.contains("active")) {
      // Search already enabled: now disable
      searchParams.delete("search");
      history.replaceState(null, null, window.location.href.split("?")[0]);
      searchWrapperElt.classList.remove("active");
      for (let i = searchIconElts.length - 1; i >= 0; i--) {
        searchIconElts[i].classList.remove("active");
      }
    } else {
      if (searchState.initStatus === "not-loaded") {
        initializeSearchEngine().then(function () {
          updateSearchResults(searchBarElt.value);
        });
      }
      window.scrollTo(0, 0);
      searchWrapperElt.classList.add("active");
      for (let i = searchIconElts.length - 1; i >= 0; i--) {
        searchIconElts[i].classList.add("active");
      }
      searchBarElt.focus();
      updateSearchResults(searchBarElt.value);
    }
  }
}

/**
 * Register callback to display search results when text is entered in the
 * search bar.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeSearchBar() {
  const searchParams = new URLSearchParams(window.location.search);
  const searchBarElt = getSearchBarElement();
  if (searchBarElt === null) {
    return function () {};
  }
  searchBarElt.addEventListener("input", onInput);
  return function () {
    searchBarElt.removeEventListener("input", onInput);
  };
  function onInput() {
    searchParams.set("search", searchBarElt.value);
    history.replaceState(null, null, "?" + searchParams.toString());
    updateSearchResults(searchBarElt.value);
    if (searchState.initStatus !== "loaded") {
      initializeSearchEngine().then(function () {
        updateSearchResults(searchBarElt.value);
      });
    }
  }
}

/**
 * If the URL contains a search param, display results of the search in the
 * page.
 */
function performSearchInUrlIfOne() {
  const searchParams = new URLSearchParams(window.location.search);
  const searchBarElt = getSearchBarElement();
  const searchIconElts = getSearchIconElements();
  const searchWrapperElt = getSearchWrapperElement();
  const initialSearch = searchParams.get("search");
  if (initialSearch !== null) {
    searchWrapperElt.classList.add("active");
    for (let i = searchIconElts.length - 1; i >= 0; i--) {
      searchIconElts[i].classList.add("active");
    }
    searchBarElt.value = initialSearch;
    searchBarElt.focus();
    searchBarElt.selectionStart = searchBarElt.selectionEnd =
      searchBarElt.value.length;
    updateSearchResults(searchBarElt.value);
    if (searchState.initStatus !== "loaded") {
      initializeSearchEngine().then(function () {
        updateSearchResults(searchBarElt.value);
      });
    }
  }
}

/**
 * Open the active page group, closes the others and register listener to
 * smoothly open and close them on click.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializePageGroups() {
  /** Elements corresponding each to a sidebar's group of pages */
  const sidebarGroupElts =
    document.getElementsByClassName("sidebar-item-group");
  const pageListGroupElts = document.getElementsByClassName("page-list-group");
  const eventListenerRemovers = [];
  const groupElts = [];
  for (let i = 0; i < sidebarGroupElts.length; i++) {
    groupElts.push(sidebarGroupElts[i]);
  }
  for (let i = 0; i < pageListGroupElts.length; i++) {
    groupElts.push(pageListGroupElts[i]);
  }

  for (let groupElt of groupElts) {
    const wrapper = groupElt.parentElement;
    const ulElt = wrapper.getElementsByTagName("ul")[0];
    const pageGroupElt = ulElt.previousSibling;
    let status = "closed";
    let openingTimeout;
    let closingTimeout;

    const sidebarLinkElements =
      groupElt.parentElement.getElementsByClassName("sidebar-link");
    for (const sidebarLinkElement of sidebarLinkElements) {
      if (sidebarLinkElement.classList.contains("active")) {
        pageGroupElt.classList.add("opened");
        break;
      }
    }

    if (ulElt !== undefined) {
      if (pageGroupElt.classList.contains("opened")) {
        // already opened sidebar group
        status = "opened";
        ulElt.style.display = "block";
        ulElt.style.height = `auto`;
      }
      ulElt.addEventListener("transitionend", onTransitionEnd);
      eventListenerRemovers.push(function () {
        ulElt.removeEventListener("transitionend", onTransitionEnd);
      });
    }

    groupElt.addEventListener("click", onClick);
    eventListenerRemovers.push(function () {
      groupElt.removeEventListener("click", onClick);
    });

    function onClick() {
      if (pageGroupElt.classList.contains("opened")) {
        progressivelyHideElt();
      } else {
        progressivelyDisplayElt();
      }
    }

    function progressivelyDisplayElt() {
      clearTimeout(openingTimeout);
      clearTimeout(closingTimeout);
      pageGroupElt.classList.add("opened");
      if (ulElt === undefined) {
        return;
      }
      ulElt.style.display = "block";
      ulElt.style.height = "auto";
      const height = ulElt.offsetHeight;
      ulElt.style.height = "0px";
      const transitionDuration = getTransitionDuration(height);
      ulElt.style.transition = `height ${transitionDuration}ms ease-in-out 0s`;
      openingTimeout = setTimeout(function () {
        status = "opening";
        ulElt.style.height = `${height}px`;
      });
    }

    function progressivelyHideElt() {
      clearTimeout(openingTimeout);
      clearTimeout(closingTimeout);
      pageGroupElt.classList.remove("opened");
      if (ulElt === undefined) {
        return;
      }
      const height = ulElt.offsetHeight;
      ulElt.style.height = `${height}px`;
      closingTimeout = setTimeout(function () {
        status = "closing";
        const transitionDuration = getTransitionDuration(ulElt.offsetHeight);
        ulElt.style.transition = `height ${transitionDuration}ms ease-in-out 0s`;
        ulElt.style.height = "0px";
      });
    }

    function onTransitionEnd() {
      if (status === "closing") {
        ulElt.style.transition = "";
        ulElt.style.display = "none";
        ulElt.style.height = "auto";
        status = "closed";
      } else if (status === "opening") {
        status = "opened";
        ulElt.style.height = "auto";
      }
    }

    function getTransitionDuration(height) {
      return Math.max(300, height / 2);
    }
  }
  return function () {
    eventListenerRemovers.forEach((cb) => cb());
  };
}

/**
 * Loads the search engine's index and start initializing it.
 * Can be performed lazily to avoid loading loading the huge index if noone
 * searched anything.
 *
 * @returns {Promise} - Resolved when if the search engine has been initialized
 * with success and it is now possible to perform search.
 * Reject if it fails.
 */
function initializeSearchEngine() {
  if (searchState.promise !== null) {
    return searchState.promise;
  }
  searchState.initStatus = "loading";
  searchState.promise = fetch(rootUrl + "/searchIndex.json")
    .then((res) => res.json())
    .then((res) => {
      if (!Array.isArray(res)) {
        console.error(
          "Failed to initialize search: index has an invalid format.",
        );
        return;
      }
      searchIndexLinks = [];
      let id = 0;
      for (let i = 0; i < res.length; i++) {
        for (let j = 0; j < res[i].index.length; j++) {
          const elt = res[i].index[j];
          searchIndexLinks.push({
            file: res[i].file,
            anchorH1: elt.anchorH1,
            anchorH2: elt.anchorH2,
            anchorH3: elt.anchorH3,
          });
          pageIndex.push({
            file: res[i].file,
            h1: elt.h1,
            h2: elt.h2,
            h3: elt.h3,
            body: elt.body,
            id: id,
          });
          id++;
        }
      }
      fuse = new Fuse(pageIndex, {
        // includeScore: true,
        keys: [
          {
            name: "h1",
            weight: 100,
          },
          {
            name: "h2",
            weight: 80,
          },
          {
            name: "h3",
            weight: 10,
          },
          {
            name: "body",
            weight: 1,
          },
        ],
      });
      searchState.initStatus = "loaded";
    })
    .catch((err) => {
      searchState.initStatus = "failed";
      console.error("Could not initialize search:", err);
    });
  return searchState.promise;
}

// Symbol are guaranteed to be unique.
// So there will be no overlap between this symbol or any string
// when it's used as a key to access an object property.
const __DEFAULT_SYMBOL__ = Symbol("__DEFAULT__");

/**
 * Update search result in the search result HTMLElement according to the given
 * value.
 * @param {string} value
 */
function updateSearchResults(value) {
  const searchResultsElt = getSearchResultElement();
  if (value === searchState.lastSearch) {
    return;
  }

  if (value === "") {
    searchState.lastSearch = "";
    searchResultsElt.innerHTML =
      '<div class="message">' +
      "Enter text to search in all documentation pages." +
      "</div>";
    return;
  }
  if (searchState.initStatus === "not-loaded") {
    searchState.lastSearch = null;
    searchResultsElt.innerHTML =
      '<div class="message">' + "Loading the search index..." + "</div>";
    return;
  }
  if (searchState.initStatus === "failed") {
    searchState.lastSearch = null;
    searchResultsElt.innerHTML =
      '<div class="message">' +
      "Error: an error happened while initializing the search index" +
      "</div>";
    return;
  }
  searchState.lastSearch = value;

  const searchResults = fuse.search(value);
  if (searchResults.length === 0) {
    searchResultsElt.innerHTML =
      '<div class="message">' + "No result for that search." + "</div>";
    return;
  }

  // only consider the first 30 results
  const searchResultsSliced = searchResults.slice(0, 29);
  const searchResultSorted = reorderSearchResults(searchResultsSliced);
  searchResultsElt.innerHTML = "";

  let previousItem = null;
  for (const searchResult of searchResultSorted) {
    let displayFromLevel =
      previousItem === null
        ? 0
        : getCommonAncestorLevel(searchResult, previousItem);
    previousItem = searchResult;
    const elems = createHeadingElements(searchResult, displayFromLevel);
    elems.forEach((elem) => searchResultsElt.appendChild(elem));
  }
}

/**
 * Compares two search result items to determine the deepest common ancestor level.
 *
 * @param {Object} itemA - The first search result item.
 * @param {Object} itemB - The second search result item.
 * @returns {number} - Returns 0 if items does not share same file, 1 if h1 is different, etc...
 */
function getCommonAncestorLevel(searchResultItemA, searchResultItemB) {
  if (searchResultItemA.file !== searchResultItemB.file) {
    return 0;
  }

  if (searchResultItemA.h1 !== searchResultItemB.h1) {
    return 1;
  }

  if (searchResultItemA.h2 !== searchResultItemB.h2) {
    return 2;
  }

  return 3;
}

/**
 * Re-orders search results by grouping them according
 * to their shared section headings (h1, h2, h3).
 * @param {array} searchResults The array of search results to be re-ordered.
 * @returns An array re-ordered based on section headings.
 *
 * @example
 */
function reorderSearchResults(searchResults) {
  const groupedSearchResult = groupItems(searchResults);
  return flattenGroupedItems(groupedSearchResult);
}
/**
 * Groups items from the provided `results` array by their file, h1, h2, and h3 properties.
 * If a property is missing at any level, it defaults to using the `__DEFAULT__` symbol.
 * Items are nested based on their structure, creating keys for each
 * unique combination of `file`, `h1`, `h2`, and `h3`.
 *
 * @param {array} array The array to group.
 * @returns An object containing items grouped.
 */
function groupItems(results) {
  const groupedByFileAndHeader = {};

  results.forEach((res) => {
    let item = res.item;

    if (item.file === undefined || item.h1 === undefined) {
      // item.file and item.h1 is required, if it's missing let's skip the search result.
      return;
    }
    if (!groupedByFileAndHeader[item.file]) {
      groupedByFileAndHeader[item.file] = {};
    }

    if (!groupedByFileAndHeader[item.file][item.h1]) {
      groupedByFileAndHeader[item.file][item.h1] = {};
    }

    // Create the h2 key, if exists
    if (item.h2) {
      if (!groupedByFileAndHeader[item.file][item.h1][item.h2]) {
        groupedByFileAndHeader[item.file][item.h1][item.h2] = {};
      }

      // Create the h3 key, if exists
      if (item.h3) {
        if (!groupedByFileAndHeader[item.file][item.h1][item.h2][item.h3]) {
          groupedByFileAndHeader[item.file][item.h1][item.h2][item.h3] = [];
        }
        groupedByFileAndHeader[item.file][item.h1][item.h2][item.h3].push(item);
      } else {
        // If no h3, use the default symbol
        if (
          !groupedByFileAndHeader[item.file][item.h1][item.h2][
            __DEFAULT_SYMBOL__
          ]
        ) {
          groupedByFileAndHeader[item.file][item.h1][item.h2][
            __DEFAULT_SYMBOL__
          ] = [];
        }
        groupedByFileAndHeader[item.file][item.h1][item.h2][
          __DEFAULT_SYMBOL__
        ].push(item);
      }
    } else {
      // If no h2, use the default symbol under h1
      if (!groupedByFileAndHeader[item.file][item.h1][__DEFAULT_SYMBOL__]) {
        groupedByFileAndHeader[item.file][item.h1][__DEFAULT_SYMBOL__] = [];
      }
      groupedByFileAndHeader[item.file][item.h1][__DEFAULT_SYMBOL__].push(item);
    }
  });
  return groupedByFileAndHeader;
}
/**
 * From a nested object contain search results returns an array with all
 * the search items.
 */
function flattenGroupedItems(groupedByFileAndHeader) {
  const flattenedItems = [];

  // Helper function to recursively traverse the nested structure
  function traverse(group) {
    // If the group is an array, it means there is no deeper level.
    if (Array.isArray(group)) {
      flattenedItems.push(...group);
    } else if (group !== null && typeof group === "object") {
      if (group[__DEFAULT_SYMBOL__] !== undefined) {
        traverse(group[__DEFAULT_SYMBOL__]);
      }

      // Object.keys() does not iterate through Symbol, so the __DEFAULT_SYMBOL__
      // key will not be handled here.
      for (const key of Object.keys(group)) {
        traverse(group[key]);
      }
    }
  }
  // Start traversing from the top-level grouping
  for (const file in groupedByFileAndHeader) {
    for (const h1 in groupedByFileAndHeader[file]) {
      traverse(groupedByFileAndHeader[file][h1]);
    }
  }
  return flattenedItems;
}

/**
 * Scroll if necessary the sidebar so that the "active" link is visible.
 */
function scrollInSidebarToSeeActiveElement() {
  const sidebarLinkElements = document.getElementsByClassName("sidebar-link");
  for (const sidebarLinkElement of sidebarLinkElements) {
    if (sidebarLinkElement.classList.contains("active")) {
      const activeRect = sidebarLinkElement.getBoundingClientRect();
      if (activeRect.y + activeRect.height + 20 > window.innerHeight) {
        const sidebarWrapperElt =
          document.getElementsByClassName("sidebar-wrapper")[0];
        const scrollYBy =
          activeRect.y + activeRect.height - window.innerHeight + 50;
        sidebarWrapperElt.scrollTo(0, sidebarWrapperElt.scrollTop + scrollYBy);
      }
      return;
    }
  }
}

/**
 * Hide the header on top of the page.
 */
function hideHeader() {
  const headerElt = document.getElementsByClassName("navbar-parent")[0];
  if (isHeaderShown) {
    headerElt.classList.add("hidden");
    isHeaderShown = false;
  }
}

/**
 * Show the header on top of the page.
 */
function showHeader() {
  const headerElt = document.getElementsByClassName("navbar-parent")[0];
  if (!isHeaderShown) {
    headerElt.classList.remove("hidden");
    isHeaderShown = true;
  }
}

/**
 * Initialize logic to open or close the sidebar overlay when the hamburger menu
 * is clicked (on smaller form factors).
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeHamburgerMenu() {
  let opacityTimeout;
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const hamburgerOpenerElt =
    document.getElementsByClassName("hamburger-opener")[0];
  const hamburgerBarElt = document.getElementsByClassName("hamburger-bar")[0];
  const hamburgerCloserElt = document.getElementsByClassName(
    "hamburger-bar-closer",
  )[0];

  hamburgerOpenerElt.addEventListener("click", openMenu);
  hamburgerCloserElt.addEventListener("click", closeMenu);

  let isOverlayVisible = false;
  overlay.addEventListener("click", onOverlayClick);

  function onOverlayClick() {
    if (isOverlayVisible) {
      closeMenu();
    }
  }

  return function () {
    clearTimeout(opacityTimeout);
    hamburgerOpenerElt.removeEventListener("click", openMenu);
    hamburgerCloserElt.removeEventListener("click", closeMenu);
    overlay.removeEventListener("click", onOverlayClick);
  };

  function openMenu() {
    clearTimeout(opacityTimeout);
    document.body.style.overflowY = "hidden";
    document.body.appendChild(overlay);
    opacityTimeout = setTimeout(function () {
      overlay.style.opacity = "1";
      isOverlayVisible = true;
    });
    hamburgerBarElt.classList.add("opened");
  }

  function closeMenu() {
    clearTimeout(opacityTimeout);
    document.body.style.overflowY = "auto";
    overlay.style.opacity = "0";
    isOverlayVisible = false;
    document.body.removeChild(overlay);
    hamburgerBarElt.classList.remove("opened");
  }
}

/**
 * Links in the navigation bar usually are relative URL.
 *
 * Because we may navigate through paths here, we force them to be absolute URLs
 * only.
 */
function initializeHeaderLinks() {
  const headerElt = document.getElementsByClassName("navbar-parent")[0];
  const headerLinks = headerElt?.getElementsByTagName("a") ?? [];
  for (const link of headerLinks) {
    // Transform from relative to absolute URL
    link.href = link.href;
  }
}

/**
 * Initialize the "soft navigation" of pages when clicking on one of the links in
 * the sidebar.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeSideBarLinks() {
  const sidebar = document.getElementsByClassName("sidebar-items")[0];
  const eventListenerRemovers = [];
  sidebarLinksToLinkElements.clear();
  const sidebarLinks = sidebar?.getElementsByTagName("a") ?? [];
  for (const link of sidebarLinks) {
    // Transform from relative to absolute URL
    link.href = link.href;
    sidebarLinksToLinkElements.set(link.href, link);
    link.addEventListener("click", onClick);
    link.addEventListener("mouseover", onMouseOver);
    eventListenerRemovers.push(function () {
      link.removeEventListener("click", onClick);
      link.removeEventListener("mouseover", onMouseOver);
    });
    function onMouseOver() {
      loadSidebarLink(link, { display: false, updateURL: false });
    }
    function onClick(evt) {
      evt.preventDefault();
      loadSidebarLink(link, { display: true, updateURL: true });
    }
  }
  return function () {
    eventListenerRemovers.forEach((cb) => cb());
  };
}

/**
 * Initialize the "soft navigation" of pages when clicking on one of the links in
 * the page referring to a link accessible through the sidebar.
 * @returns {Function} - Function to remove all event listeners registered in
 * that function.
 */
function initializeContentLinks() {
  const eventListenerRemovers = [];
  /**
   * Element containing the documentation page as well as potential search results
   * and the search bar.
   */
  const currentContentElt =
    document.getElementsByClassName("content-wrapper")[0];

  /** Every links contained both in the documentation page and in search result. */
  const currentContentLinkElts = currentContentElt.getElementsByTagName("a");
  for (const contentLink of currentContentLinkElts) {
    const correspondingElt = sidebarLinksToLinkElements.get(contentLink.href);
    if (correspondingElt !== undefined) {
      contentLink.addEventListener("click", onClick);
      contentLink.addEventListener("mouseover", onMouseOver);
      eventListenerRemovers.push(function () {
        contentLink.removeEventListener("click", onClick);
        contentLink.removeEventListener("mouseover", onMouseOver);
      });
      function onClick(evt) {
        evt.preventDefault();
        loadSidebarLink(correspondingElt, {
          display: true,
          updateURL: true,
        });
      }
      function onMouseOver() {
        loadSidebarLink(correspondingElt, {
          display: false,
          updateURL: false,
        });
      }
    }
  }
  return function () {
    eventListenerRemovers.forEach((cb) => cb());
  };
}

/**
 * Begin "soft navigation" of an URL linked to a sidebar link.
 * @param {HTMLLinkElement} link - The sidebar `HTMLLinkElement` whose link will
 * be loaded.
 * @param {Object} opt
 * @param {boolean} opt.display - If `true` the page will be displayed right
 * after being loaded. If `false`, it is just being pre-loaded for now.
 * @param {boolean} opt.updateURL - If `true` the page be added to the
 * history of the current window and the current URL will be replaced once the
 * page is loaded.
 * @returns {Promise} - Promise resolving when the page is loaded.
 */
function loadSidebarLink(link, { display, updateURL }) {
  for (const cached of linksCache) {
    if (cached[0] === link.href) {
      if (display) {
        currentlyWantedPage = link.href;
        setCurrentDisplayTimeout(link.href);
      }
      return cached[1].then(function (newContent) {
        if (updateURL) {
          history.pushState(null, null, link.href);
        }
        if (display) {
          prepareNextPage(link);
          displayContent(newContent, true);
        }
      });
    }
  }
  if (display) {
    currentlyWantedPage = link.href;
    setCurrentDisplayTimeout(link.href);
  }
  return loadContentFrom(link, display, true);
}

function prepareNextPage(link) {
  const sidebar = document.getElementsByClassName("sidebar-items")[0];
  const actives = sidebar.getElementsByClassName("active");
  for (let i = actives.length - 1; i >= 0; i--) {
    actives[i].classList.remove("active");
  }

  /** Elements corresponding each to a sidebar's group of pages */
  const sidebarGroupElts =
    document.getElementsByClassName("sidebar-item-group");

  link.classList.add("active");

  let parentElement = link.parentElement;
  while (
    parentElement != null &&
    !parentElement.classList.contains("sidebar-items")
  ) {
    if (parentElement.classList.contains("sidebar-item-group")) {
      parentElement.classList.add("active");
      parentElement.classList.add("opened");
    }
    parentElement = parentElement.parentElement;
  }

  const pageListGroupElts = document.getElementsByClassName("page-list-group");
  const groupElts = [];
  for (let i = 0; i < sidebarGroupElts.length; i++) {
    groupElts.push(sidebarGroupElts[i]);
  }
  for (let i = 0; i < pageListGroupElts.length; i++) {
    groupElts.push(pageListGroupElts[i]);
  }

  for (let groupElt of groupElts) {
    const wrapper = groupElt.parentElement;
    const ulElt = wrapper.getElementsByTagName("ul")[0];
    const pageGroupElt = ulElt.previousSibling;
    if (ulElt !== undefined) {
      if (pageGroupElt.classList.contains("opened")) {
        // already opened sidebar group
        ulElt.style.display = "block";
        ulElt.style.height = `auto`;
      }
    }
  }
}

/**
 * Setup a 1.5 seconds timeout after which a spinner is shown if the next page
 * isn't yet displayed.
 * @param {string} url
 */
function setCurrentDisplayTimeout(url) {
  if (currentDisplayTimeout !== null) {
    clearTimeout(currentDisplayTimeout);
  }
  currentDisplayTimeout = setTimeout(function () {
    const loadingParentDiv = document.createElement("div");
    const loadingWrapperDiv = document.createElement("div");
    loadingWrapperDiv.className = "loading-wrapper";
    const pageTextSpan = document.createElement("span");
    const pageTextUrl = document.createElement("a");
    const spinnerDiv = document.createElement("div");
    spinnerDiv.innerHTML = spinnerSvg;
    pageTextSpan.textContent =
      "Loading the next documentation page takes time, " +
      "you can also try to force browser navigation by going to the following link: ";
    pageTextUrl.href = url;
    pageTextUrl.textContent = url;
    loadingWrapperDiv.appendChild(spinnerDiv);
    loadingWrapperDiv.appendChild(pageTextSpan);
    loadingWrapperDiv.appendChild(pageTextUrl);
    loadingParentDiv.appendChild(loadingWrapperDiv);
    document.getElementsByClassName("content-wrapper")[0].innerHTML =
      loadingParentDiv.innerHTML;
  }, 1300);
}

/**
 * Soft-navigate to the content behind the given URL.
 * @param {HTMLLinkElement} link - The link whose URL we should soft-navigate to
 * @param {boolean} display - If `true` the page will be displayed right
 * after being loaded. If `false`, it is just being pre-loaded for now.
 * @param {boolean} scrollToTop - If `true` we will scroll to the top of the
 * page immediately after loading. Will only be considered if `display` is
 * also `true`.
 * @returns {Promise} - Promise resolving when the page is loaded.
 */
function loadContentFrom(link, display, scrollToTop) {
  const href = link.href;
  while (linksCache.length > 50) {
    linksCache.shift();
  }
  const prom = fetch(href)
    .then((res) => {
      return res.text();
    })
    .then((body) => {
      const xml = new DOMParser().parseFromString(body, "text/html");
      const newContent = xml.getElementsByClassName("content-wrapper")[0];
      return newContent;
    });

  linksCache.push([href, prom]);

  return prom
    .then(function (newContent) {
      if (display && currentlyWantedPage === href) {
        history.pushState(null, null, href);
        prepareNextPage(link);
        displayContent(newContent, scrollToTop);
      }
    })
    .catch(function () {
      for (let i = 0; i < linksCache.length; i++) {
        if (linksCache[i][0] === href) {
          linksCache.splice(i, 1);
        }
      }
      if (currentlyWantedPage !== href) {
        return;
      }
      window.location.href = href;
    });
}

/**
 * Display fetched content (end step of soft navigation).
 * @param {string} newContent - The content to display.
 * @param {boolean} scrollToTop - If `true` we will scroll to the top of the
 * page immediately after loading.
 */
function displayContent(newContent, scrollToTop) {
  if (currentDisplayTimeout !== null) {
    clearTimeout(currentDisplayTimeout);
    currentDisplayTimeout = null;
  }
  const content = newContent.innerHTML;
  document.getElementsByClassName("content-wrapper")[0].innerHTML = content;
  if (scrollToTop) {
    window.scrollTo(0, 0);
  }
  removeListeners();
  removeListeners = initializePage();
  showHeader();
}

/**
 * Action to take when the `"popstate"` event arises.
 */
function onPopState() {
  const url = window.location.href;
  const linkElt = sidebarLinksToLinkElements.get(url);
  if (linkElt !== undefined) {
    loadSidebarLink(linkElt, { display: true, updateURL: false });
  } else {
    window.location.href = url;
  }
}

/**
 * Returns the HTMLElement corresponding to the search input.
 * @returns {HTMLElement}
 */
function getSearchBarElement() {
  return document.getElementById("searchbar");
}

/**
 * Returns the HTMLElement containing the search results.
 * @returns {HTMLElement}
 */
function getSearchResultElement() {
  return document.getElementById("search-results");
}

/**
 * All search icon elements in the page (hopefully, there's only one).
 * @returns {HTMLElement}
 */
function getSearchIconElements() {
  return document.getElementsByClassName("search-icon");
}

/**
 * All search icon elements in the page (hopefully, there's only one).
 * @returns {HTMLElement}
 */
function getSearchIconElements() {
  return document.getElementsByClassName("search-icon");
}

/**
 * Parent element to search-related dynamic elements (input + results ...)
 * @returns {HTMLElement}
 */
function getSearchWrapperElement() {
  return document.getElementById("search-wrapper");
}
/**
 * Creates an array of rendered elements based on the specified display level and item data.
 *
 * @param {Object} item - The item containing heading properties (h1, h2, h3).
 * @param {number} displayFromLevel - The level from which to start rendering headings (1 to 3).
 * @returns {Array} An array of elements created for the relevant heading levels.
 */
function createHeadingElements(item, displayFromLevel) {
  const headingElements = [];
  const headingLevelToRender = [];

  if (displayFromLevel <= 1 && item.h1) {
    headingLevelToRender.push("h1");
  }

  if (displayFromLevel <= 2 && item.h2) {
    headingLevelToRender.push("h2");
  }

  if (displayFromLevel <= 3 && item.h3) {
    headingLevelToRender.push("h3");
  }

  for (const headingLevel of headingLevelToRender) {
    const element = createResultElement(item, headingLevel);
    headingElements.push(element);
  }
  return headingElements;
}

function createResultElement(item, itemLevel) {
  const links = searchIndexLinks[+item.id];
  const contentDiv = document.createElement("div");
  contentDiv.className = "search-result-item";
  const locationDiv = document.createElement("div");
  locationDiv.className = "search-result-location";

  let href;
  let textContent;
  if (itemLevel === "h3") {
    contentDiv.classList.add("search-result-item-is-h3");
    if (links.anchorH3 !== undefined) {
      href = rootUrl + "/" + links.file + "#" + links.anchorH3;
    }
    textContent = item.h3;
  } else if (itemLevel === "h2") {
    contentDiv.classList.add("search-result-item-is-h2");
    if (links.anchorH2 !== undefined) {
      href = rootUrl + "/" + links.file + "#" + links.anchorH2;
    }
    textContent = item.h2;
  } else if (itemLevel === "h1") {
    contentDiv.classList.add("search-result-item-is-h1");
    if (links.anchorH1 !== undefined) {
      href = rootUrl + "/" + links.file + "#" + links.anchorH1;
    }
    textContent = item.h1;
  }

  let anchorElement;
  if (href) {
    anchorElement = document.createElement("a");
    anchorElement.href = href;
  } else {
    anchorElement = document.createElement("span");
  }

  anchorElement.textContent = textContent;
  anchorElement.className = itemLevel;
  locationDiv.appendChild(anchorElement);

  const bodyDiv = document.createElement("div");
  bodyDiv.className = "search-result-body";
  let body = item.body ?? "";
  if (body.length > 300) {
    body = body.substring(0, 300) + "...";
  }
  bodyDiv.textContent = body;

  contentDiv.appendChild(locationDiv);
  contentDiv.appendChild(bodyDiv);

  return contentDiv;
}
