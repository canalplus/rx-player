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
* @return {Array<Object>}
*/
export default function parseWebVTT(text) {
  const newLineChar = /\n|\s{2,}/g;
  const linified = text.split(newLineChar);
  const cuesArray = [];
  const styleElements = [];

  if (!linified[0].match(/^WEBVTT.*/)) {
    console.log("Can't parse WebVTT: Non valid file.");
    return;
  }

  let i = 0;

  // Find every style element into WebVTT, and collect style 
  // associated with class / tags
  for (i = 1; i<linified.length; i++) {
    if (!(linified[i].match(/^\r/) || linified[i].length === 0)) {
      if(findElementType(linified[i]) === "style"){
        parseStyle(i+1, linified, styleElements);        
      }
      while (linified[i] 
        && !(linified[i].match(/^\r/) || linified[i].length === 0)) {
        i++;
      }
    }
  }

  // Parse cues, format and apply style.
  for (i = 1; i < linified.length; i++) {
    if (!(linified[i].match(/^\r/) || linified[i].length === 0)) {
      if (findElementType(linified[i]) === "cue") {
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

/**
 * Finds from supposed first line of element 
 * (WebVTT is line based format) the type of it. It can be:
 * - note: A comment
 * - style: A style indication, about all cues, or specific cues.
 * - cue: The subtitle content.
 * - region: Informations about wrapping area of subtitle
 * @param {string} text 
 */
function findElementType(text) {
  if (text.match(/^NOTE.*?/g)) {
    return "note";
  }
  else if (text.match(/^STYLE.*?/g)) {
    return "style";
  }
  else if (text.match(/^REGION.*?/g)) {
    return "style";
  }
  else if(text.length !== 0){
    return "cue";
  }
}

/**
 * 
 * Parse style element from WebVTT.
 * @param {number} index 
 * @param {Array<string>} linified 
 * @param {Array<Object>} styleElements 
 */
function parseStyle(index, linified, styleElements) {

  const className = [];
  const cueClassLine = linified[index].match(/cue\(\.{0,1}(.*?)\)/);
  className.push(cueClassLine ? cueClassLine[1] : "cue");

  index++;

  while(linified[index].match(/cue\(\.{0,1}(.*?)\)/)) {
    const cueClassLine = linified[index].match(/cue\(\.{0,1}(.*?)\)/);
    className.push(cueClassLine ? cueClassLine[1] : "cue");
    index++;
  }

  let styleContent = "";

  while (!(linified[index].match(/}/))) {
    styleContent += linified[index];
    index++;
  }

  className.forEach(c => {
    styleElements.push({
      className: c,
      styleContent: styleContent.replace(/\s/g,""),
    });
  });
}

/**
 * 
 * @param {number} index 
 * @param {Array<string>} linified 
 * @param {Array<Object>} styleElements 
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
    attr.value += styles.join;
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
  const both = text.split(" --> ");

  const s = both[0]
        .split(":").map(val => parseFloat(val));
  const e = both[1].split(" ")[0].split(":")
        .map(val => parseFloat(val));

  const start = s[2] + s[1] * 60 + s[0] * 60 * 60;
  const end = e[2] + e[1] * 60 + e[0] * 60 * 60;

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

  const classes = ["U","I","B"];
  const styleClasses = styleElements.map(f => f.className.toUpperCase());
  const filtered = text
    // Remove timestamp tags
    .replace(/<[0-9]{2}:[0-9]{2}.[0-9]{3}>/, "")
    // Remove tag content or attributes (e.g. <b dfgfdg> => <b>)
    .replace(/<([u,i,b,c])((?:\.){0,1}.*?)( .*?){0,1}>(.*?)<\/\1>/g, 
      "<$1$2>$4</$1$2>")
    // Remove all unauthorised tags (u,i,b,c.)
    .replace(/<([^u,i,b,c])((?:\.){0,1}.*?)( .*?){0,1}>(.*?)<\/\1>/g, "$4");

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
      parsedNodeArray[i] = setStyleForNode(nodeToParse);

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

    function setStyleForNode(nodeToParse){
      let nodeWithStyle;

      const nodeClasses = nodeToParse[i].nodeName.split(".");
      const classIndexes = [];
      nodeClasses.forEach(nodeClass => {
        if(styleClasses.indexOf(nodeClass) !== -1) {
          classIndexes.push(styleClasses.indexOf(nodeClass));
        }
      });

      if(classIndexes.length !== 0) {
        const attr = document.createAttribute("style");
        classIndexes.forEach(index => {
          attr.value += styleElements[index].styleContent;
        });
        const nameClass = classes[nodeClasses[0]] || "span";
        const element = document.createElement(nameClass);
        element.setAttributeNode(attr);
        element.appendChild(document.createTextNode(nodeToParse[i].innerText));
        nodeWithStyle = element;
      } else {
        if(!classes.includes(nodeClasses[0]) 
          && nodeToParse[i].nodeName !== "#text") {
          const element = document.createTextNode(nodeToParse[i].innerText);
          nodeWithStyle = element;
        } else {
          nodeWithStyle = nodeToParse[i];
        }      
      }

      return nodeWithStyle;
    }

    return reducedNodeArray;
  }

  return parseNode(nodes);
 
}