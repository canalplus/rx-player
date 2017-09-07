import LANGUAGE_CODES from "../../assets/languages.js";

export default function tranlasteLanguageCode(langCode) {
  if (!langCode) {
    return "unknown";
  }
  return LANGUAGE_CODES[langCode.toLowerCase()] || langCode;
}
