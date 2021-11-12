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
      console.time("Search initialization");
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
      console.timeEnd("Search initialization");
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
window.onhashchange = hideHeader;

// ======= Hamburger menu ========

let opacityTimeout;
const overlay = document.createElement("div");
overlay.className = "overlay";

const hamburgerOpenerElt = document.getElementsByClassName("hamburger-opener")[0];
const hamburgerBarElt = document.getElementsByClassName("hamburger-bar")[0];
const hamburgerCloserElt = document.getElementsByClassName("hamburger-bar-closer")[0];

hamburgerOpenerElt.onclick = function() {
  clearTimeout(opacityTimeout);
  document.body.style.overflowY = "hidden";
  document.body.appendChild(overlay);
  opacityTimeout = setTimeout(() => {
    overlay.style.opacity = "1";
  });
  hamburgerBarElt.classList.add("opened");
};

hamburgerCloserElt.onclick = function() {
  clearTimeout(opacityTimeout);
  document.body.style.overflowY = "auto";
  overlay.style.opacity = "0";
  document.body.removeChild(overlay);
  hamburgerBarElt.classList.remove("opened");
};

// const cachedLocalLinks = {};

// const allLinks = document.getElementsByTagName("a");
// for (let i = 0; i < allLinks.length; i++) {
//   allLinks[i].onmouseover = function() {
//     const href = allLinks[i].href

//     // XXX TODO
//     if (href !== "") {
//       requestAsHtml(allLinks[i].href).then((res) => {
//       });
//     }
//   };
// }

// function requestAsHtml(url) {
//   let prom;
//   if (cachedLocalLinks[url] !== undefined) {
//     prom = cachedLocalLinks[url];
//   } else {
//     prom = fetch(url).then(res => res.text());
//     cachedLocalLinks[url] = prom;
//   }
//   return prom
//     .then(res => {
//       return new DOMParser().parseFromString(res, "text/html");
//     });
// }

///* InstantClick 3.1.0 | (C) 2014-2017 Alexandre Dieulot | http://instantclick.io/license */

//var instantclick
//  , InstantClick = instantclick = function(document, location, $userAgent) {
//  // Internal variables
//  var $currentLocationWithoutHash
//    , $urlToPreload
//    , $preloadTimer
//    , $lastTouchTimestamp
//    , $hasBeenInitialized
//    , $touchEndedWithoutClickTimer
//    , $lastUsedTimeoutId = 0

//  // Preloading-related variables
//    , $history = {}
//    , $xhr
//    , $url = false
//    , $title = false
//    , $isContentTypeNotHTML
//    , $areTrackedElementsDifferent
//    , $body = false
//    , $lastDisplayTimestamp = 0
//    , $isPreloading = false
//    , $isWaitingForCompletion = false
//    , $gotANetworkError = false
//    , $trackedElementsData = []

//  // Variables defined by public functions
//    , $preloadOnMousedown
//    , $delayBeforePreload = 65
//    , $eventsCallbacks = {
//        preload: [],
//        receive: [],
//        wait: [],
//        change: [],
//        restore: [],
//        exit: []
//      }
//    , $timers = {}
//    , $currentPageXhrs = []
//    , $windowEventListeners = {}
//    , $delegatedEvents = {}


//  ////////// POLYFILL //////////


//  // Needed for `addEvent`
//  if (!Element.prototype.matches) {
//    Element.prototype.matches =
//      Element.prototype.webkitMatchesSelector ||
//      Element.prototype.msMatchesSelector ||
//      function (selector) {
//        var matches = document.querySelectorAll(selector)
//        for (var i = 0; i < matches.length; i++) {
//          if (matches[i] == this) {
//            return true
//          }
//        }
//        return false
//      }
//  }


//  ////////// HELPERS //////////


//  function removeHash(url) {
//    var index = url.indexOf('#')
//    if (index == -1) {
//      return url
//    }
//    return url.substr(0, index)
//  }

//  function getParentLinkElement(element) {
//    while (element && element.nodeName != 'A') {
//      element = element.parentNode
//    }
//    // `element` will be null if no link element is found
//    return element
//  }

