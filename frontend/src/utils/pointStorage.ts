
import type { MapPoint } from "../types/mapPoint";

const STORAGE_KEY = "space-map-points";

type PointsByProject = Record<string, MapPoint[]>;

function readAllPoints(): PointsByProject {
  try {
    const data = localStorage.getItem(STORAGE_KEY);

    if (!data) {
      return {};
    }

    const parsed: unknown = JSON.parse(data);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    return parsed as PointsByProject;
  } catch {
    return {};
  }
}

export function getPoints(projectId: string): MapPoint[] {
  const points = readAllPoints()[projectId];

  return Array.isArray(points) ? points : [];
}

export function savePoints(
  projectId: string,
  points: MapPoint[],
): void {
  const allPoints = readAllPoints();

  allPoints[projectId] = points;


  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPoints));
}

export function deletePoints(projectId: string): void {
  const allPoints = readAllPoints();
  delete allPoints[projectId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allPoints));
}
