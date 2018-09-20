export interface IXMedia {
  mediaType: "audio" | "text" | "video" | "closed-caption";
  groupId: string;
  name: string;
  isDefaultMedia: boolean;
  isAutoSelectMedia: boolean;
  isForcedMedia: boolean;

  uri?: string;
  language?: string;
  assocLanguage?: string;
  isTranscribingSpokenDialog?: boolean;
  isDescribingMusicAndSound?: boolean;
  isEasyToRead?: boolean;
  isAudioDescription?: boolean;
  channels?: string;
  inStreamId?: string;
}

/**
 * @param {string} line
 * @returns {Object|null}
 */
export default function parseEXTXMediaLine(line: string): IXMedia | null {
  let mediaType: "audio" | "text" | "video" | "closed-caption" | undefined;
  let groupId: string | undefined;
  let uri: string | undefined;
  let language: string | undefined;
  let assocLanguage: string | undefined;
  let name: string | undefined;
  let inStreamId: string | undefined;
  let isDefaultMedia: boolean | undefined;
  let isAutoSelectMedia: boolean | undefined;
  let isForcedMedia: boolean | undefined;
  let isTranscribingSpokenDialog: boolean | undefined;
  let isDescribingMusicAndSound: boolean | undefined;
  let isEasyToRead: boolean | undefined;
  let isAudioDescription: boolean | undefined;
  let channels: string | undefined;

  const keyValues: string[] = line.substring(13).split(",");
  const attributes = keyValues
    .map((keyValue) => {
      const index = keyValue.indexOf("=");
      if (index < 1) {
        return null;
      }
      return {
        key: keyValue.substring(0, index),
        value: keyValue.substring(index + 1),
      };
    })
    .filter((keyValue): keyValue is { key: string; value: string } => keyValue !== null);

  for (let i = 0; i < attributes.length; i++) {
    const { key, value } = attributes[i];

    switch (key) {
      case "TYPE":
        const toLower = value.toLowerCase();
        switch (toLower) {
          case "audio":
          case "video":
          case "closed-caption":
            mediaType = toLower;
            break;
          case "subtitles":
            mediaType = "text";
            break;
          default:
            return null;
        }
        break;

      case "URI":
        // Quoted string
        uri = value.substring(1, value.length - 1);
        break;

      case "GROUP-ID":
        groupId = value.substring(1, value.length - 1);
        break;

      case "LANGUAGE":
        language = value.substring(1, value.length - 1);
        break;

      case "ASSOC-LANGUAGE":
        assocLanguage = value.substring(1, value.length - 1);
        break;

      case "NAME":
        name = value.substring(1, value.length - 1);
        break;

      case "DEFAULT":
        isDefaultMedia = value === "YES";
        break;

      case "AUTOSELECT":
        isAutoSelectMedia = value === "YES";
        break;

      case "FORCED":
        isForcedMedia = value === "YES";
        break;

      case "INSTREAM-ID":
        inStreamId = value.substring(1, value.length - 1);
        break;

      case "CHANNELS":
        channels = value.substring(1, value.length - 1);
        break;

      case "CHARACTERISTICS": {
        const splitted = value.split(",");
        for (let j = 0; i < splitted.length; j++) {
          const characteristic = splitted[j];
          switch (characteristic) {
            case "public.accessibility.transcribes-spoken-dialog":
              isTranscribingSpokenDialog = true;
              break;
            case "public.accessibility.describes-music-and-sound":
              isDescribingMusicAndSound = true;
              break;
            case "public.accessibility.easy-to-read":
              isEasyToRead = true;
              break;
            case "public.accessibility.describes-video":
              isAudioDescription = true;
              break;
          }
        }
        break;
      }
    }
  }

  if (mediaType === undefined || groupId === undefined || name === undefined) {
    return null;
  }

  return {
    mediaType,
    groupId,
    name,
    isDefaultMedia: isDefaultMedia === true,
    isAutoSelectMedia: isAutoSelectMedia === true,
    isForcedMedia: isForcedMedia === true,
    // TODO proper checks?
    uri: uri ?? "",
    language: language ?? "und",
    assocLanguage: assocLanguage ?? "und",
    isTranscribingSpokenDialog: isTranscribingSpokenDialog ?? false,
    isDescribingMusicAndSound: isDescribingMusicAndSound ?? false,
    isEasyToRead: isEasyToRead ?? false,
    isAudioDescription: isAudioDescription ?? false,
    inStreamId: inStreamId ?? "",
    channels: channels ?? "",
  };
}