//  function isBlacklisted(element) {
//    do {
//      if (!element.hasAttribute) { // Parent of <html>
//        break
//      }
//      if (element.hasAttribute('data-instant')) {
//        return false
//      }
//      if (element.hasAttribute('data-no-instant')) {
//        return true
//      }
//    }
//    while (element = element.parentNode)
//    return false
//  }

//  function isPreloadable(linkElement) {
//    var domain = location.protocol + '//' + location.host

//    if (linkElement.target // target="_blank" etc.
//        || linkElement.hasAttribute('download')
//        || linkElement.href.indexOf(domain + '/') != 0 // Another domain, or no href attribute
//        || (linkElement.href.indexOf('#') > -1
//            && removeHash(linkElement.href) == $currentLocationWithoutHash) // Anchor
//        || isBlacklisted(linkElement)
//       ) {
//      return false
//    }
//    return true
//  }

//  function triggerPageEvent(eventType) {
//    var argumentsToApply = Array.prototype.slice.call(arguments, 1)
//      , returnValue = false
//    for (var i = 0; i < $eventsCallbacks[eventType].length; i++) {
//      if (eventType == 'receive') {
//        var altered = $eventsCallbacks[eventType][i].apply(window, argumentsToApply)
//        if (altered) {
//          // Update arguments for the next iteration of the loop.
//          if ('body' in altered) {
//            argumentsToApply[1] = altered.body
//          }
//          if ('title' in altered) {
//            argumentsToApply[2] = altered.title
//          }

//          returnValue = altered
//        }
//      }
//      else {
//        $eventsCallbacks[eventType][i].apply(window, argumentsToApply)
//      }
//    }
//    return returnValue
//  }

//  function changePage(title, body, urlTPush, scrollPosition) {
//    abortCurrentPageXhrs()

//    document.documentElement.replaceChild(body, document.body)
//    // We cannot just use `document.body = doc.body`, it causes Safari (tested
//    // 5.1, 6.0 and Mobile 7.0) to execute script tags directly.

//    document.title = title

//    if (urlToPush) {
//      addOrRemoveWindowEventListeners('remove')
//      if (urlToPush != location.href) {
//        history.pushState(null, null, urlToPush)

//        if ($userAgent.indexOf(' CriOS/') > -1) {
//          // Chrome for iOS:
//          //
//          // 1. Removes title in tab on pushState, so it needs to be set after.
//          //
//          // 2. Will not set the title if it's identical after trimming, so we
//          //    add a non-breaking space.
//          if (document.title == title) {
//            document.title = title + String.fromCharCode(160)
//          }
//          else {
//            document.title = title
//          }
//        }
//      }

//      var hashIndex = urlToPush.indexOf('#')
//        , offsetElement = hashIndex > -1
//                     && document.getElementById(urlToPush.substr(hashIndex + 1))
//        , offset = 0

//      if (offsetElement) {
//        while (offsetElement.offsetParent) {
//          offset += offsetElement.offsetTop

//          offsetElement = offsetElement.offsetParent
//        }
//      }
//      if ('requestAnimationFrame' in window) {
//        // Safari on macOS doesn't immediately visually change the page on
//        // `document.documentElement.replaceChild`, so if `scrollTo` is called
//        // without `requestAnimationFrame` it often scrolls before the page
//        // is displayed.
//        requestAnimationFrame(function() {
//          scrollTo(0, offset)
//        })
//      }
//      else {
//        scrollTo(0, offset)
//        // Safari on macOS scrolls before the page is visually changed, but
//        // adding `requestAnimationFrame` doesn't fix it in this case.
//      }

//      clearCurrentPageTimeouts()

//      $currentLocationWithoutHash = removeHash(urlToPush)

//      if ($currentLocationWithoutHash in $windowEventListeners) {
//        $windowEventListeners[$currentLocationWithoutHash] = []
//      }

//      $timers[$currentLocationWithoutHash] = {}

//      applyScriptElements(function(element) {
//        return !element.hasAttribute('data-instant-track')
//      })

