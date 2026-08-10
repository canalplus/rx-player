export interface ISteeringManifest {
  lifetime: number;
  reloadUri?: string | undefined;
  priorities: string[];
  pathwayClones: IPathwayClone[];
}

export interface IPathwayClone {
  baseId: string;
  id: string;
  uriReplacement: {
    host?: string | undefined;
    params?: Record<string, string> | undefined;
  };
}
