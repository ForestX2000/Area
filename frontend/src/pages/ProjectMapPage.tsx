
import { useEffect, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";

import PanoramaViewer from "../components/PanoramaViewer";
import type {
  MapPoint,
  MapPointCategory,
} from "../types/mapPoint";

import {
  deleteMapImage,
  getMapImage,
  getPanorama,
  saveMapImage,
  savePanorama,
  deletePanorama,
} from "../utils/mapStorage";

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

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  const [panoramaName, setPanoramaName] = useState("");
  const [panoramaLoading, setPanoramaLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

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
    let loadedImageUrl: string | null = null;

    async function loadProjectMap() {
      if (!projectId) {
        setError("Не указан ID проекта.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [savedImage, savedPoints] = await Promise.all([
          getMapImage(projectId),
          Promise.resolve(getPoints(projectId)),
        ]);

        if (cancelled) return;

        setPoints(savedPoints);

        if (savedImage) {
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
      if (loadedImageUrl) URL.revokeObjectURL(loadedImageUrl);
    };
  }, [projectId]);

  // Загружаем панораму выбранной точки.
  useEffect(() => {
    let cancelled = false;
    let loadedPanoramaUrl: string | null = null;

    async function loadSelectedPanorama() {
      if (!projectId || !selectedPointId) {
        setPanoramaUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return null;
        });
        setPanoramaName("");
        setPanoramaLoading(false);
        return;
      }

      setPanoramaLoading(true);

      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setPanoramaName("");
      setViewerOpen(false);

      try {
        const file = await getPanorama(projectId, selectedPointId);

        if (cancelled) return;

        if (file) {
          loadedPanoramaUrl = URL.createObjectURL(file);
          setPanoramaUrl(loadedPanoramaUrl);
          setPanoramaName(
            file instanceof File && file.name ? file.name : "Панорама",
          );
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
      if (loadedPanoramaUrl) URL.revokeObjectURL(loadedPanoramaUrl);
    };
  }, [projectId, selectedPointId]);

  function persistPoints(updatedPoints: MapPoint[]) {
    if (!projectId) return;

    setPoints(updatedPoints);

    try {
      savePoints(projectId, updatedPoints);
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
      await saveMapImage(projectId, file);

      setImageUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return URL.createObjectURL(file);
      });

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

    const confirmed = window.confirm(
      "Удалить план и все точки с карты? Загруженные панорамы точек также могут остаться в хранилище.",
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deleteMapImage(projectId);

      setImageUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setImageName("");
      persistPoints([]);
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
    if (!projectId || !imageUrl || saving) return;

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
    const confirmed = window.confirm("Удалить эту точку и её панораму?");

    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deletePanorama(projectId, pointId);

      persistPoints(points.filter((point) => point.id !== pointId));
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

    if (!file || !projectId || !selectedPointId) return;

    if (!file.type.startsWith("image/")) {
      setError("Выбери файл изображения для панорамы.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await savePanorama(projectId, selectedPointId, file);

      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return URL.createObjectURL(file);
      });

      setPanoramaName(file.name);
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

    const confirmed = window.confirm("Удалить панораму этой точки?");
    if (!confirmed) return;

    setSaving(true);
    setError("");

    try {
      await deletePanorama(projectId, selectedPointId);

      setPanoramaUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setPanoramaName("");
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
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-[#E5E5E5] border-t-[#E23E1A]" />
          <p className="text-sm font-medium text-[#777777]">
            Загружаем пространство...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="text-[#4A4A4A]">
      <header className="mb-7">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#777777] transition hover:text-[#E23E1A]"
        >
          <span aria-hidden="true">←</span>
          Все проекты
        </Link>

        <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E23E1A] text-lg text-white">
                ▧
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#E23E1A]">
                Space Map / Editor
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Карта пространства
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777777]">
              Добавляй объекты на план, описывай места и связывай их с
              панорамами.
            </p>
          </div>

          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#C93416] focus-within:ring-4 focus-within:ring-[#FCEBE7] sm:self-auto">
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
      </header>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-[#F2B8AA] bg-[#FCEBE7] p-4 text-sm text-[#C93416]"
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
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-[#F2B8AA] bg-white px-4 py-3 text-sm text-[#E23E1A]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#E23E1A]" />
          Сохраняем изменения...
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Рабочая область карты */}
        <section className="min-w-0 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] px-5 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FCEBE7] text-xl text-[#E23E1A]">
                ▧
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold">План помещения</h2>
                <p className="mt-1 break-all text-xs text-[#777777]">
                  {imageName || "Изображение ещё не загружено"}
                </p>
              </div>
            </div>

            {imageUrl && (
              <button
                type="button"
                onClick={handleImageDelete}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[#777777] transition hover:bg-[#FCEBE7] hover:text-[#E23E1A] disabled:opacity-50"
              >
                Удалить план
              </button>
            )}
          </div>

          {imageUrl && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEEEEE] bg-[#F5F5F5] px-5 py-3 sm:px-6">
              <p className="text-sm text-[#777777]">
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#E23E1A]" />
                Нажми на свободное место плана, чтобы добавить точку
              </p>
              <span className="rounded-lg border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-medium">
                Объектов: {points.length}
              </span>
            </div>
          )}

          <div className="p-4 sm:p-6">
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
                            ? "z-10 scale-110 bg-[#E23E1A] shadow-lg ring-4 ring-[#F2B8AA]/70"
                            : "bg-[#4A4A4A] shadow-md hover:scale-110 hover:bg-[#E23E1A]"
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
              <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D0D0D0] bg-[#F5F5F5] px-6 py-12 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FCEBE7] text-3xl text-[#E23E1A]">
                  ▧
                </div>
                <h3 className="text-lg font-semibold">
                  Начни с плана помещения
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#777777]">
                  Загрузи изображение этажа или помещения. Затем отмечай входы,
                  залы, сервисные зоны и другие объекты.
                </p>
                <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#E23E1A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416]">
                  Выбрать изображение
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageUpload}
                    disabled={saving}
                  />
                </label>
                <p className="mt-3 text-xs text-[#999999]">
                  Поддерживаются файлы изображений
                </p>
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEEEEE] px-5 py-4 text-xs text-[#999999] sm:px-6">
              <span>Выбери маркер, чтобы редактировать объект</span>
              <span>Изменения сохраняются автоматически</span>
            </div>
          )}
        </section>

        {/* Список объектов и редактор */}
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
                  {points.length}
                </span>
              </div>

              {points.length > 0 && (
                <label className="mt-4 flex items-center gap-2 rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3">
                  <span className="text-[#999999]" aria-hidden="true">
                    ⌕
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Найти точку..."
                    className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-[#999999]"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="px-1 text-[#777777] hover:text-[#E23E1A]"
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] text-xl text-[#777777]">
                  ⊙
                </div>
                <p className="text-sm font-medium">Пока нет объектов</p>
                <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-[#777777]">
                  {imageUrl
                    ? "Нажми на план, чтобы добавить первую точку."
                    : "Сначала загрузи план помещения."}
                </p>
              </div>
            ) : filteredPoints.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-[#777777]">
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
                            ? "border-[#F2B8AA] bg-[#FCEBE7]"
                            : "border-transparent hover:border-[#E5E5E5] hover:bg-[#F5F5F5]"
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                            selected
                              ? "bg-[#E23E1A] text-white"
                              : "bg-[#F5F5F5] text-[#4A4A4A]"
                          }`}
                        >
                          {index + 1}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block break-words text-sm font-medium">
                            {point.title || `Точка ${index + 1}`}
                          </span>
                          <span className="mt-1 block truncate text-xs text-[#777777]">
                            {getCategoryIcon(point.category)}{" "}
                            {getCategoryLabel(point.category)}
                            {point.panoramaKey ? " · Панорама" : ""}
                          </span>
                        </span>

                        <span className="text-[#D0D0D0] group-hover:text-[#777777]">
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
            <section className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
              <div className="border-b border-[#EEEEEE] px-5 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#E23E1A]">
                  Настройки объекта
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  Редактирование точки
                </h2>
                <p className="mt-1 text-xs text-[#777777]">
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
                    className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
                    placeholder="Например, Главный вход"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium">Категория</span>
                  <select
                    value={selectedPoint.category ?? "other"}
                    onChange={handleCategoryChange}
                    className="w-full rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
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
                    className="w-full resize-y rounded-xl border border-[#E5E5E5] bg-[#F5F5F5] px-3.5 py-3 text-sm outline-none transition placeholder:text-[#999999] focus:border-[#E23E1A] focus:bg-white focus:ring-4 focus:ring-[#FCEBE7]"
                  />
                  <span className="block text-right text-xs text-[#999999]">
                    {(selectedPoint.description ?? "").length}/1000
                  </span>
                </label>

                <div className="border-t border-[#EEEEEE] pt-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FCEBE7] text-lg text-[#E23E1A]">
                      ◉
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Панорама</h3>
                      <p className="mt-1 text-xs text-[#777777]">
                        Изображение, связанное с этой точкой
                      </p>
                    </div>
                  </div>

                  {panoramaLoading ? (
                    <div className="rounded-xl bg-[#F5F5F5] p-4 text-sm text-[#777777]">
                      Загружаем панораму...
                    </div>
                  ) : panoramaUrl ? (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#F5F5F5]">
                        <img
                          src={panoramaUrl}
                          alt={`Панорама: ${selectedPoint.title}`}
                          className="h-36 w-full object-cover"
                        />
                        <p className="break-all px-3 py-2.5 text-xs text-[#777777]">
                          {panoramaName || "Панорама загружена"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        className="w-full rounded-xl bg-[#E23E1A] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C93416] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#F2B8AA]"
                      >
                        Открыть просмотр →
                      </button>

                      <button
                        type="button"
                        onClick={handlePanoramaDelete}
                        disabled={saving}
                        className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium transition hover:border-[#F2B8AA] hover:bg-[#FCEBE7] hover:text-[#E23E1A] disabled:opacity-50"
                      >
                        Удалить панораму
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#D0D0D0] bg-[#F5F5F5] px-4 py-5 text-center">
                      <p className="text-sm font-medium">
                        Панорама не добавлена
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#777777]">
                        Загрузи изображение, чтобы связать его с этой точкой.
                      </p>
                    </div>
                  )}

                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-[#F2B8AA] px-4 py-3 text-sm font-semibold text-[#E23E1A] transition hover:bg-[#FCEBE7]">
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
                </div>

                <div className="border-t border-[#EEEEEE] pt-4">
                  <button
                    type="button"
                    onClick={handleDeletePoint}
                    disabled={saving}
                    className="w-full rounded-xl border border-[#F2B8AA] px-4 py-3 text-sm font-medium text-[#E23E1A] transition hover:bg-[#FCEBE7] disabled:opacity-50"
                  >
                    Удалить точку
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-[#D0D0D0] bg-white p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5F5F5] text-xl text-[#777777]">
                ⚙
              </div>
              <h2 className="text-sm font-semibold">Настройки объекта</h2>
              <p className="mt-2 text-xs leading-5 text-[#777777]">
                Выбери точку в списке или нажми на маркер плана, чтобы изменить
                её данные.
              </p>
            </section>
          )}
        </aside>
      </div>

      {viewerOpen && panoramaUrl && selectedPoint && (
        <PanoramaViewer
          imageUrl={panoramaUrl}
          title={selectedPoint.title}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}