//      triggerPageEvent('change', false)
//    }
//    else {
//      // On popstate, browsers scroll by themselves, but at least Firefox
//      // scrolls BEFORE popstate is fired and thus before we can replace the
//      // page. If the page before popstate is too short the user won't be
//      // scrolled at the right position as a result. We need to scroll again.
//      scrollTo(0, scrollPosition)

//      // iOS's gesture to go back by swiping from the left edge of the screen
//      // will start a preloading if the user touches a link, it needs to be
//      // cancelled otherwise the page behind the touched link will be
//      // displayed.
//      $xhr.abort()
//      setPreloadingAsHalted()

//      applyScriptElements(function(element) {
//        return element.hasAttribute('data-instant-restore')
//      })

//      restoreTimers()

//      triggerPageEvent('restore')
//    }
//  }

//  function setPreloadingAsHalted() {
//    $isPreloading = false
//    $isWaitingForCompletion = false
//  }

//  function removeNoscriptTags(html) {
//    // Must be done on text, not on a node's innerHTML, otherwise strange
//    // things happen with implicitly closed elements (see the Noscript test).
//    return html.replace(/<noscript[\s\S]+?<\/noscript>/gi, '')
//  }

//  function abortCurrentPageXhrs() {
//    for (var i = 0; i < $currentPageXhrs.length; i++) {
//      if (typeof $currentPageXhrs[i] == 'object' && 'abort' in $currentPageXhrs[i]) {
//        $currentPageXhrs[i].instantclickAbort = true
//        $currentPageXhrs[i].abort()
//      }
//    }
//    $currentPageXhrs = []
//  }

//  function clearCurrentPageTimeouts() {
//    for (var i in $timers[$currentLocationWithoutHash]) {
//      var timeout = $timers[$currentLocationWithoutHash][i]
//      window.clearTimeout(timeout.realId)
//      timeout.delayLeft = timeout.delay - +new Date + timeout.timestamp
//    }
//  }

//  function restoreTimers() {
//    for (var i in $timers[$currentLocationWithoutHash]) {
//      if (!('delayLeft' in $timers[$currentLocationWithoutHash][i])) {
//        continue
//      }
//      var args = [
//        $timers[$currentLocationWithoutHash][i].callback,
//        $timers[$currentLocationWithoutHash][i].delayLeft
//      ]
//      for (var j = 0; j < $timers[$currentLocationWithoutHash][i].params.length; j++) {
//        args.push($timers[$currentLocationWithoutHash][i].params[j])
//      }
//      addTimer(args, $timers[$currentLocationWithoutHash][i].isRepeating, $timers[$currentLocationWithoutHash][i].delay)
//      delete $timers[$currentLocationWithoutHash][i]
//    }
//  }

//  function handleTouchendWithoutClick() {
//    $xhr.abort()
//    setPreloadingAsHalted()
//  }

//  function addOrRemoveWindowEventListeners(addOrRemove) {
//    if ($currentLocationWithoutHash in $windowEventListeners) {
//      for (var i = 0; i < $windowEventListeners[$currentLocationWithoutHash].length; i++) {
//        window[addOrRemove + 'EventListener'].apply(window, $windowEventListeners[$currentLocationWithoutHash][i])
//      }
//    }
//  }

//  function applyScriptElements(condition) {
//    var scriptElementsInDOM = document.body.getElementsByTagName('script')
//      , scriptElementsToCopy = []
//      , originalElement
//      , copyElement
//      , parentNode
//      , nextSibling
//      , i

//    // `scriptElementsInDOM` will change during the copy of scripts if
//    // a script add or delete script elements, so we need to put script
//    // elements in an array to loop through them correctly.
//    for (i = 0; i < scriptElementsInDOM.length; i++) {
//      scriptElementsToCopy.push(scriptElementsInDOM[i])
//    }

//    for (i = 0; i < scriptElementsToCopy.length; i++) {
//      originalElement = scriptElementsToCopy[i]
//      if (!originalElement) { // Might have disappeared, see previous comment
//        continue
//      }
//      if (!condition(originalElement)) {
//        continue
//      }

