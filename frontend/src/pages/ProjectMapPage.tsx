
<<<<<<< Updated upstream
import { useEffect, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";

import PanoramaViewer from "../components/PanoramaViewer";
=======
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import PanoramaViewer from "../components/PanoramaViewer";
import PanoramaStitchDialog from "../components/PanoramaStitchDialog";
import DrawingPlan from "../components/DrawingPlan";
import EditorNavigation from "../components/editor/EditorNavigation";
import { useConfirmation } from '../contexts/useConfirmation';
import { getProjects } from "../utils/projectStorage";
import { useProjectFloor } from '../utils/useProjects';
import { floorStorageId, floorUrl, getFloor } from '../utils/floorStorage';
import { useObjectUrl } from "../utils/useObjectUrl";
import type { DrawingObject } from '../types/drawing';
>>>>>>> Stashed changes
import type {
  MapPoint,
  MapPointCategory,
} from "../types/mapPoint";

import {
  deleteMapImage,
<<<<<<< Updated upstream
  getMapImage,
  getPanorama,
=======
>>>>>>> Stashed changes
  saveMapImage,
  savePanorama,
  deletePanorama,
} from "../utils/mapStorage";
<<<<<<< Updated upstream
=======
import { api } from "../utils/api";
>>>>>>> Stashed changes

import { getPoints, savePoints } from "../utils/pointStorage";

const POINT_CATEGORIES: {
  value: MapPointCategory;
  label: string;
  icon: string;
}[] = [
  { value: "entrance", label: "Вход", icon: "↗" },
  { value: "room", label: "Помещение", icon: "□" },
  { value: "service", label: "Сервис", icon: "i" },
  { value: "stand", label: "Стенд", icon: "▤" },
  { value: "wifi", label: "Wi-Fi", icon: "⌁" },
  { value: "other", label: "Другое", icon: "●" },
];

function getCategoryLabel(category?: MapPointCategory) {
  return (
    POINT_CATEGORIES.find((item) => item.value === category)?.label ??
    "Другое"
  );
}

function getCategoryIcon(category?: MapPointCategory) {
  return (
    POINT_CATEGORIES.find((item) => item.value === category)?.icon ??
    "●"
  );
}

export default function ProjectMapPage() {
  const { projectId } = useParams<{ projectId: string }>();
<<<<<<< Updated upstream

  const [imageUrl, setImageUrl] = useState<string | null>(null);
=======
  const [params] = useSearchParams();
  const { floor } = useProjectFloor(projectId, params.get('floor'));
  const floorId = floor?.id ?? 'default';
  return <ProjectMap key={`${projectId}:${floorId}`} projectId={projectId} floorId={floorId} />;
}

function ProjectMap({ projectId, floorId }: { projectId?: string; floorId: string }) {
  const confirm = useConfirmation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storageId = floorStorageId(projectId ?? '', floorId);
  const explicitFloor = searchParams.has('floor');
  const [openIn2D] = useState(() => searchParams.get("mode") === "2d");
  const [drawings] = useState(() => {
    const project = getProjects().find((project) => project.id === projectId);
    return (project ? getFloor(project, floorId).drawings ?? [] : []).filter((object) => object.markerKind !== 'service' && object.points?.length >= 2 && object.points
      .every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  });
  const [imageUrl, replaceImage] = useObjectUrl();
>>>>>>> Stashed changes
  const [imageName, setImageName] = useState("");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

<<<<<<< Updated upstream
  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  const [panoramaName, setPanoramaName] = useState("");
  const [panoramaLoading, setPanoramaLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
=======
  const [panoramaUrl, replacePanorama] = useObjectUrl();
  const [panoramaName, setPanoramaName] = useState("");
  const [panoramaLoading, setPanoramaLoading] = useState(false);
  const [stitchOpen, setStitchOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeDrawingMarker, setActiveDrawingMarker] = useState<DrawingObject | null>(null);
  const [panoramaIds, setPanoramaIds] = useState<string[]>([]);
  const requestedPanorama = useRef<string | null>(null);
  const hasPlan = !!imageUrl || drawings.length > 0;
>>>>>>> Stashed changes

  const selectedPoint =
    points.find((point) => point.id === selectedPointId) ?? null;

  const filteredPoints = points.filter((point) => {
    const query = search.trim().toLocaleLowerCase();

    if (!query) return true;

    return (
      point.title.toLocaleLowerCase().includes(query) ||
      (point.description ?? "").toLocaleLowerCase().includes(query) ||
      getCategoryLabel(point.category).toLocaleLowerCase().includes(query)
    );
  });

  // Загружаем план и точки проекта.
  useEffect(() => {
    let cancelled = false;
<<<<<<< Updated upstream
    let loadedImageUrl: string | null = null;
=======
>>>>>>> Stashed changes

    async function loadProjectMap() {
      if (!projectId) {
        setError("Не указан ID проекта.");
        setLoading(false);
        return;
      }
<<<<<<< Updated upstream
=======
      if (!getProjects().some((project) => project.id === projectId)) {
        navigate(`/projects/${projectId}`, { replace: true });
        return;
      }
>>>>>>> Stashed changes

      setLoading(true);
      setError("");

      try {
        const [savedImage, savedPoints] = await Promise.all([
<<<<<<< Updated upstream
          getMapImage(projectId),
          Promise.resolve(getPoints(projectId)),
=======
          api.fetchMapImage(storageId),
          Promise.resolve(getPoints(storageId)),
>>>>>>> Stashed changes
        ]);

        if (cancelled) return;

        setPoints(savedPoints);

        if (savedImage) {
<<<<<<< Updated upstream
          loadedImageUrl = URL.createObjectURL(savedImage);
          setImageUrl(loadedImageUrl);
          setImageName(
            savedImage instanceof File && savedImage.name
              ? savedImage.name
              : "План помещения",
          );
        } else {
          setImageUrl(null);
          setImageName("");
        }
=======
          replaceImage(savedImage);
          setImageName("План помещения");
        } else {
          replaceImage();
          setImageName("");
        }

        // Check actual files; older points may not have panoramaKey metadata.
        const available = await Promise.all(savedPoints.map(async (point) =>
          (await api.fetchPanorama(storageId, point.id)) ? point.id : null));
        if (cancelled) return;
        const ids = available.filter((id): id is string => id !== null);
        setPanoramaIds(ids);
        if (!savedImage && drawings.length === 0 && ids.length === 0 && !openIn2D) {
          navigate(floorUrl(`/projects/${projectId}/editor`, floorId, explicitFloor), { replace: true });
          return;
        }
        if (ids.length > 0 && !openIn2D) {
          requestedPanorama.current = ids[0];
          setSelectedPointId(ids[0]);
        }
>>>>>>> Stashed changes
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить план проекта.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProjectMap();

    return () => {
      cancelled = true;
<<<<<<< Updated upstream
      if (loadedImageUrl) URL.revokeObjectURL(loadedImageUrl);
    };
  }, [projectId]);
=======
    };
  }, [projectId, storageId, floorId, explicitFloor, navigate, openIn2D, drawings, replaceImage]);
>>>>>>> Stashed changes

  // Загружаем панораму выбранной точки.
  useEffect(() => {
    let cancelled = false;
<<<<<<< Updated upstream
    let loadedPanoramaUrl: string | null = null;

    async function loadSelectedPanorama() {
      if (!projectId || !selectedPointId) {
        setPanoramaUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return null;
        });
=======

    async function loadSelectedPanorama() {
      if (!projectId || !selectedPointId) {
        replacePanorama();
>>>>>>> Stashed changes
        setPanoramaName("");
        setPanoramaLoading(false);
        return;
      }

      setPanoramaLoading(true);

<<<<<<< Updated upstream
      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });
=======
      replacePanorama();
>>>>>>> Stashed changes

      setPanoramaName("");
      setViewerOpen(false);

      try {
<<<<<<< Updated upstream
        const file = await getPanorama(projectId, selectedPointId);
=======
        const file = await api.fetchPanorama(storageId, selectedPointId);
>>>>>>> Stashed changes

        if (cancelled) return;

        if (file) {
<<<<<<< Updated upstream
          loadedPanoramaUrl = URL.createObjectURL(file);
          setPanoramaUrl(loadedPanoramaUrl);
          setPanoramaName(
            file instanceof File && file.name ? file.name : "Панорама",
          );
=======
          replacePanorama(file);
          setPanoramaName("Панорама");
          if (requestedPanorama.current === selectedPointId) {
            requestedPanorama.current = null;
            setViewerOpen(true);
          }
>>>>>>> Stashed changes
        }
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить панораму точки.");
        }
      } finally {
        if (!cancelled) setPanoramaLoading(false);
      }
    }

    void loadSelectedPanorama();

    return () => {
      cancelled = true;
<<<<<<< Updated upstream
      if (loadedPanoramaUrl) URL.revokeObjectURL(loadedPanoramaUrl);
    };
  }, [projectId, selectedPointId]);
