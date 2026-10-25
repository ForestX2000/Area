
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
import type {
  MapPoint,
  MapPointCategory,
} from "../types/mapPoint";

import {
  deleteMapImage,
  saveMapImage,
  savePanorama,
  deletePanorama,
} from "../utils/mapStorage";
import { api } from "../utils/api";

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

const STEPS = ["Добавление точки", "Выбор точки", "Загрузка панорамы"];

const STEP_HINTS = [
  "Нажмите на план, чтобы добавить точку",
  "Выберите точку на плане или в списке объектов",
  "Загрузите панораму 360° в настройках выбранной точки",
  "Панорама загружена",
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
  const [imageName, setImageName] = useState("");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [panoramaUrl, replacePanorama] = useObjectUrl();
  const [panoramaName, setPanoramaName] = useState("");
  const [panoramaLoading, setPanoramaLoading] = useState(false);
  const [stitchOpen, setStitchOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeDrawingMarker, setActiveDrawingMarker] = useState<DrawingObject | null>(null);
  const [panoramaIds, setPanoramaIds] = useState<string[]>([]);
  const requestedPanorama = useRef<string | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const pendingFocusPointId = useRef<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const hasPlan = !!imageUrl || drawings.length > 0;

  const selectedPoint =
    points.find((point) => point.id === selectedPointId) ?? null;
  const selectedHasPanorama = !!selectedPoint && panoramaIds.includes(selectedPoint.id);
  const activeStep = points.length === 0 ? 0 : !selectedPoint ? 1 : !selectedHasPanorama ? 2 : 3;

  // Новая точка сразу готова к переименованию: фокус в поле названия.
  useEffect(() => {
    if (!selectedPointId || pendingFocusPointId.current !== selectedPointId) return;
    pendingFocusPointId.current = null;
    titleInputRef.current?.focus();
    titleInputRef.current?.select();
  }, [selectedPointId]);

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

    async function loadProjectMap() {
      if (!projectId) {
        setError("Не указан ID проекта.");
        setLoading(false);
        return;
      }
      if (!getProjects().some((project) => project.id === projectId)) {
        navigate(`/projects/${projectId}`, { replace: true });
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [savedImage, savedPoints] = await Promise.all([
          api.fetchMapImage(storageId),
          Promise.resolve(getPoints(storageId)),
        ]);

        if (cancelled) return;

        setPoints(savedPoints);

        if (savedImage) {
          replaceImage(savedImage);
          setImageName(savedImage instanceof File && savedImage.name ? savedImage.name : "План помещения");
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
    };
  }, [projectId, storageId, floorId, explicitFloor, navigate, openIn2D, drawings, replaceImage]);

  // Загружаем панораму выбранной точки.
  useEffect(() => {
    let cancelled = false;

    async function loadSelectedPanorama() {
      if (!projectId || !selectedPointId) {
        replacePanorama();
        setPanoramaName("");
        setPanoramaLoading(false);
        return;
      }

      setPanoramaLoading(true);

      replacePanorama();

      setPanoramaName("");
      setViewerOpen(false);

      try {
        const file = await api.fetchPanorama(storageId, selectedPointId);

        if (cancelled) return;

        if (file) {
          replacePanorama(file);
          setPanoramaName(file instanceof File && file.name ? file.name : "Панорама");
          if (requestedPanorama.current === selectedPointId) {
            requestedPanorama.current = null;
            setViewerOpen(true);
          }
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

  function persistPoints(updatedPoints: MapPoint[]) {
    if (!projectId) return;

    setPoints(updatedPoints);

    try {
      savePoints(storageId, updatedPoints);
      setError("");
    } catch {
      setError("Не удалось сохранить точки. Проверьте доступное место в браузере.");
    }
  }

  // Загружаем план.
  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !projectId) return;

    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения для плана.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveMapImage(storageId, file);

      replaceImage(file);

      setImageName(file.name);
    } catch {
      setError("Не удалось сохранить план. Выберите другой файл.");
    } finally {
      setSaving(false);
    }
  }

  // Удаляем план и связанные с ним точки.
  async function handleImageDelete() {
    if (!projectId) return;

    const confirmed = await confirm({ title: 'Удалить план?', message: 'План и все точки с карты будут удалены. Загруженные панорамы точек также могут остаться в хранилище.' });

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deleteMapImage(storageId);

      replaceImage();

      setImageName("");
      persistPoints([]);
      setPanoramaIds([]);
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
    if (!projectId || !hasPlan || saving) return;

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
    pendingFocusPointId.current = newPoint.id;
    setSearch("");
    setViewerOpen(false);
  }

  function handleMapHover(event: MouseEvent<HTMLDivElement>) {
    const overControl = event.target instanceof Element && event.target.closest('button, [role="button"]');
    const bounds = event.currentTarget.getBoundingClientRect();
    if (overControl || saving || !bounds.width || !bounds.height) {
      setHoverPosition(null);
      return;
    }
    setHoverPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
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
    const confirmed = await confirm({ title: 'Удалить точку?', message: 'Точка и её панорама будут удалены. Это действие нельзя отменить.' });

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deletePanorama(storageId, pointId);

      persistPoints(points.filter((point) => point.id !== pointId));
      setPanoramaIds((ids) => ids.filter((id) => id !== pointId));
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

    if (file) await savePointPanorama(file);
  }

  // Сохраняем загруженную или склеенную из фотографий панораму точки.
  async function savePointPanorama(file: File) {
    if (!projectId || !selectedPointId) return;

    if (!file.type.startsWith("image/")) {
      setError("Выберите файл изображения для панорамы.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await savePanorama(storageId, selectedPointId, file);

      replacePanorama(file);

      setPanoramaName(file.name);
      setPanoramaIds((ids) => ids.includes(selectedPointId) ? ids : [...ids, selectedPointId]);
      updateSelectedPoint({ panoramaKey: `panorama:${storageId}:${selectedPointId}` });
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

    const confirmed = await confirm({ title: 'Удалить панораму?', message: 'Панорама этой точки будет удалена. Сама точка останется на карте.' });
    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deletePanorama(storageId, selectedPointId);

      replacePanorama();

      setPanoramaName("");
      setPanoramaIds((ids) => ids.filter((id) => id !== selectedPointId));
      updateSelectedPoint({ panoramaKey: undefined });
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
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-line border-t-brand" />
          <p className="text-sm font-medium text-muted">
            Загрузка проекта…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-body">
      <EditorNavigation projectId={projectId!} can3D={panoramaIds.length > 0 && !panoramaLoading}
        onModeChange={() => openPanorama(selectedPointId && panoramaIds.includes(selectedPointId) ? selectedPointId : panoramaIds[0])} />
      <header className="mb-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-brand"
        >
          <span aria-hidden="true">←</span>
          Все проекты
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg text-white">
                ▧
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                2D · Карта пространства
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Карта пространства
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
              Добавляй объекты на план, описывай места и связывай их с
              панорамами.
            </p>
          </div>

          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-within:ring-4 focus-within:ring-brand-soft sm:self-auto">
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
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link to={floorUrl(`/projects/${projectId}/editor`, floorId, explicitFloor)}
            className="rounded-lg border border-line bg-surface px-4 py-2 text-body hover:bg-surface-muted">Редактировать чертёж</Link>        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-brand-border bg-brand-soft p-4 text-sm text-brand-hover"
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
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand-border bg-surface px-4 py-3 text-sm text-brand">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          Сохраняем изменения...
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Рабочая область карты */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm xl:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-xl text-brand">
                ▧
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">План помещения</h2>
                <p className="mt-1 break-all text-xs text-muted">
                  {imageName || (drawings.length > 0 ? "Сохранённый 2D-чертёж" : "Изображение ещё не загружено")}
                </p>
              </div>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={handleImageDelete}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-brand-soft hover:text-brand disabled:opacity-50"
              >
                Удалить план
              </button>
            )}
          </div>

          {hasPlan && (
            <div className="space-y-3 border-b border-line-soft bg-page px-5 py-3 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <ol aria-label="Как добавить точку" className="flex flex-wrap items-center gap-2 text-xs font-medium">
                  {STEPS.map((step, index) => {
                    const done = index < activeStep;
                    const current = index === activeStep;
                    return (
                      <li key={step} aria-current={current ? "step" : undefined} className="flex items-center gap-2">
                        {index > 0 && <span aria-hidden="true" className={`h-px w-4 ${done || current ? "bg-brand" : "bg-line-strong"}`} />}
                        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition ${
                          current ? "border-brand bg-brand text-white shadow-sm" : done ? "border-brand-border bg-brand-soft text-brand" : "border-line bg-surface text-muted"
                        }`}>
                          <span aria-hidden="true">{done ? "✓" : index + 1}</span>
                          {step}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <span className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium">
                  Объектов: {points.length}
                </span>
              </div>
              <p role="status" className="flex items-center text-sm text-body">
                <span className="relative mr-2 flex h-2.5 w-2.5">
                  {activeStep < 3 && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />}
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                </span>
                {STEP_HINTS[activeStep]}
              </p>
            </div>
          )}

          <div className="p-4 sm:p-6">
            {hasPlan ? (
              <div className="overflow-hidden rounded-xl border border-line bg-page p-2 sm:p-4">
                <div
                  className="relative mx-auto w-full cursor-crosshair overflow-hidden rounded-lg bg-surface shadow-sm"
                  onClick={handleMapClick}
                  onMouseMove={handleMapHover}
                  onMouseLeave={() => setHoverPosition(null)}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="План помещения" className="block h-auto w-full select-none" draggable={false} />
                  ) : (
                    <DrawingPlan objects={drawings} label="План помещения" onMarkerActivate={(object) => {
                      if (object.markerKind === 'navigation' && object.targetProjectId) navigate(`/projects/${object.targetProjectId}/map`);
                      else setActiveDrawingMarker(object);
                    }} />
                  )}

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
                            ? "z-10 scale-110 bg-brand shadow-lg ring-4 ring-brand-border/70"
                            : "bg-body shadow-md hover:scale-110 hover:bg-brand"
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

                  {points.length === 0 && !hoverPosition && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface/40">
                      <div className="flex items-center gap-3 rounded-2xl border border-brand-border bg-surface px-5 py-4 text-sm font-semibold text-ink shadow-lg">
                        <span className="relative flex h-9 w-9 items-center justify-center">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40" />
                          <span className="relative flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-white bg-brand text-lg text-white shadow">+</span>
                        </span>
                        Нажмите на план,<br />чтобы добавить точку
                      </div>
                    </div>
                  )}

                  {hoverPosition && (
                    <div aria-hidden="true" className="pointer-events-none absolute z-20 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                      style={{ left: `${hoverPosition.x}%`, top: `${hoverPosition.y}%` }}>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] border-white bg-brand/70 text-sm font-bold text-white shadow-md sm:h-9 sm:w-9">+</span>
                      <span className="absolute top-full mt-1 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-surface shadow">
                        Добавить точку {points.length + 1}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-page px-6 py-12 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl text-brand">
                  ▧
                </div>
                <h3 className="text-lg font-semibold">
                  План не добавлен
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  Загрузите изображение плана или создайте чертёж в редакторе.
                </p>
                <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
                  Выбрать изображение
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                    disabled={saving}
                  />
                </label>
                <p className="mt-3 text-xs text-muted">
                  Поддерживаются файлы изображений
                </p>
                <Link to={floorUrl(`/projects/${projectId}/editor`, floorId, explicitFloor)} className="mt-4 text-sm font-medium text-brand hover:text-brand-hover">
                  Нарисовать план в 2D-редакторе
                </Link>
              </div>
            )}
          </div>

          {hasPlan && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-4 text-xs text-muted sm:px-6">
              <span>Выберите маркер для редактирования</span>
              <span>Изменения сохраняются автоматически</span>
            </div>
          )}
        </section>

        {/* Список объектов и редактор */}
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
                  {points.length}
                </span>
              </div>

              {points.length > 0 && (
                <label className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-page px-3">
                  <span className="text-muted" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Найти точку..."
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-muted"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="px-1 text-muted hover:text-brand"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-page text-xl text-muted">
                  ⊙
                </div>
                <p className="text-sm font-medium">Пока нет объектов</p>
                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-muted">
                  {hasPlan
                    ? "Нажмите на план, чтобы добавить точку."
                    : "Сначала загрузи план помещения."}
                </p>
              </div>
            ) : filteredPoints.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted">
                Ничего не найдено. Измените запрос.
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
                            ? "border-brand-border bg-brand-soft"
                            : "border-transparent hover:border-line hover:bg-page"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            selected
                              ? "bg-brand text-white"
                              : "bg-page text-body"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium">
                            {point.title || `Точка ${index + 1}`}
                          </span>
                          <span className="mt-1 block truncate text-xs text-muted">
                            {getCategoryIcon(point.category)}{" "}
                            {getCategoryLabel(point.category)}
                            {panoramaIds.includes(point.id) ? " · Панорама" : ""}
                          </span>
                        </span>

                        <span className="text-line-strong group-hover:text-muted">
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
            <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
              <div className="border-b border-line-soft px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
                  Настройки объекта
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Редактирование точки
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Название, тип, описание и панорама
                </p>
              </div>

              <div className="space-y-5 p-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium">Название</span>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={selectedPoint.title}
                    onChange={handleTitleChange}
                    maxLength={120}
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
                    placeholder="Например, Главный вход"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Категория</span>
                  <select
                    value={selectedPoint.category ?? "other"}
                    onChange={handleCategoryChange}
                    className="w-full rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
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
                    className="w-full resize-y rounded-xl border border-line bg-page px-3.5 py-3 text-sm outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand-soft"
                  />
                  <span className="block text-right text-xs text-muted">
                    {(selectedPoint.description ?? "").length}/1000
                  </span>
                </label>

                <div className="border-t border-line-soft pt-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-lg text-brand">
                      ◉
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Панорама</h3>
                      <p className="mt-1 text-xs text-muted">
                        Сферическое фото 360° в формате 2:1
                      </p>
                    </div>
                  </div>

                  {panoramaLoading ? (
                    <div className="rounded-xl bg-page p-4 text-sm text-muted">
                      Загружаем панораму...
                    </div>
                  ) : panoramaUrl ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-line bg-page">
                        <img
                          src={panoramaUrl}
                          alt={`Панорама: ${selectedPoint.title}`}
                          className="h-36 w-full object-cover"
                        />
                        <p className="break-all px-3 py-2.5 text-xs text-muted">
                          {panoramaName || "Панорама загружена"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-border"
                      >
                        Открыть просмотр →
                      </button>

                      <button
                        type="button"
                        onClick={handlePanoramaDelete}
                        disabled={saving}
                        className="w-full rounded-xl border border-line px-4 py-2.5 text-sm font-medium transition hover:border-brand-border hover:bg-brand-soft hover:text-brand disabled:opacity-50"
                      >
                        Удалить панораму
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line-strong bg-page px-4 py-5 text-center">
                      <p className="text-sm font-medium">
                        Панорама не добавлена
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        Загрузите панораму 360° для этой точки.
                      </p>
                    </div>
                  )}

                  <label className={`mt-3 flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold transition focus-within:ring-4 focus-within:ring-brand-soft ${
                    panoramaUrl || panoramaLoading
                      ? "border border-brand-border text-brand hover:bg-brand-soft"
                      : "bg-brand text-white shadow-sm ring-4 ring-brand-soft hover:bg-brand-hover"
                  }`}>
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
                  <button
                    type="button"
                    onClick={handleDeletePoint}
                    disabled={saving}
                    className="w-full rounded-xl border border-brand-border px-4 py-3 text-sm font-medium text-brand transition hover:bg-brand-soft disabled:opacity-50"
                  >
                    Удалить точку
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-page text-xl text-muted">
                ⚙
              </div>
              <h2 className="text-sm font-semibold">Настройки объекта</h2>
              <p className="mt-2 text-xs leading-5 text-muted">
                {points.length === 0
                  ? "Сначала поставь точку на плане — здесь появятся её название, тип и панорама."
                  : "Для редактирования выберите точку в списке или на плане."}
              </p>
            </section>
          )}
        </aside>
      </div>

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
          onClose={() => setViewerOpen(false)}
          editable
        />
      )}
    </div>
  );
}