//      copyElement = document.createElement('script')
//      for (var j = 0; j < originalElement.attributes.length; j++) {
//        copyElement.setAttribute(originalElement.attributes[j].name, originalElement.attributes[j].value)
//      }
//      copyElement.textContent = originalElement.textContent

//      parentNode = originalElement.parentNode
//      nextSibling = originalElement.nextSibling
//      parentNode.removeChild(originalElement)
//      parentNode.insertBefore(copyElement, nextSibling)
//    }
//  }

//  function addTrackedElements() {
//    var trackedElements = document.querySelectorAll('[data-instant-track]')
//      , element
//      , elementData
//    for (var i = 0; i < trackedElements.length; i++) {
//      element = trackedElements[i]
//      elementData = element.getAttribute('href') || element.getAttribute('src') || element.textContent
//      // We can't use just `element.href` and `element.src` because we can't
//      // retrieve `href`s and `src`s from the Ajax response.
//      $trackedElementsData.push(elementData)
//    }
//  }

//  function addTimer(args, isRepeating, realDelay) {
//    var callback = args[0]
//      , delay = args[1]
//      , params = [].slice.call(args, 2)
//      , timestamp = +new Date

//    $lastUsedTimeoutId++
//    var id = $lastUsedTimeoutId

//    var callbackModified
//    if (isRepeating) {
//      callbackModified = function(args2) {
//        callback(args2)
//        delete $timers[$currentLocationWithoutHash][id]
//        args[0] = callback
//        args[1] = delay
//        addTimer(args, true)
//      }
//    }
//    else {
//      callbackModified = function(args2) {
//        callback(args2)
//        delete $timers[$currentLocationWithoutHash][id]
//      }
//    }

//    args[0] = callbackModified
//    if (realDelay != undefined) {
//      timestamp += delay - realDelay
//      delay = realDelay
//    }
//    var realId = window.setTimeout.apply(window, args)
//    $timers[$currentLocationWithoutHash][id] = {
//      realId: realId,
//      timestamp: timestamp,
//      callback: callback,
//      delay: delay,
//      params: params,
//      isRepeating: isRepeating
//    }
//    return -id
//  }


//  ////////// EVENT LISTENERS //////////


//  function mousedownListener(event) {
//    var linkElement = getParentLinkElement(event.target)

//    if (!linkElement || !isPreloadable(linkElement)) {
//      return
//    }

//    preload(linkElement.href)
//  }

//  function mouseoverListener(event) {
//    if ($lastTouchTimestamp > (+new Date - 500)) {
//      // On a touch device, if the content of the page change on mouseover
//      // click is never fired and the user will need to tap a second time.
//      // https://developer.apple.com/library/content/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html#//apple_ref/doc/uid/TP40006511-SW4
//      //
//      // Content change could happen in the `preload` event, so we stop there.
//      return
//    }

//    if (+new Date - $lastDisplayTimestamp < 100) {
//      // After a page is displayed, if the user's cursor happens to be above
//      // a link a mouseover event will be in most browsers triggered
//      // automatically, and in other browsers it will be triggered when the
//      // user moves his mouse by 1px.
//      //
//      // Here are the behaviors I noticed, all on Windows:
//      // - Safari 5.1: auto-triggers after 0 ms
//      // - IE 11: auto-triggers after 30-80 ms (depends on page's size?)
//      // - Firefox: auto-triggers after 10 ms
//      // - Opera 18: auto-triggers after 10 ms
//      //
//      // - Chrome: triggers when cursor moved
//      // - Opera 12.16: triggers when cursor moved
//      //
//      // To remedy to this, we do nothing if the last display occurred less
//      // than 100 ms ago.

//      return
//    }

//    var linkElement = getParentLinkElement(event.target)

//    if (!linkElement) {
//      return
//    }

//    if (linkElement == getParentLinkElement(event.relatedTarget)) {
//      // Happens when mouseout-ing and mouseover-ing child elements of the same link element
//      return
//    }

//    if (!isPreloadable(linkElement)) {
//      return
//    }

//    linkElement.addEventListener('mouseout', mouseoutListener)