=======
    };
  }, [projectId, storageId, selectedPointId, replacePanorama]);

  function openPanorama(id: string) {
    if (id === selectedPointId && panoramaUrl) {
      setViewerOpen(true);
    } else {
      requestedPanorama.current = id;
      setSelectedPointId(id);
    }
  }
>>>>>>> Stashed changes

  function persistPoints(updatedPoints: MapPoint[]) {
    if (!projectId) return;

    setPoints(updatedPoints);

    try {
<<<<<<< Updated upstream
      savePoints(projectId, updatedPoints);
=======
      savePoints(storageId, updatedPoints);
>>>>>>> Stashed changes
      setError("");
    } catch {
      setError("Не удалось сохранить точки. Проверь доступное место в браузере.");
    }
  }

  // Загружаем план.
  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !projectId) return;

    if (!file.type.startsWith("image/")) {
      setError("Выбери файл изображения для плана.");
      return;
    }

    setSaving(true);
    setError("");

    try {
<<<<<<< Updated upstream
      await saveMapImage(projectId, file);

      setImageUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return URL.createObjectURL(file);
      });
=======
      await saveMapImage(storageId, file);

      replaceImage(file);
>>>>>>> Stashed changes

      setImageName(file.name);
    } catch {
      setError("Не удалось сохранить план. Попробуй другой файл.");
    } finally {
      setSaving(false);
    }
  }

  // Удаляем план и связанные с ним точки.
  async function handleImageDelete() {
    if (!projectId) return;

<<<<<<< Updated upstream
    const confirmed = window.confirm(
      "Удалить план и все точки с карты? Загруженные панорамы точек также могут остаться в хранилище.",
    );
=======
    const confirmed = await confirm({ title: 'Удалить план?', message: 'План и все точки с карты будут удалены. Загруженные панорамы точек также могут остаться в хранилище.' });
>>>>>>> Stashed changes

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
<<<<<<< Updated upstream
      await deleteMapImage(projectId);

      setImageUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setImageName("");
      persistPoints([]);
=======
      await deleteMapImage(storageId);

      replaceImage();

      setImageName("");
      persistPoints([]);
      setPanoramaIds([]);
>>>>>>> Stashed changes
      setSelectedPointId(null);
      setViewerOpen(false);
    } catch {
      setError("Не удалось удалить план.");
    } finally {
      setSaving(false);
    }
  }

  // Добавляем точку кликом по плану.
  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
