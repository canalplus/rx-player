import startsWith from "../../../utils/starts_with";

export enum M3U8LineType {
  Comment,
  Tag,
  URI,
  Nothing,
}

export default function getType(line: string): M3U8LineType {
  if (line.trim().length === 0) {
    return M3U8LineType.Nothing;
  }
  if (startsWith(line, "#")) {
    return line.substring(1, 4) === "EXT" ? M3U8LineType.Tag : M3U8LineType.Comment;
  }
  return M3U8LineType.URI;
}