//    if (!$isWaitingForCompletion) {
//      $urlToPreload = linkElement.href
//      $preloadTimer = setTimeout(preload, $delayBeforePreload)
//    }
//  }

//  function touchstartListener(event) {
//    $lastTouchTimestamp = +new Date

//    var linkElement = getParentLinkElement(event.target)

//    if (!linkElement || !isPreloadable(linkElement)) {
//      return
//    }

//    if ($touchEndedWithoutClickTimer) {
//      clearTimeout($touchEndedWithoutClickTimer)
//      $touchEndedWithoutClickTimer = false
//    }

//    linkElement.addEventListener('touchend', touchendAndTouchcancelListener)
//    linkElement.addEventListener('touchcancel', touchendAndTouchcancelListener)

//    preload(linkElement.href)
//  }

//  function clickListenerPrelude() {
//    // Makes clickListener be fired after everyone else, so that we can respect
//    // event.preventDefault.
//    document.addEventListener('click', clickListener)
//  }

//  function clickListener(event) {
//    document.removeEventListener('click', clickListener)

//    if ($touchEndedWithoutClickTimer) {
//      clearTimeout($touchEndedWithoutClickTimer)
//      $touchEndedWithoutClickTimer = false
//    }

//    if (event.defaultPrevented) {
//      return
//    }

//    var linkElement = getParentLinkElement(event.target)

//    if (!linkElement || !isPreloadable(linkElement)) {
//      return
//    }

//    // Check if it's opening in a new tab
//    if (event.button != 0 // Chrome < 55 fires a click event when the middle mouse button is pressed
//      || event.metaKey
//      || event.ctrlKey) {
//      return
//    }
//    event.preventDefault()
//    display(linkElement.href)
//  }

//  function mouseoutListener(event) {
//    if (getParentLinkElement(event.target) == getParentLinkElement(event.relatedTarget)) {
//      // Happens when mouseout-ing and mouseover-ing child elements of the same link element,
//      // we don't want to stop preloading then.
//      return
//    }

//    if ($preloadTimer) {
//      clearTimeout($preloadTimer)
//      $preloadTimer = false
//      return
//    }

//    if (!$isPreloading || $isWaitingForCompletion) {
//      return
//    }

//    $xhr.abort()
//    setPreloadingAsHalted()
//  }

//  function touchendAndTouchcancelListener(event) {
//    if (!$isPreloading || $isWaitingForCompletion) {
//      return
//    }

//    $touchEndedWithoutClickTimer = setTimeout(handleTouchendWithoutClick, 500)
//  }

//  function readystatechangeListener() {
//    if ($xhr.readyState == 2) { // headers received
//      var contentType = $xhr.getResponseHeader('Content-Type')
//      if (!contentType || !/^text\/html/i.test(contentType)) {
//        $isContentTypeNotHTML = true
//      }
//    }

//    if ($xhr.readyState < 4) {
//      return
//    }

//    if ($xhr.status == 0) {
//      // Request error/timeout/abort
//      $gotANetworkError = true
//      if ($isWaitingForCompletion) {
//        triggerPageEvent('exit', $url, 'network error')
//        location.href = $url
//      }
//      return
//    }

//    if ($isContentTypeNotHTML) {
//      if ($isWaitingForCompletion) {
//        triggerPageEvent('exit', $url, 'non-html content-type')
//        location.href = $url
//      }
//      return
//    }

//    var doc = document.implementation.createHTMLDocument('')
//    doc.documentElement.innerHTML = removeNoscriptTags($xhr.responseText)
//    $title = doc.title
//    $body = doc.body

//    var alteredOnReceive = triggerPageEvent('receive', $url, $body, $title)
//    if (alteredOnReceive) {
//      if ('body' in alteredOnReceive) {
//        $body = alteredOnReceive.body
//      }
//      if ('title' in alteredOnReceive) {
//        $title = alteredOnReceive.title
//      }
//    }

//    var urlWithoutHash = removeHash($url)
//    $history[urlWithoutHash] = {
//      body: $body,
//      title: $title,
//      scrollPosition: urlWithoutHash in $history ? $history[urlWithoutHash].scrollPosition : 0
//    }