<<<<<<< Updated upstream
    if (!projectId || !imageUrl || saving) return;
=======
    if (!projectId || !hasPlan || saving) return;
>>>>>>> Stashed changes

    const bounds = event.currentTarget.getBoundingClientRect();

    if (!bounds.width || !bounds.height) return;

    const x = Math.max(
      0,
      Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100),
    );

    const y = Math.max(
      0,
      Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100),
    );

    const newPoint: MapPoint = {
      id: crypto.randomUUID(),
      x,
      y,
      title: `Точка ${points.length + 1}`,
      category: "other",
      description: "",
    };

    persistPoints([...points, newPoint]);
    setSelectedPointId(newPoint.id);
    setSearch("");
    setViewerOpen(false);
  }

  function updateSelectedPoint(changes: Partial<MapPoint>) {
    if (!selectedPointId) return;

    persistPoints(
      points.map((point) =>
        point.id === selectedPointId ? { ...point, ...changes } : point,
      ),
    );
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    updateSelectedPoint({ title: event.target.value });
  }

  function handleDescriptionChange(
    event: ChangeEvent<HTMLTextAreaElement>,
  ) {
    updateSelectedPoint({ description: event.target.value });
  }

  function handleCategoryChange(
    event: ChangeEvent<HTMLSelectElement>,
  ) {
    updateSelectedPoint({
      category: event.target.value as MapPointCategory,
    });
  }

  // Удаляем точку и её панораму.
  async function handleDeletePoint() {
    if (!projectId || !selectedPointId) return;

    const pointId = selectedPointId;
<<<<<<< Updated upstream
    const confirmed = window.confirm("Удалить эту точку и её панораму?");
=======
    const confirmed = await confirm({ title: 'Удалить точку?', message: 'Точка и её панорама будут удалены. Это действие нельзя отменить.' });
>>>>>>> Stashed changes

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
<<<<<<< Updated upstream
      await deletePanorama(projectId, pointId);

      persistPoints(points.filter((point) => point.id !== pointId));
=======
      await deletePanorama(storageId, pointId);

      persistPoints(points.filter((point) => point.id !== pointId));
      setPanoramaIds((ids) => ids.filter((id) => id !== pointId));
>>>>>>> Stashed changes
      setSelectedPointId(null);
      setViewerOpen(false);
    } catch {
      setError("Не удалось удалить панораму точки. Точка не удалена.");
    } finally {
      setSaving(false);
    }
  }

  // Загружаем или заменяем панораму.
  async function handlePanoramaUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

<<<<<<< Updated upstream
    if (!file || !projectId || !selectedPointId) return;
=======
    if (file) await savePointPanorama(file);
  }

  // Сохраняем загруженную или склеенную из фотографий панораму точки.
  async function savePointPanorama(file: File) {
    if (!projectId || !selectedPointId) return;
>>>>>>> Stashed changes

    if (!file.type.startsWith("image/")) {
      setError("Выбери файл изображения для панорамы.");
      return;
    }

    setSaving(true);
    setError("");

    try {
<<<<<<< Updated upstream
      await savePanorama(projectId, selectedPointId, file);

      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return URL.createObjectURL(file);
      });

      setPanoramaName(file.name);
