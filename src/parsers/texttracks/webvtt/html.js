import parseTimestamp from "../utils/parseTimestamp";

/** 
* Parse WebVTT from text. Returns an array with:
* - start : start of current cue, in seconds
* - end : end of current cue, in seconds
* - content : HTML formatted cue.
*
* Global style is parsed and applied to div element. 
* Specific style is parsed and applied to class element. 
*
* @param {string} text
* @return {Array.<Object>}
*/
export default function parseWebVTT(text) {
  const newLineChar = /\r\n|\n|\r/g;
  const linified = text.split(newLineChar);
  const cuesArray = [];
  const styleElements = [];

  if (!linified[0].match(/^WEBVTT(\ |\t|\n|\r|$)/)) {
    throw new Error("Can't parse WebVTT: Invalid File.");
  }

  for (let i = 1; i < linified.length; i++) {
    if (isStartOfStyleBlock(linified[i])) {
      const startOfStyleBlock = i;
      i++;

      // continue incrementing i until either:
      //   - empty line
      //   - end of file
      while(!(linified[i].match(/^\r/) || linified[i].length === 0)) {
        i++;
      }
      const styleBlock = linified.slice(startOfStyleBlock, i);
      const parsedStyles = parseStyleBlock(styleBlock);
      styleElements.push(...parsedStyles);
    }
  }

  // Parse cues, format and apply style.
  for (let i = 1; i < linified.length; i++) {
    if (!(linified[i].match(/^\r/) || linified[i].length === 0)) {
      if (isStartOfCueBlock(linified[i])) {
        cuesArray.push(parseCue(i, linified, styleElements));
      }
      while (linified[i] 
        && !(linified[i].match(/^\r/) || linified[i].length === 0)) {
        i++;
      }
    }
  }

  return cuesArray;
}

function isStartOfStyleBlock(text) {
  return text.match(/^STYLE.*?/g);
}

function isStartOfNoteBlock(text) {
  return text.match(/^NOTE.*?/g);
}

function isStartOfRegionBlock(text) {
  return text.match(/^REGION.*?/g);
}

function isStartOfCueBlock(text) {
  return (!isStartOfNoteBlock(text) &&
   !isStartOfStyleBlock(text) &&
   !isStartOfRegionBlock(text));
}

/**
 * 
 * Parse style element from WebVTT.
 * @param {number} index 
 * @param {Array.<string>} linified 
 */
function parseStyleBlock(styleBlock) {

  const styleElements = [];
  let index = 1;
  const className = [];
  const cueClassLine = styleBlock[index].match(/cue\(\.{0,1}(.*?)\)/);
  className.push(cueClassLine ? cueClassLine[1] : "cue");

  index++;

  while( styleBlock[index].match(/cue\(\.{0,1}(.*?)\)/)) {
    const cueClassLine =  styleBlock[index].match(/cue\(\.{0,1}(.*?)\)/);
    className.push(cueClassLine ? cueClassLine[1] : "cue");
    index++;
  }

  let styleContent = "";

  while (!( styleBlock[index].match(/}/))) {
    styleContent +=  styleBlock[index];
    index++;
  }
  className.forEach(c => {
    styleElements.push({
      className: c,
      styleContent: styleContent.replace(/\s/g,""),
    });
  });

  return styleElements;
}

/**
 * 
 * @param {number} index 
 * @param {Array.<string>} linified 
 * @param {Array.<Object>} styleElements 
 * @returns {Object}
 */
function parseCue(index, linified, styleElements) {
  const region = document.createElement("div");
  const regionAttr = document.createAttribute("style");
  regionAttr.value = 
    "width:100%; \
    height:100%; \
    display:flex; \
    flex-direction:column; \
    justify-content:flex-end; \
    align-items:center;";
  region.setAttributeNode(regionAttr);

  // Get Header. It may be a class name associated with cue.
  const header = linified[index];
  index++;

  // Get time ranges.
  const timeCodes = linified[index];
  const range = parseTimeCode(timeCodes);
  index++;

  // Get content, format and apply style.
  const pElement = document.createElement("p");
  const pAttr = document.createAttribute("style");
  pAttr.value = "text-align:center";
  pElement.setAttributeNode(pAttr);

  const spanElement = document.createElement("span");
  const attr = document.createAttribute("style");
  attr.value = 
  "background-color:rgba(0,0,0,0.8); \
  color:white;";
  spanElement.setAttributeNode(attr);

  const styles = styleElements
  .filter(f => f.className === header || f.className === "cue")
  .map(f => f.styleContent);
  if(styles) {
    attr.value += styles.join();
    spanElement.setAttributeNode(attr);
  }

  while (!(linified[index].match(/^\r/) || linified[index].length === 0)) {

    if(spanElement.childNodes.length != 0) {
      spanElement.appendChild(document.createElement("br"));}
    
    formatWebVTTtoHTML(linified[index], styleElements)
      .forEach(child =>{
        spanElement.appendChild(child);
      });

    index++;
  }

  region.appendChild(pElement) ;
  pElement.appendChild(spanElement);

  return { start: range.start, end: range.end, content: region };
}