//    var trackedElements = doc.querySelectorAll('[data-instant-track]')
//      , element
//      , elementData

//    if (trackedElements.length != $trackedElementsData.length) {
//      $areTrackedElementsDifferent = true
//    }
//    else {
//      for (var i = 0; i < trackedElements.length; i++) {
//        element = trackedElements[i]
//        elementData = element.getAttribute('href') || element.getAttribute('src') || element.textContent
//        if ($trackedElementsData.indexOf(elementData) == -1) {
//          $areTrackedElementsDifferent = true
//        }
//      }
//    }

//    if ($isWaitingForCompletion) {
//      $isWaitingForCompletion = false
//      display($url)
//    }
//  }

//  function popstateListener() {
//    var loc = removeHash(location.href)
//    if (loc == $currentLocationWithoutHash) {
//      return
//    }

//    if ($isWaitingForCompletion) {
//      setPreloadingAsHalted()
//      $xhr.abort()
//    }

//    if (!(loc in $history)) {
//      triggerPageEvent('exit', location.href, 'not in history')
//      if (loc == location.href) { // no location.hash
//        location.href = location.href
//        // Reloads the page while using cache for scripts, styles and images,
//        // unlike `location.reload()`
//      }
//      else {
//        // When there's a hash, `location.href = location.href` won't reload
//        // the page (but will trigger a popstate event, thus causing an infinite
//        // loop), so we need to call `location.reload()`
//        location.reload()
//      }
//      return
//    }

//    $history[$currentLocationWithoutHash].scrollPosition = pageYOffset
//    clearCurrentPageTimeouts()
//    addOrRemoveWindowEventListeners('remove')
//    $currentLocationWithoutHash = loc
//    changePage($history[loc].title, $history[loc].body, false, $history[loc].scrollPosition)
//    addOrRemoveWindowEventListeners('add')
//  }


//  ////////// MAIN FUNCTIONS //////////


//  function preload(url) {
//    if ($preloadTimer) {
//      clearTimeout($preloadTimer)
//      $preloadTimer = false
//    }

//    if (!url) {
//      url = $urlToPreload
//    }

//    if ($isPreloading && (url == $url || $isWaitingForCompletion)) {
//      return
//    }
//    $isPreloading = true
//    $isWaitingForCompletion = false

//    $url = url
//    $body = false
//    $isContentTypeNotHTML = false
//    $gotANetworkError = false
//    $areTrackedElementsDifferent = false
//    triggerPageEvent('preload')
//    $xhr.open('GET', url)
//    $xhr.timeout = 90000 // Must be set after `open()` with IE
//    $xhr.send()
//  }

//  function display(url) {
//    $lastDisplayTimestamp = +new Date
//    if ($preloadTimer || !$isPreloading) {
//      // $preloadTimer:
//      // Happens when there's a delay before preloading and that delay
//      // hasn't expired (preloading didn't kick in).
//      //
//      // !$isPreloading:
//      // A link has been clicked, and preloading hasn't been initiated.
//      // It happens with touch devices when a user taps *near* the link,
//      // causing `touchstart` not to be fired. Safari/Chrome will trigger
//      // `mouseover`, `mousedown`, `click` (and others), but when that happens
//      // we do nothing in `mouseover` as it may cause `click` not to fire (see
//      // comment in `mouseoverListener`).
//      //
//      // It also happens when a user uses his keyboard to navigate (with Tab
//      // and Return), and possibly in other non-mainstream ways to navigate
//      // a website.

//      if ($preloadTimer && $url && $url != url) {
//        // Happens when the user clicks on a link before preloading
//        // kicks in while another link is already preloading.

//        triggerPageEvent('exit', url, 'click occured while preloading planned')
//        location.href = url
//        return
//      }