=======
      await savePanorama(storageId, selectedPointId, file);

      replacePanorama(file);

      setPanoramaName(file.name);
      setPanoramaIds((ids) => ids.includes(selectedPointId) ? ids : [...ids, selectedPointId]);
      updateSelectedPoint({ panoramaKey: `panorama:${storageId}:${selectedPointId}` });
>>>>>>> Stashed changes
      setViewerOpen(false);
    } catch {
      setError("Не удалось сохранить панораму.");
    } finally {
      setSaving(false);
    }
  }

  // Удаляем панораму, не удаляя точку.
  async function handlePanoramaDelete() {
    if (!projectId || !selectedPointId) return;

<<<<<<< Updated upstream
    const confirmed = window.confirm("Удалить панораму этой точки?");
=======
    const confirmed = await confirm({ title: 'Удалить панораму?', message: 'Панорама этой точки будет удалена. Сама точка останется на карте.' });
>>>>>>> Stashed changes
    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
<<<<<<< Updated upstream
      await deletePanorama(projectId, selectedPointId);

      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setPanoramaName("");
=======
      await deletePanorama(storageId, selectedPointId);

      replacePanorama();

      setPanoramaName("");
      setPanoramaIds((ids) => ids.filter((id) => id !== selectedPointId));
      updateSelectedPoint({ panoramaKey: undefined });
>>>>>>> Stashed changes
      setViewerOpen(false);
    } catch {
      setError("Не удалось удалить панораму.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="text-center">
<<<<<<< Updated upstream
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E5E5E5] border-t-[#E23E1A]" />
          <p className="text-sm font-medium text-[#777777]">
=======
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="text-sm font-medium text-muted">
>>>>>>> Stashed changes
            Загружаем пространство...
          </p>
        </div>
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
    <div className="text-[#4A4A4A]">
      <header className="mb-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#777777] transition hover:text-[#E23E1A]"
=======
    <div className="text-body">
      <EditorNavigation projectId={projectId!} can3D={panoramaIds.length > 0 && !panoramaLoading}
        onModeChange={() => openPanorama(selectedPointId && panoramaIds.includes(selectedPointId) ? selectedPointId : panoramaIds[0])} />
      <header className="mb-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-brand"
>>>>>>> Stashed changes
        >
          <span aria-hidden="true">←</span>
          Все проекты
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
<<<<<<< Updated upstream
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E23E1A] text-lg text-white">
                ▧
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#E23E1A]">
                Space Map / Editor
=======
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg text-white">
                ▧
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                2D · Карта пространства
>>>>>>> Stashed changes
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Карта пространства
            </h1>

<<<<<<< Updated upstream
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777777]">
=======
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
>>>>>>> Stashed changes
              Добавляй объекты на план, описывай места и связывай их с
              панорамами.
            </p>
          </div>

<<<<<<< Updated upstream
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C93416] focus-within:ring-4 focus-within:ring-[#FCEBE7] sm:self-auto">
=======
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-within:ring-4 focus-within:ring-brand-soft sm:self-auto">
>>>>>>> Stashed changes
            <span className="text-lg leading-none">+</span>
            {imageUrl ? "Заменить план" : "Загрузить план"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageUpload}
              disabled={saving}
            />
          </label>
        </div>
<<<<<<< Updated upstream
=======
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={floorUrl(`/projects/${projectId}/editor`, floorId, explicitFloor)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-body hover:bg-surface-muted">Редактировать чертёж</Link>
          {panoramaIds.length === 0 && <span className="text-xs text-muted">Добавьте точку на карте и загрузите для неё панораму 360°.</span>}
        </div>
>>>>>>> Stashed changes
      </header>

      {error && (
        <div
          role="alert"
<<<<<<< Updated upstream
          className="mb-5 flex items-start gap-3 rounded-xl border border-[#F2B8AA] bg-[#FCEBE7] p-4 text-sm text-[#C93416]"
=======
          className="mb-5 flex items-start gap-3 rounded-xl border border-brand-border bg-brand-soft p-4 text-sm text-brand-hover"
>>>>>>> Stashed changes
        >
          <span className="font-bold">!</span>
          <p>{error}</p>
          <button
            type="button"
            className="ml-auto font-semibold"
            onClick={() => setError("")}
            aria-label="Закрыть сообщение"
          >
            ×
          </button>
        </div>
      )}

      {saving && (
<<<<<<< Updated upstream
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#F2B8AA] bg-white px-4 py-3 text-sm text-[#E23E1A]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#E23E1A]" />
=======
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand-border bg-surface px-4 py-3 text-sm text-brand">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
>>>>>>> Stashed changes
          Сохраняем изменения...
        </div>
      )}

<<<<<<< Updated upstream
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Рабочая область карты */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCEBE7] text-xl text-[#E23E1A]">
=======
      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Рабочая область карты */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm xl:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl text-brand">
>>>>>>> Stashed changes
                ▧
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">План помещения</h2>
<<<<<<< Updated upstream
                <p className="mt-1 break-all text-xs text-[#777777]">
                  {imageName || "Изображение ещё не загружено"}
=======
                <p className="mt-1 break-all text-xs text-muted">
                  {imageName || (drawings.length > 0 ? "Сохранённый 2D-чертёж" : "Изображение ещё не загружено")}
>>>>>>> Stashed changes
                </p>
              </div>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={handleImageDelete}
                disabled={saving}
<<<<<<< Updated upstream
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#777777] transition hover:bg-[#FCEBE7] hover:text-[#E23E1A] disabled:opacity-50"
=======
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-brand-soft hover:text-brand disabled:opacity-50"
>>>>>>> Stashed changes
              >
                Удалить план
              </button>
            )}
          </div>