function parseTimeCode(text) {
  const splittedText = text.split(/(?:\ |\t)-->(?:\ |\t)/g);
  const start = parseTimestamp(splittedText[0]);
  const end = parseTimestamp(splittedText[1]);

  return { start, end };
}
 
  /**
  * Format WebVTT tags and classes into usual HTML.
  * <b *> => <b>
  * <u *> => <u>
  * <i *> => <i>
  * <c.class *> => <c.class>
  * Style is inserted if associated to tag or class.
  * @param {string} text 
  * @param {Array<Object>} styleElements
  */
function formatWebVTTtoHTML(text, styleElements){

  const HTMLTags = ["u","i","b"];
  const webVTTTags = ["u","i","b","c","#text"];
  const styleClasses = styleElements.map(f => f.className);
  const filtered = text
    // Remove timestamp tags
    .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
    // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
    .replace(/<([u,i,b,c])((?:\.){0,1}.*?)( .*?){0,1}>(.*?)<\/\1>/g, 
      "<$1$2>$4</$1$2>");

  const parser = new DOMParser();
  const parsedWebVTT = parser.parseFromString(filtered, "text/html");
  const nodes = parsedWebVTT.body.childNodes;

    /**
   * Apply styles to specifig tag in children nodes. 
   * (e.g. If class "b" has style, then : <b style="content">
   * )
   * Change class tags into span with associated style, or text*
   * First it was: <c.class>...</c>. Then <class></class>. 
   * Finally <span style="content"></span> or text.
   */
  function parseNode(nodeToParse) {
    const parsedNodeArray = [];
    let i = 0;
    for(i = 0; i < nodeToParse.length; i++){
      parsedNodeArray[i] = setStyleForNode(nodeToParse[i]);
      // Parse again node if there is there are inner elements,
      // other than text elements.
      if(parsedNodeArray[i] && parsedNodeArray[i].childNodes.length > 1){
        const innerNodeArray = parseNode(parsedNodeArray[i].childNodes);
        while (parsedNodeArray[i].firstChild) {
          parsedNodeArray[i].removeChild(parsedNodeArray[i].firstChild);
        }
        innerNodeArray.forEach(g => {
          parsedNodeArray[i].appendChild(g);
        });
      }
    }

  /**
   * Reduce node array on contiguous text tags.
   * (e.g. <text><text><span><text> => <text><span><text>)
   */
    const reducedNodeArray = parsedNodeArray.reduce((a, b) => {
      if(b.nodeName === "#text") {
        if(a.length != 0) {
          const before = a[a.length - 1];
          if (before.nodeName === "#text") {
            const textPlain = before.wholeText + b.wholeText;
            const elem = document.createTextNode(textPlain);  
            a[a.length - 1] = elem;
            return a;
          }
        }
        return a.concat(b);
      } else {
        return a.concat(b);
      }
    }, []);

    function setStyleForNode(nodeToStyle){
      const mainTag = nodeToStyle.nodeName.toLowerCase().split(".")[0];
      let nodeWithStyle;

      if(webVTTTags.includes(mainTag)) { // If element accepted
        const nodeClasses = nodeToStyle.nodeName.toLowerCase().split(".");
        const classIndexes = [];
        nodeClasses.forEach(nodeClass => {
          if(styleClasses.indexOf(nodeClass) !== -1) {
            classIndexes.push(styleClasses.indexOf(nodeClass));
          }
        });
        if(classIndexes.length !== 0) { // If style must be applied
          const attr = document.createAttribute("style");
          classIndexes.forEach(index => {
            attr.value += styleElements[index].styleContent;
          });
          const nameClass = HTMLTags.includes(mainTag) ? mainTag: "span";
          nodeWithStyle = document.createElement(nameClass);
          nodeWithStyle.setAttributeNode(attr);
          for (let j = 0; j < nodeToStyle.childNodes.length; j++) {
            const child = nodeToStyle.childNodes[j].cloneNode(true);
            nodeWithStyle.appendChild(child);
          }
        } else { // If style must NOT be applied. Rebuild element with tag name
          const elementTag = (!HTMLTags.includes(mainTag) 
          && mainTag !== "#text") ? "span" : mainTag;
          if(elementTag === "#text") {
            nodeWithStyle = document.createTextNode(nodeToStyle.wholeText);
          } else {
            nodeWithStyle = document.createElement(elementTag);
            for (let j = 0; j < nodeToStyle.childNodes.length; j++) {
              const child = nodeToStyle.childNodes[j].cloneNode(true);
              nodeWithStyle.appendChild(child);
            }
          }
        }
      } else {
        nodeWithStyle = document.createElement("span");
        for (let j = 0; j < nodeToStyle.childNodes.length; j++) {
          const child = nodeToStyle.childNodes[j].cloneNode(true);
          nodeWithStyle.appendChild(child);
        }
      }

      return nodeWithStyle;
    }

    return reducedNodeArray;
  }

  return parseNode(nodes);
}