//      preload(url)
//      triggerPageEvent('wait')
//      $isWaitingForCompletion = true // Must be set *after* calling `preload`
//      return
//    }
//    if ($isWaitingForCompletion) {
//      // The user clicked on a link while a page to display was preloading.
//      // Either on the same link or on another link. If it's the same link
//      // something might have gone wrong (or he could have double clicked, we
//      // don't handle that case), so we send him to the page without pjax.
//      // If it's another link, it hasn't been preloaded, so we redirect the
//      // user to it.
//      triggerPageEvent('exit', url, 'clicked on a link while waiting for another page to display')
//      location.href = url
//      return
//    }
//    if ($isContentTypeNotHTML) {
//      triggerPageEvent('exit', $url, 'non-html content-type')
//      location.href = $url
//      return
//    }
//    if ($gotANetworkError) {
//      triggerPageEvent('exit', $url, 'network error')
//      location.href = $url
//      return
//    }
//    if ($areTrackedElementsDifferent) {
//      triggerPageEvent('exit', $url, 'different assets')
//      location.href = $url
//      return
//    }
//    if (!$body) {
//      triggerPageEvent('wait')
//      $isWaitingForCompletion = true
//      return
//    }
//    $history[$currentLocationWithoutHash].scrollPosition = pageYOffset
//    setPreloadingAsHalted()
//    changePage($title, $body, $url)
//  }


//  ////////// PUBLIC VARIABLE AND FUNCTIONS //////////


//  var supported = false
//  if ('pushState' in history
//      && location.protocol != "file:") {
//    supported = true

//    var indexOfAndroid = $userAgent.indexOf('Android ')
//    if (indexOfAndroid > -1) {
//      // The stock browser in Android 4.0.3 through 4.3.1 supports pushState,
//      // though it doesn't update the address bar.
//      //
//      // More problematic is that it has a bug on `popstate` when coming back
//      // from a page not displayed through InstantClick: `location.href` is
//      // undefined and `location.reload()` doesn't work.
//      //
//      // Android < 4.4 is therefore blacklisted, unless it's a browser known
//      // not to have that latter bug.

//      var androidVersion = parseFloat($userAgent.substr(indexOfAndroid + 'Android '.length))
//      if (androidVersion < 4.4) {
//        supported = false
//        if (androidVersion >= 4) {
//          var whitelistedBrowsersUserAgentsOnAndroid4 = [
//            / Chrome\//, // Chrome, Opera, Puffin, QQ, Yandex
//            / UCBrowser\//,
//            / Firefox\//,
//            / Windows Phone /, // WP 8.1+ pretends to be Android
//          ]
//          for (var i = 0; i < whitelistedBrowsersUserAgentsOnAndroid4.length; i++) {
//            if (whitelistedBrowsersUserAgentsOnAndroid4[i].test($userAgent)) {
//              supported = true
//              break
//            }
//          }
//        }
//      }
//    }
//  }

//  function init(preloadingMode) {
//    if (!supported) {
//      triggerPageEvent('change', true)
//      return
//    }

//    if ($hasBeenInitialized) {
//      return
//    }
//    $hasBeenInitialized = true

//    if (preloadingMode == 'mousedown') {
//      $preloadOnMousedown = true
//    }
//    else if (typeof preloadingMode == 'number') {
//      $delayBeforePreload = preloadingMode
//    }

//    $currentLocationWithoutHash = removeHash(location.href)
//    $timers[$currentLocationWithoutHash] = {}
//    $history[$currentLocationWithoutHash] = {
//      body: document.body,
//      title: document.title,
//      scrollPosition: pageYOffset
//    }

//    if (document.readyState == 'loading') {
//      document.addEventListener('DOMContentLoaded', addTrackedElements)
//    }
//    else {
//      addTrackedElements()
//    }

//    $xhr = new XMLHttpRequest()
//    $xhr.addEventListener('readystatechange', readystatechangeListener)

//    document.addEventListener('touchstart', touchstartListener, true)
//    if ($preloadOnMousedown) {
//      document.addEventListener('mousedown', mousedownListener, true)
//    }
//    else {
//      document.addEventListener('mouseover', mouseoverListener, true)
//    }
//    document.addEventListener('click', clickListenerPrelude, true)

//    addEventListener('popstate', popstateListener)
//  }

