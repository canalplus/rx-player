import { IPersistedSessionData } from "../../../../../core/eme";

export interface IContentProtection {
  contentID: string;
  appMetadata: {
    downloaded: Date;
  };
  keySystems: {
    sessionsIDS: IPersistedSessionData[];
    type: string;
  };
}
