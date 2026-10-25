
import type { Project } from '../types/project'
import type { MapPoint } from '../types/mapPoint'
import {
  createProject as createLocalProject,
  getProjects,
  saveProjects,
} from './projectStorage'
import {
  deleteMapImage,
  getMapImage,
  getPanorama,
  saveMapImage,
  savePanorama,
  deletePanorama,
} from './mapStorage'
import { getPoints, savePoints } from './pointStorage'

/**
 * Единый модуль API фронтенда.
 *
 * Сейчас работает поверх локального хранилища (localStorage/IndexedDB-аналог),
 * чтобы фронтенд не зависел от готовности бэкенда. Когда бэкенд будет готов,
 * достаточно заменить реализации здесь на fetch-запросы к контракту:
 *
 *   GET    /api/projects
 *   POST   /api/projects
 *   GET    /api/projects/{id}
 *   PUT    /api/projects/{id}
 *   DELETE /api/projects/{id}
 *   POST   /api/projects/{id}/files
 *   GET    /api/projects/{id}/files
 *   GET    /api/files/{file_id}
 */

export const api = {
  // --- Проекты ---
  getProjects: (): Project[] => getProjects(),
  saveProjects: (projects: Project[]): void => saveProjects(projects),
  createProject: (name: string, description: string): Project =>
    createLocalProject(name, description),

  // --- Планы ---
  getMapImage: (projectId: string) => getMapImage(projectId),
  saveMapImage: (projectId: string, file: File) => saveMapImage(projectId, file),
  deleteMapImage: (projectId: string) => deleteMapImage(projectId),

  // --- Точки ---
  getPoints: (projectId: string) => getPoints(projectId),
  savePoints: (projectId: string, points: MapPoint[]) =>
    savePoints(projectId, points),

  // --- Панорамы ---
  getPanorama: (projectId: string, pointId: string) =>
    getPanorama(projectId, pointId),
  savePanorama: (projectId: string, pointId: string, file: File) =>
    savePanorama(projectId, pointId, file),
  deletePanorama: (projectId: string, pointId: string) =>
    deletePanorama(projectId, pointId),
}
