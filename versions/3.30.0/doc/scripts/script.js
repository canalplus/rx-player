const rootUrl = window.rootUrl;

const searchParams = new URLSearchParams(window.location.search);

// =========== Initialize search ===========

/**
 * Last searched text.
 * `null` if nothing was yet searched in the current searching session.
 * @type {string|null}
 */
let lastSearch = null;

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
let searchInitStatus = "not-loaded";

/**
 * Contains the links to search results.
 * The elements of this array are in this same order than `elasticlunr`'s index.
 * @type {Array.<Object>}
 */
let searchIndexLinks = [];

/** Parent element to search-related dynamic elements (input + results ...) */
const searchWrapperElt = document.getElementById("search-wrapper");

/** All search icon elements in the page (hopefully, there's only one). */
const searchIconElts = document.getElementsByClassName("search-icon");

/** The Element corresponding to the search input. */
const searchBarElt = document.getElementById("searchbar");

/** The Element containing the search results. */
const searchResultsElt = document.getElementById("search-results");

const searchEngine = elasticlunr(function () {
  this.addField("h1");
  this.addField("h2");
  this.addField("h3");
  this.addField("body");
  this.setRef("id");
});

if (searchIconElts.length > 0) {
  for (let i = 0; i < searchIconElts.length; i++) {
    const searchIconElt = searchIconElts[i];
    searchIconElt.onclick = function() {
      lastSearch = null;
      searchResultsElt.innerHTML = "";
      searchBarElt.value = "";
      if (searchWrapperElt.classList.contains("active")) {
        searchParams.delete("search");
        history.replaceState(null, null, window.location.href.split("?")[0])
        searchWrapperElt.classList.remove("active");
        searchIconElt.classList.remove("active");
      } else {
        if (searchInitStatus === "not-loaded") {
          initializeSearchEngine().then(() => {
            updateSearchResults();
          });
        }
        window.scrollTo(0, 0);
        searchWrapperElt.classList.add("active");
        searchIconElt.classList.add("active");
        searchBarElt.focus();
        updateSearchResults();
      }
    }
  }
}

{
  const initialSearch = searchParams.get("search");
  if (initialSearch !== null) {
    searchWrapperElt.classList.add("active");
    for (let i = 0; i < searchIconElts.length; i++) {
      searchIconElts[i].classList.add("active");
    }
    searchBarElt.value = initialSearch;
    searchBarElt.focus();
    searchBarElt.selectionStart = searchBarElt.selectionEnd = searchBarElt.value.length;
    updateSearchResults();
    initializeSearchEngine().then(() => {
      updateSearchResults();
    });
  }
}

function initializeSearchEngine() {
  searchInitStatus = "loading";
  return fetch(rootUrl + "/searchIndex.json")
    .then(res => res.json())
    .then(res => {
      if (!Array.isArray(res)) {
        console.error("Failed to initialize search: index has an invalid format.");
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
          searchEngine.addDoc({
            h1: elt.h1,
            h2: elt.h2,
            h3: elt.h3,
            body: elt.body,
            id: id,
          });
          id++;
        }
      }
      searchInitStatus = "loaded";
    })
    .catch(err => {
      searchInitStatus = "failed";
      console.error("Could not initialize search:", err);
    });
}

if (searchBarElt !== null) {
  searchBarElt.oninput = function() {
    searchParams.set("search", searchBarElt.value);
    history.replaceState(null, null, "?" + searchParams.toString());
    updateSearchResults();
  }
}