<<<<<<< Updated upstream
          {imageUrl && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] bg-[#F5F5F5] px-5 py-3 sm:px-6">
              <p className="text-sm text-[#777777]">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#E23E1A]" />
                Нажми на свободное место плана, чтобы добавить точку
              </p>
              <span className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium">
=======
          {hasPlan && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft bg-page px-5 py-3 sm:px-6">
              <p className="text-sm text-muted">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-brand" />
                Нажми на свободное место плана, чтобы добавить точку
              </p>
              <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium">
>>>>>>> Stashed changes
                Объектов: {points.length}
              </span>
            </div>
          )}

          <div className="p-4 sm:p-6">
<<<<<<< Updated upstream
            {imageUrl ? (
              <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] p-2 sm:p-4">
                <div
                  className="relative mx-auto w-full cursor-crosshair overflow-hidden rounded-lg bg-white shadow-sm"
                  onClick={handleMapClick}
                >
                  <img
                    src={imageUrl}
                    alt="План помещения"
                    className="block h-auto w-full select-none"
                    draggable={false}
                  />
=======
            {hasPlan ? (
              <div className="overflow-hidden rounded-xl border border-line bg-page p-2 sm:p-4">
                <div
                  className="relative mx-auto w-full cursor-crosshair overflow-hidden rounded-lg bg-surface shadow-sm"
                  onClick={handleMapClick}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="План помещения" className="block h-auto w-full select-none" draggable={false} />
                  ) : (
                    <DrawingPlan objects={drawings} label="План помещения" onMarkerActivate={(object) => {
                      if (object.markerKind === 'navigation' && object.targetProjectId) navigate(`/projects/${object.targetProjectId}/map`);
                      else setActiveDrawingMarker(object);
                    }} />
                  )}
>>>>>>> Stashed changes

                  {points.map((point, index) => {
                    const selected = selectedPointId === point.id;

                    return (
                      <button
                        key={point.id}
                        type="button"
                        title={`${point.title} — ${getCategoryLabel(point.category)}`}
                        aria-label={`Выбрать точку: ${point.title}`}
                        aria-pressed={selected}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedPointId(point.id);
                        }}
                        className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-xs font-bold text-white transition sm:h-9 sm:w-9 ${
                          selected
<<<<<<< Updated upstream
                            ? "z-10 scale-110 bg-[#E23E1A] shadow-lg ring-4 ring-[#F2B8AA]/70"
                            : "bg-[#4A4A4A] shadow-md hover:scale-110 hover:bg-[#E23E1A]"
=======
                            ? "z-10 scale-110 bg-brand shadow-lg ring-4 ring-brand-border/70"
                            : "bg-body shadow-md hover:scale-110 hover:bg-brand"
>>>>>>> Stashed changes
                        }`}
                        style={{
                          left: `${point.x}%`,
                          top: `${point.y}%`,
                        }}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
<<<<<<< Updated upstream
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D0D0D0] bg-[#F5F5F5] px-6 py-12 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FCEBE7] text-3xl text-[#E23E1A]">
=======
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-page px-6 py-12 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl text-brand">
>>>>>>> Stashed changes
                  ▧
                </div>
                <h3 className="text-lg font-semibold">
                  Начни с плана помещения
                </h3>
<<<<<<< Updated upstream
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#777777]">
                  Загрузи изображение этажа или помещения. Затем отмечай входы,
                  залы, сервисные зоны и другие объекты.
                </p>
                <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416]">
=======
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Загрузи изображение этажа или помещения. Затем отмечай входы,
                  залы, сервисные зоны и другие объекты.
                </p>
                <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
>>>>>>> Stashed changes
                  Выбрать изображение
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                    disabled={saving}
                  />
                </label>
<<<<<<< Updated upstream
                <p className="mt-3 text-xs text-[#999999]">
                  Поддерживаются файлы изображений
                </p>
=======
                <p className="mt-3 text-xs text-muted">
                  Поддерживаются файлы изображений
                </p>
                <Link to={floorUrl(`/projects/${projectId}/editor`, floorId, explicitFloor)} className="mt-4 text-sm font-medium text-brand hover:text-brand-hover">
                  Нарисовать план в 2D-редакторе
                </Link>
>>>>>>> Stashed changes
              </div>
            )}
          </div>

<<<<<<< Updated upstream
          {imageUrl && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEEEEE] px-5 py-4 text-xs text-[#999999] sm:px-6">
=======
          {hasPlan && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-4 text-xs text-muted sm:px-6">
>>>>>>> Stashed changes
              <span>Выбери маркер, чтобы редактировать объект</span>
              <span>Изменения сохраняются автоматически</span>
            </div>
          )}
        </section>

        {/* Список объектов и редактор */}
<<<<<<< Updated upstream
        <aside className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
            <div className="border-b border-[#EEEEEE] px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Объекты на карте</h2>
                  <p className="mt-1 text-xs text-[#777777]">
                    Список точек пространства
                  </p>
                </div>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#FCEBE7] px-2 text-sm font-bold text-[#E23E1A]">
=======
        <aside className="flex min-w-0 flex-col gap-5 xl:order-1">
          {activeDrawingMarker && <section className="order-first rounded-2xl border border-brand-border bg-surface p-5">
            <h2 className="font-semibold text-ink">{activeDrawingMarker.label || 'Метка'}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-muted">{activeDrawingMarker.description || 'Описание не добавлено.'}</p>
            {activeDrawingMarker.markerKind === 'status' && <p className="mt-2 text-sm">Статус: {activeDrawingMarker.status === 'blocked' ? 'Недоступно' : activeDrawingMarker.status === 'progress' ? 'В работе' : 'Готово'}</p>}
            <button type="button" onClick={() => setActiveDrawingMarker(null)} className="mt-3 text-sm text-brand">Закрыть метку</button>
          </section>}
          <section className="order-2 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="border-b border-line-soft px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Объекты на карте</h2>
                  <p className="mt-1 text-xs text-muted">
                    Список точек пространства
                  </p>
                </div>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-brand-soft px-2 text-sm font-bold text-brand">
>>>>>>> Stashed changes
                  {points.length}
                </span>
              </div>

              {points.length > 0 && (
<<<<<<< Updated upstream
                <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3">
                  <span className="text-[#999999]" aria-hidden="true">
=======
                <label className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-page px-3">
                  <span className="text-muted" aria-hidden="true">
>>>>>>> Stashed changes
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Найти точку..."
<<<<<<< Updated upstream
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#999999]"
=======
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted"
>>>>>>> Stashed changes
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
<<<<<<< Updated upstream
                      className="px-1 text-[#777777] hover:text-[#E23E1A]"
=======
                      className="px-1 text-muted hover:text-brand"
>>>>>>> Stashed changes
                      aria-label="Очистить поиск"
                    >
                      ×
                    </button>
                  )}
                </label>
              )}
            </div>

            {points.length === 0 ? (
              <div className="px-5 py-9 text-center">
<<<<<<< Updated upstream
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] text-xl text-[#777777]">
                  ⊙
                </div>
                <p className="text-sm font-medium">Пока нет объектов</p>
                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-[#777777]">
                  {imageUrl
=======
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-page text-xl text-muted">
                  ⊙
                </div>
                <p className="text-sm font-medium">Пока нет объектов</p>
                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-muted">
                  {hasPlan
>>>>>>> Stashed changes
                    ? "Нажми на план, чтобы добавить первую точку."
                    : "Сначала загрузи план помещения."}
                </p>
              </div>
            ) : filteredPoints.length === 0 ? (
<<<<<<< Updated upstream
              <p className="px-5 py-8 text-center text-sm text-[#777777]">
=======
              <p className="px-5 py-8 text-center text-sm text-muted">
>>>>>>> Stashed changes
                Ничего не найдено. Попробуй другой запрос.
              </p>
            ) : (
              <ul className="max-h-[360px] space-y-1 overflow-y-auto p-3">
                {filteredPoints.map((point) => {
                  const index = points.findIndex((item) => item.id === point.id);
                  const selected = selectedPointId === point.id;

                  return (
                    <li key={point.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPointId(point.id)}
                        aria-pressed={selected}
                        className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selected
<<<<<<< Updated upstream
                            ? "border-[#F2B8AA] bg-[#FCEBE7]"
                            : "border-transparent hover:border-[#E5E5E5] hover:bg-[#F5F5F5]"
=======
                            ? "border-brand-border bg-brand-soft"
                            : "border-transparent hover:border-line hover:bg-page"
>>>>>>> Stashed changes
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            selected
<<<<<<< Updated upstream
                              ? "bg-[#E23E1A] text-white"
                              : "bg-[#F5F5F5] text-[#4A4A4A]"
=======
                              ? "bg-brand text-white"
                              : "bg-page text-body"
>>>>>>> Stashed changes
                          }`}
                        >
                          {index + 1}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium">
                            {point.title || `Точка ${index + 1}`}
                          </span>
<<<<<<< Updated upstream
                          <span className="mt-1 block truncate text-xs text-[#777777]">
                            {getCategoryIcon(point.category)}{" "}
                            {getCategoryLabel(point.category)}
                            {point.panoramaKey ? " · Панорама" : ""}
                          </span>
                        </span>

                        <span className="text-[#D0D0D0] group-hover:text-[#777777]">
=======
                          <span className="mt-1 block truncate text-xs text-muted">
                            {getCategoryIcon(point.category)}{" "}
                            {getCategoryLabel(point.category)}
                            {panoramaIds.includes(point.id) ? " · Панорама" : ""}
                          </span>
                        </span>

                        <span className="text-line-strong group-hover:text-muted">
>>>>>>> Stashed changes
                          →
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {selectedPoint ? (
<<<<<<< Updated upstream
            <section className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
              <div className="border-b border-[#EEEEEE] px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E23E1A]">
=======
            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="border-b border-line-soft px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
>>>>>>> Stashed changes
                  Настройки объекта
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Редактирование точки
                </h2>
<<<<<<< Updated upstream
                <p className="mt-1 text-xs text-[#777777]">
=======
                <p className="mt-1 text-xs text-muted">
>>>>>>> Stashed changes
                  Название, тип, описание и панорама
                </p>
              </div>

              <div className="space-y-5 p-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Название</span>
                  <input
                    type="text"
                    value={selectedPoint.title}
                    onChange={handleTitleChange}
                    maxLength={120}
<<<<<<< Updated upstream
                    className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
=======
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
>>>>>>> Stashed changes
                    placeholder="Например, Главный вход"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Категория</span>
                  <select
                    value={selectedPoint.category ?? "other"}
                    onChange={handleCategoryChange}
<<<<<<< Updated upstream
                    className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
=======
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
>>>>>>> Stashed changes
                  >
                    {POINT_CATEGORIES.map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.icon} {category.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Описание</span>
                  <textarea
                    value={selectedPoint.description ?? ""}
                    onChange={handleDescriptionChange}
                    rows={3}
                    maxLength={1000}
                    placeholder="Расскажи, что находится в этом месте..."
<<<<<<< Updated upstream
                    className="w-full resize-y rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
                  />
                  <span className="block text-right text-xs text-[#999999]">
=======
                    className="w-full resize-y rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
                  />
                  <span className="block text-right text-xs text-muted">
>>>>>>> Stashed changes
                    {(selectedPoint.description ?? "").length}/1000
                  </span>
                </label>

<<<<<<< Updated upstream
                <div className="border-t border-[#EEEEEE] pt-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCEBE7] text-lg text-[#E23E1A]">
=======
                <div className="border-t border-line-soft pt-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-lg text-brand">
>>>>>>> Stashed changes
                      ◉
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Панорама</h3>
<<<<<<< Updated upstream
                      <p className="mt-1 text-xs text-[#777777]">
                        Изображение, связанное с этой точкой
=======
                      <p className="mt-1 text-xs text-muted">
                        Сферическое фото 360° в формате 2:1
>>>>>>> Stashed changes
                      </p>
                    </div>
                  </div>

                  {panoramaLoading ? (
<<<<<<< Updated upstream
                    <div className="rounded-xl bg-[#F5F5F5] p-4 text-sm text-[#777777]">
=======
                    <div className="rounded-xl bg-page p-4 text-sm text-muted">
>>>>>>> Stashed changes
                      Загружаем панораму...
                    </div>
                  ) : panoramaUrl ? (
                    <div className="space-y-3">
<<<<<<< Updated upstream
                      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]">
=======
                      <div className="overflow-hidden rounded-xl border border-line bg-page">
>>>>>>> Stashed changes
                        <img
                          src={panoramaUrl}
                          alt={`Панорама: ${selectedPoint.title}`}
                          className="h-36 w-full object-cover"
                        />
<<<<<<< Updated upstream
                        <p className="break-all px-3 py-2.5 text-xs text-[#777777]">
=======
                        <p className="break-all px-3 py-2.5 text-xs text-muted">
>>>>>>> Stashed changes
                          {panoramaName || "Панорама загружена"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
<<<<<<< Updated upstream
                        className="w-full rounded-xl bg-[#E23E1A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2B8AA]"
=======
                        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-border"
>>>>>>> Stashed changes
                      >
                        Открыть просмотр →
                      </button>

                      <button
                        type="button"
                        onClick={handlePanoramaDelete}
                        disabled={saving}
<<<<<<< Updated upstream
                        className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium transition hover:border-[#F2B8AA] hover:bg-[#FCEBE7] hover:text-[#E23E1A] disabled:opacity-50"
=======
                        className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-brand-border hover:bg-brand-soft hover:text-brand disabled:opacity-50"
>>>>>>> Stashed changes
                      >
                        Удалить панораму
                      </button>
                    </div>
                  ) : (
<<<<<<< Updated upstream
                    <div className="rounded-xl border border-dashed border-[#D0D0D0] bg-[#F5F5F5] px-4 py-5 text-center">
                      <p className="text-sm font-medium">
                        Панорама не добавлена
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#777777]">
                        Загрузи изображение, чтобы связать его с этой точкой.
=======
                    <div className="rounded-xl border border-dashed border-line-strong bg-page px-4 py-5 text-center">
                      <p className="text-sm font-medium">
                        Панорама не добавлена
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Загрузи сферическое фото 360°, чтобы связать его с этой точкой.
>>>>>>> Stashed changes
                      </p>
                    </div>
                  )}

<<<<<<< Updated upstream
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-[#F2B8AA] px-4 py-3 text-sm font-semibold text-[#E23E1A] transition hover:bg-[#FCEBE7]">
=======
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-brand-border px-4 py-3 text-sm font-semibold text-brand transition hover:bg-brand-soft">
>>>>>>> Stashed changes
                    {panoramaUrl
                      ? "Заменить изображение"
                      : "+ Загрузить панораму"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handlePanoramaUpload}
                      disabled={saving || panoramaLoading}
                    />
                  </label>
<<<<<<< Updated upstream
                </div>

                <div className="border-t border-[#EEEEEE] pt-4">
=======
                  <button
                    type="button"
                    onClick={() => setStitchOpen(true)}
                    disabled={saving || panoramaLoading}
                    className="mt-2 w-full rounded-xl border border-line px-4 py-3 text-sm font-medium transition hover:border-brand-border hover:bg-brand-soft hover:text-brand disabled:opacity-50"
                  >
                    {panoramaUrl ? "Пересобрать из фото" : "Собрать из нескольких фото"}
                  </button>
                </div>

                <div className="border-t border-line-soft pt-4">
>>>>>>> Stashed changes
                  <button
                    type="button"
                    onClick={handleDeletePoint}
                    disabled={saving}
<<<<<<< Updated upstream
                    className="w-full rounded-xl border border-[#F2B8AA] px-4 py-3 text-sm font-medium text-[#E23E1A] transition hover:bg-[#FCEBE7] disabled:opacity-50"
=======
                    className="w-full rounded-xl border border-brand-border px-4 py-3 text-sm font-medium text-brand transition hover:bg-brand-soft disabled:opacity-50"
>>>>>>> Stashed changes
                  >
                    Удалить точку
                  </button>
                </div>
              </div>
            </section>
          ) : (
<<<<<<< Updated upstream
            <section className="rounded-2xl border border-dashed border-[#D0D0D0] bg-white p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] text-xl text-[#777777]">
                ⚙
              </div>
              <h2 className="text-sm font-semibold">Настройки объекта</h2>
              <p className="mt-2 text-xs leading-5 text-[#777777]">
=======
            <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-page text-xl text-muted">
                ⚙
              </div>
              <h2 className="text-sm font-semibold">Настройки объекта</h2>
              <p className="mt-2 text-xs leading-5 text-muted">
>>>>>>> Stashed changes
                Выбери точку в списке или нажми на маркер плана, чтобы изменить
                её данные.
              </p>
            </section>
          )}
        </aside>
      </div>

<<<<<<< Updated upstream
      {viewerOpen && panoramaUrl && selectedPoint && (
        <PanoramaViewer
          imageUrl={panoramaUrl}
          title={selectedPoint.title}
=======
      {stitchOpen && selectedPoint && (
        <PanoramaStitchDialog
          title={selectedPoint.title}
          onClose={() => setStitchOpen(false)}
          onComplete={async (file) => {
            await savePointPanorama(file);
            setStitchOpen(false);
          }}
        />
      )}

      {viewerOpen && panoramaUrl && selectedPoint && (
        <PanoramaViewer
          key={panoramaUrl}
          imageUrl={panoramaUrl}
          title={selectedPoint.title}
          projectId={projectId!}
          pointId={selectedPoint.id}
          panoramas={points.filter((point) => panoramaIds.includes(point.id))}
          onSelectPanorama={openPanorama}
>>>>>>> Stashed changes
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