//  function on(eventType, callback) {
//    $eventsCallbacks[eventType].push(callback)

//    if (eventType == 'change') {
//      callback(!$lastDisplayTimestamp)
//    }
//  }

//  function setTimeout() {
//    return addTimer(arguments, false)
//  }

//  function setInterval() {
//    return addTimer(arguments, true)
//  }

//  function clearTimeout(id) {
//    id = -id
//    for (var loc in $timers) {
//      if (id in $timers[loc]) {
//        window.clearTimeout($timers[loc][id].realId)
//        delete $timers[loc][id]
//      }
//    }
//  }

//  function xhr(xhr) {
//    $currentPageXhrs.push(xhr)
//  }

//  function addPageEvent() {
//    if (!($currentLocationWithoutHash in $windowEventListeners)) {
//      $windowEventListeners[$currentLocationWithoutHash] = []
//    }
//    $windowEventListeners[$currentLocationWithoutHash].push(arguments)
//    addEventListener.apply(window, arguments)
//  }

//  function removePageEvent() {
//    if (!($currentLocationWithoutHash in $windowEventListeners)) {
//      return
//    }
//    firstLoop:
//    for (var i = 0; i < $windowEventListeners[$currentLocationWithoutHash].length; i++) {
//      if (arguments.length != $windowEventListeners[$currentLocationWithoutHash][i].length) {
//        continue
//      }
//      for (var j = 0; j < $windowEventListeners[$currentLocationWithoutHash][i].length; j++) {
//        if (arguments[j] != $windowEventListeners[$currentLocationWithoutHash][i][j]) {
//          continue firstLoop
//        }
//      }
//      $windowEventListeners[$currentLocationWithoutHash].splice(i, 1)
//    }
//  }

//  function addEvent(selector, type, listener) {
//    if (!(type in $delegatedEvents)) {
//      $delegatedEvents[type] = {}

//      document.addEventListener(type, function(event) {
//        var element = event.target
//        event.originalStopPropagation = event.stopPropagation
//        event.stopPropagation = function() {
//          this.isPropagationStopped = true
//          this.originalStopPropagation()
//        }
//        while (element && element.nodeType == 1) {
//          for (var selector in $delegatedEvents[type]) {
//            if (element.matches(selector)) {
//              for (var i = 0; i < $delegatedEvents[type][selector].length; i++) {
//                $delegatedEvents[type][selector][i].call(element, event)
//              }
//              if (event.isPropagationStopped) {
//                return
//              }
//              break
//            }
//          }
//          element = element.parentNode
//        }
//      }, false) // Third parameter isn't optional in Firefox < 6

//      if (type == 'click' && /iP(?:hone|ad|od)/.test($userAgent)) {
//        // Force Mobile Safari to trigger the click event on document by adding a pointer cursor to body

//        var styleElement = document.createElement('style')
//        styleElement.setAttribute('instantclick-mobile-safari-cursor', '') // So that this style element doesn't surprise developers in the browser DOM inspector.
//        styleElement.textContent = 'body { cursor: pointer !important; }'
//        document.head.appendChild(styleElement)
//      }
//    }

//    if (!(selector in $delegatedEvents[type])) {
//      $delegatedEvents[type][selector] = []
//    }

//    // Run removeEvent beforehand so that it can't be added twice
//    removeEvent(selector, type, listener)

//    $delegatedEvents[type][selector].push(listener)
//  }

//  function removeEvent(selector, type, listener) {
//    var index = $delegatedEvents[type][selector].indexOf(listener)
//    if (index > -1) {
//      $delegatedEvents[type][selector].splice(index, 1)
//    }
//  }


//  ////////////////////


//  return {
//    supported: supported,
//    init: init,
//    on: on,
//    setTimeout: setTimeout,
//    setInterval: setInterval,
//    clearTimeout: clearTimeout,
//    xhr: xhr,
//    addPageEvent: addPageEvent,
//    removePageEvent: removePageEvent,
//    addEvent: addEvent,
//    removeEvent: removeEvent
//  }

//}(document, location, navigator.userAgent);
