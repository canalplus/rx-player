// true for IE / Edge
const isIE : boolean =
  navigator.appName === "Microsoft Internet Explorer" ||
  navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent);

const isFirefox : boolean =
  navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;

const isSamsungBrowser : boolean =
  navigator.userAgent.toLowerCase().indexOf("samsungbrowser") !== -1;

const getFirefoxMajorVersion = (): number|null => {
  const result = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/);
  if (!result || result.length < 2) {
    return null;
  }

  const majorVersion = parseInt(result[1]);
  if (isNaN(majorVersion)) {
    return null;
  }

  return majorVersion;
};

export {
  isFirefox,
  isIE,
  isSamsungBrowser,
  getFirefoxMajorVersion
};
