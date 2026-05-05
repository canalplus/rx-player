import LANGUAGE_CODES from "../../assets/languages.ts";

export default function translateLanguageCode(
  langCode: string | undefined | null,
): string {
  if (!langCode) {
    return "unknown";
  }
  return LANGUAGE_CODES[langCode.toLowerCase()] ?? langCode;
}
