export type SpaceCategory =
  | "entrance"
  | "room"
  | "service"
  | "stand"
  | "wifi"
  | "other";

export interface SpacePoint {
  id: string;
  name: string;
  category: SpaceCategory;
  description: string;
  x: number;
  y: number;
  panoramaId?: string;
}

export interface SpaceRoom {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SpacePlan {
  id: string;
  projectId: string;
  name: string;
  width: number;
  height: number;
  points: SpacePoint[];
  rooms: SpaceRoom[];
}