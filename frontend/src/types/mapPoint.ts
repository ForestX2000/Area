
export type MapPointCategory =
  | "entrance"
  | "room"
  | "service"
  | "stand"
  | "wifi"
  | "other";

export interface MapPoint {
  id: string;
  x: number;
  y: number;
  title: string;
  description?: string;
  category?: MapPointCategory;
  panoramaKey?: string;
}
