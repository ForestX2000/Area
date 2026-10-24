
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
<<<<<<< Updated upstream
=======
  getMapImageETag,
  getPanoramaETag,
>>>>>>> Stashed changes
} from './mapStorage'
import { getPoints, savePoints } from './pointStorage'

/**
 * Единый модуль API фронтенда.
 *
<<<<<<< Updated upstream
 * Сейчас работает поверх локального хранилища (localStorage/IndexedDB-аналог),
 * чтобы фронтенд не зависел от готовности бэкенда. Когда бэкенд будет готов,
 * достаточно заменить реализации здесь на fetch-запросы к контракту:
=======
 * Кэширование с ETag: при загрузке файлов (планов, панорам) проверяется,
 * изменился ли файл на сервере. Если нет (304 Not Modified) — используется кэш.
 * Если сервер недоступен — работает с локальным кэшем.
 *
 * Когда бэкенд будет готов, достаточно заменить реализации здесь на fetch-запросы к контракту:
>>>>>>> Stashed changes
 *
 *   GET    /api/projects
 *   POST   /api/projects
 *   GET    /api/projects/{id}
 *   PUT    /api/projects/{id}
 *   DELETE /api/projects/{id}
<<<<<<< Updated upstream
 *   POST   /api/projects/{id}/files
 *   GET    /api/projects/{id}/files
 *   GET    /api/files/{file_id}
 */

=======
 *   GET    /api/files/plans/{projectId}
 *   GET    /api/files/panoramas/{projectId}/{pointId}
 */

async function fetchBlobWithETag(
  url: string,
  currentETag?: string,
): Promise<{ blob: Blob; etag?: string } | null> {
  try {
    const headers: Record<string, string> = {}
    if (currentETag) {
      headers['If-None-Match'] = currentETag
    }

    const response = await fetch(url, { headers })

    if (response.status === 304) {
      // 304 Not Modified — кэш актуален
      return null
    }

    if (!response.ok) {
      return null
    }

    const blob = await response.blob()
    const etag = response.headers.get('etag') || undefined

    return { blob, etag }
  } catch (error) {
    // Ошибка сети или парсинга
    console.warn(`Не удалось загрузить ${url}:`, error)
    return null
  }
}

>>>>>>> Stashed changes
export const api = {
  // --- Проекты ---
  getProjects: (): Project[] => getProjects(),
  saveProjects: (projects: Project[]): void => saveProjects(projects),
  createProject: (name: string, description: string): Project =>
    createLocalProject(name, description),

<<<<<<< Updated upstream
  // --- Планы ---
=======
  // --- Планы (с кэшированием по ETag) ---
>>>>>>> Stashed changes
  getMapImage: (projectId: string) => getMapImage(projectId),
  saveMapImage: (projectId: string, file: File) => saveMapImage(projectId, file),
  deleteMapImage: (projectId: string) => deleteMapImage(projectId),

<<<<<<< Updated upstream
=======
  // Загрузить план с сервера: сначала проверяет ETag, потом кэш
  async fetchMapImage(projectId: string): Promise<Blob | undefined> {
    const currentETag = await getMapImageETag(projectId)
    const result = await fetchBlobWithETag(
      `/api/files/plans/${projectId}`,
      currentETag,
    )

    if (result) {
      // Новая версия с сервера
      await saveMapImage(projectId, new File([result.blob], 'plan.png'), result.etag)
      return result.blob
    }

    if (result === null && currentETag) {
      // 304 Not Modified — используем кэш
      return getMapImage(projectId)
    }

    // Сервер недоступен и кэша нет
    return getMapImage(projectId)
  },

>>>>>>> Stashed changes
  // --- Точки ---
  getPoints: (projectId: string) => getPoints(projectId),
  savePoints: (projectId: string, points: MapPoint[]) =>
    savePoints(projectId, points),

<<<<<<< Updated upstream
  // --- Панорамы ---
=======
  // --- Панорамы (с кэшированием по ETag) ---
>>>>>>> Stashed changes
  getPanorama: (projectId: string, pointId: string) =>
    getPanorama(projectId, pointId),
  savePanorama: (projectId: string, pointId: string, file: File) =>
    savePanorama(projectId, pointId, file),
  deletePanorama: (projectId: string, pointId: string) =>
    deletePanorama(projectId, pointId),
<<<<<<< Updated upstream
=======

  // Загрузить панораму с сервера: сначала проверяет ETag, потом кэш
  async fetchPanorama(projectId: string, pointId: string): Promise<Blob | undefined> {
    const currentETag = await getPanoramaETag(projectId, pointId)
    const result = await fetchBlobWithETag(
      `/api/files/panoramas/${projectId}/${pointId}`,
      currentETag,
    )

    if (result) {
      // Новая версия с сервера
      await savePanorama(
        projectId,
        pointId,
        new File([result.blob], 'panorama.jpg'),
        result.etag,
      )
      return result.blob
    }

    if (result === null && currentETag) {
      // 304 Not Modified — используем кэш
      return getPanorama(projectId, pointId)
    }

    // Сервер недоступен и кэша нет
    return getPanorama(projectId, pointId)
  },
>>>>>>> Stashed changes
}