function updateSearchResults() {
  const value = searchBarElt.value;
  if (value === lastSearch) {
    return;
  }

  if (value === "") {
    lastSearch = "";
    searchResultsElt.innerHTML = "<div class=\"message\">" +
      "Enter text to search in all documentation pages." +
      "</div>";
    return;
  }
  if (searchInitStatus === "not-loaded") {
    lastSearch = null;
    searchResultsElt.innerHTML = "<div class=\"message\">" +
      "Loading the search index..." +
      "</div>";
    return;
  }
  if (searchInitStatus === "failed") {
    lastSearch = null;
    searchResultsElt.innerHTML = "<div class=\"message\">" +
      "Error: an error happened while initializing the search index" +
      "</div>";
    return;
  }
  lastSearch = value;

  const searchResults = searchEngine.search(value, {
    fields: {
      h1: { boost: 5, bool: "AND" },
      h2: { boost: 4, bool: "AND" },
      h3: { boost: 3, bool: "AND" },
      body: { boost: 1 }
     },
    expand: true,
  });
  if (searchResults.length === 0) {
    searchResultsElt.innerHTML = "<div class=\"message\">" +
      "No result for that search." +
      "</div>";
    return;
  }
  searchResultsElt.innerHTML = "";
  for (let resIdx = 0; resIdx < searchResults.length && resIdx < 30; resIdx++) {
    const res = searchResults[resIdx];
    const links = searchIndexLinks[+res.ref];
    const contentDiv = document.createElement("div");
    contentDiv.className = "search-result-item";

    const locationDiv = document.createElement("div");
    locationDiv.className = "search-result-location";
    if (res.doc.h1 !== undefined && res.doc.h1 !== "") {
      let linkH1;
      if (links.anchorH1 !== undefined) {
        const href = rootUrl + "/" + links.file + "#" + links.anchorH1;
        linkH1 = document.createElement("a");
        linkH1.href = href;
      } else {
        linkH1 = document.createElement("span");
      }
      linkH1.className = "h1";
      linkH1.textContent = res.doc.h1;
      locationDiv.appendChild(linkH1);
      if (res.doc.h2 !== undefined && res.doc.h2 !== "") {
        const separatorSpan = document.createElement("span");
        separatorSpan.textContent = " > ";
        locationDiv.appendChild(separatorSpan);
        let linkH2;
        if (links.anchorH2 !== undefined) {
          const href = rootUrl + "/" + links.file + "#" + links.anchorH2;
          linkH2 = document.createElement("a");
          linkH2.href = href;
        } else {
          linkH2 = document.createElement("span");
        }
        linkH2.className = "h2";
        linkH2.textContent = res.doc.h2;
        locationDiv.appendChild(linkH2);
        if (res.doc.h3 !== undefined && res.doc.h3 !== "") {
          const separatorSpan = document.createElement("span");
          separatorSpan.textContent = " > ";
          locationDiv.appendChild(separatorSpan);
          let linkH3;
          if (links.anchorH3 !== undefined) {
            const href = rootUrl + "/" + links.file + "#" + links.anchorH3;
            linkH3 = document.createElement("a");
            linkH3.href = href;
          } else {
            linkH3 = document.createElement("span");
          }
          linkH3.className = "h3";
          linkH3.textContent = res.doc.h3;
          locationDiv.appendChild(linkH3);
        }
      }
    }
    const bodyDiv = document.createElement("div");
    bodyDiv.className = "search-result-body";
    let body = res.doc.body ?? "";
    if (body.length > 300) {
      body = body.substring(0, 300) + "...";
    }
    bodyDiv.textContent = body;

    contentDiv.appendChild(locationDiv);
    contentDiv.appendChild(bodyDiv);
    searchResultsElt.appendChild(contentDiv);
  }
  return;
}

// ========= Sidebar + PageList opening / closing ===========

const sidebarGroupElts = document.getElementsByClassName("sidebar-item-group");
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
  let status = "closed";
  let openingTimeout;
  let closingTimeout;

  if (ulElt !== undefined) {
    if (pageGroupElt.classList.contains("opened")) {
      // already opened sidebar group
      status = "opened";
      ulElt.style.display = "block";
      ulElt.style.height = `auto`;
    }
    ulElt.addEventListener("transitionend", onTransitionEnd);
  }

  groupElt.onclick = function () {
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
    openingTimeout = setTimeout(() => {
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
    closingTimeout = setTimeout(() => {
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

// ======= Scroll to right sidebar element =======

const active = document.querySelector(".sidebar-link.active");

if (active !== null) {
  const activeRect = active.getBoundingClientRect();
  if (activeRect.y + activeRect.height + 20 > window.innerHeight) {
    const sidebarWrapperElt = document.getElementsByClassName("sidebar-wrapper")[0];
    const scrollYBy = activeRect.y + activeRect.height  - window.innerHeight + 50;
    sidebarWrapperElt.scrollTo(0, scrollYBy);
  }
}

// ======= Hide / show header on scroll =======

let prevScroll = window.scrollY;
let isHeaderShown = true;
const headerElt = document.getElementsByClassName("navbar-parent")[0];

window.addEventListener("scroll", onScroll);

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
};

function hideHeader() {
  if (isHeaderShown) {
    headerElt.classList.add("hidden");
    isHeaderShown = false;
  }
}

function showHeader() {
  if (!isHeaderShown) {
    headerElt.classList.remove("hidden");
    isHeaderShown = true;
  }
}

// Work-arounds to make sure the header doesn't go on top
// of a link
if (window.location.hash !== "") {
  hideHeader();
}

window.onhashchange = function() {
  hideHeader();
  prevScroll = window.scrollY;
};

// ======= Hamburger menu ========

let opacityTimeout;
const overlay = document.createElement("div");
overlay.className = "overlay";

const hamburgerOpenerElt = document.getElementsByClassName("hamburger-opener")[0];
const hamburgerBarElt = document.getElementsByClassName("hamburger-bar")[0];
const hamburgerCloserElt = document.getElementsByClassName("hamburger-bar-closer")[0];

hamburgerOpenerElt.onclick = openMenu;
hamburgerCloserElt.onclick = closeMenu;

let isOverlayVisible = false;
overlay.onclick = function() {
  if (isOverlayVisible) {
    closeMenu();
  }
}

function openMenu() {
  clearTimeout(opacityTimeout);
  document.body.style.overflowY = "hidden";
  document.body.appendChild(overlay);
  opacityTimeout = setTimeout(() => {
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
