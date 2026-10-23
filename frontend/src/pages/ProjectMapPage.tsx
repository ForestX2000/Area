import { useEffect, useState } from "react";
import type { ChangeEvent, MouseEvent } from "react";
import { Link, useParams } from "react-router-dom";

import PanoramaViewer from "../components/PanoramaViewer";
import type { MapPoint } from "../types/mapPoint";
import {
  deleteMapImage,
  getMapImage,
  getPanorama,
  saveMapImage,
  savePanorama,
  deletePanorama,
} from "../utils/mapStorage";
import { getPoints, savePoints } from "../utils/pointStorage";

export default function ProjectMapPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [panoramaUrl, setPanoramaUrl] = useState<string | null>(null);
  const [panoramaName, setPanoramaName] = useState("");
  const [panoramaLoading, setPanoramaLoading] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);

  const selectedPoint =
    points.find((point) => point.id === selectedPointId) ?? null;

  // Загружаем план и сохранённые точки проекта.
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
          setPanoramaName("Панорама");
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

      try {
        const file = await getPanorama(projectId, selectedPointId);

        if (cancelled) return;

        if (file) {
          loadedPanoramaUrl = URL.createObjectURL(file);
          setPanoramaUrl(loadedPanoramaUrl);
          setImageName("План помещения");
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

  // Загрузка плана помещения.
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

  // Удаление плана.
  async function handleImageDelete() {
    if (!projectId) return;

    setSaving(true);
    setError("");

    try {
      await deleteMapImage(projectId);

      setImageUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return null;
      });

      setImageName("");
      setPoints([]);
      setSelectedPointId(null);
      savePoints(projectId, []);
    } catch {
      setError("Не удалось удалить план.");
    } finally {
      setSaving(false);
    }
  }

  // Добавление точки кликом по плану.
  function handleMapClick(event: MouseEvent<HTMLDivElement>) {
    if (!projectId || !imageUrl || saving) return;

    const bounds = event.currentTarget.getBoundingClientRect();

    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    const newPoint: MapPoint = {
      id: crypto.randomUUID(),
      x,
      y,
      title: `Точка ${points.length + 1}`,
    };

    const updatedPoints = [...points, newPoint];

    setPoints(updatedPoints);
    setSelectedPointId(newPoint.id);
    savePoints(projectId, updatedPoints);
    setError("");
  }

  // Изменение названия выбранной точки.
  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!projectId || !selectedPointId) return;

    const updatedPoints = points.map((point) =>
      point.id === selectedPointId
        ? { ...point, title: event.target.value }
        : point,
    );

    setPoints(updatedPoints);
    savePoints(projectId, updatedPoints);
  }

  // Удаление точки и её панорамы.
  async function handleDeletePoint() {
    if (!projectId || !selectedPointId) return;

    const pointId = selectedPointId;
    setError("");

    try {
      await deletePanorama(projectId, pointId);

      const updatedPoints = points.filter((point) => point.id !== pointId);

      setPoints(updatedPoints);
      savePoints(projectId, updatedPoints);
      setSelectedPointId(null);
      setViewerOpen(false);
    } catch {
      setError("Не удалось удалить панораму точки.");
    }
  }

  // Загрузка или замена панорамы выбранной точки.
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

  // Удаление панорамы без удаления самой точки.
  async function handlePanoramaDelete() {
    if (!projectId || !selectedPointId) return;

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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-600">
            Загружаем пространство...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
        {/* Верхняя навигация */}
        <header className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-700"
          >
            <span aria-hidden="true">←</span>
            Все проекты
          </Link>

          <div className="mt-5 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-sm">
                  ⌘
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
                  Space map / Editor
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Карта пространства
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                Создавай интерактивную карту, добавляй точки и связывай их с
                панорамами помещения.
              </p>
            </div>

            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-within:ring-4 focus-within:ring-blue-100 sm:self-auto">
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

        {/* Сообщения о состоянии */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span className="font-bold">!</span>
            <p>{error}</p>
          </div>
        )}

        {saving && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" />
            Сохраняем изменения...
          </div>
        )}

        {/* Рабочая область */}
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {/* Заголовок карты */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
                  ▧
                </div>
                <div>
                  <h2 className="font-semibold">План помещения</h2>
                  <p className="mt-1 max-w-xs break-all text-xs text-slate-500">
                    {imageName || "Рабочая область карты"}
                  </p>
                </div>
              </div>

              {imageUrl && (
                <button
                  type="button"
                  onClick={handleImageDelete}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  Удалить план
                </button>
              )}
            </div>

            {/* Инструкция */}
            {imageUrl && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6">
                <p className="text-sm text-slate-500">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full bg-blue-500" />
                  Нажми на план, чтобы добавить точку
                </p>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600">
                  {points.length}{" "}
                  {points.length === 1
                    ? "точка"
                    : points.length >= 2 && points.length <= 4
                      ? "точки"
                      : "точек"}
                </span>
              </div>
            )}

            {/* Карта */}
            <div className="p-4 sm:p-6">
              {imageUrl ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#eef2f7] p-2 sm:p-4">
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
                          title={point.title}
                          aria-label={`Выбрать точку: ${point.title}`}
                          aria-pressed={selected}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedPointId(point.id);
                          }}
                          className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white text-xs font-bold text-white transition duration-150 hover:scale-110 sm:h-9 sm:w-9 ${
                            selected
                              ? "z-10 scale-110 bg-orange-500 shadow-lg shadow-orange-500/30 ring-4 ring-orange-200/70"
                              : "bg-blue-600 shadow-md shadow-blue-900/20 hover:bg-blue-700"
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
                <div className="flex min-h-[340px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl text-blue-700">
                    ▧
                  </div>
                  <h3 className="text-lg font-semibold">
                    Начни с плана помещения
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                    Загрузи изображение этажа или помещения. Затем ты сможешь
                    отметить интересные места и прикрепить к ним панорамы.
                  </p>

                  <label className="mt-6 inline-flex cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Выбрать изображение
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageUpload}
                      disabled={saving}
                    />
                  </label>
                  <p className="mt-3 text-xs text-slate-400">
                    Поддерживаются изображения
                  </p>
                </div>
              )}
            </div>

            {imageUrl && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-5 py-4 text-xs text-slate-400 sm:px-6">
                <span>Нажми на маркер, чтобы открыть его настройки</span>
                <span>Изменения сохраняются автоматически</span>
              </div>
            )}
          </section>

          {/* Боковая панель */}
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
                <div>
                  <h2 className="font-semibold">Точки на карте</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Список объектов пространства
                  </p>
                </div>
                <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-blue-50 px-2 text-sm font-bold text-blue-700">
                  {points.length}
                </span>
              </div>

              {points.length === 0 ? (
                <div className="px-5 py-9 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                    ⊙
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    Пока нет точек
                  </p>
                  <p className="mx-auto mt-2 max-w-[230px] text-xs leading-5 text-slate-500">
                    {imageUrl
                      ? "Нажми на любое место плана, чтобы добавить первую точку."
                      : "Сначала загрузи план помещения."}
                  </p>
                </div>
              ) : (
                <ul className="max-h-[350px] space-y-1 overflow-y-auto p-3">
                  {points.map((point, index) => {
                    const selected = selectedPointId === point.id;

                    return (
                      <li key={point.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedPointId(point.id)}
                          aria-pressed={selected}
                          className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                            selected
                              ? "border-blue-200 bg-blue-50"
                              : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${
                              selected
                                ? "bg-blue-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 group-hover:bg-white"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-medium text-slate-800">
                              {point.title || `Точка ${index + 1}`}
                            </span>
                            <span className="mt-1 block text-xs text-slate-400">
                              {selected ? "Выбрана" : "Точка пространства"}
                            </span>
                          </span>
                          <span className="text-slate-300 transition group-hover:text-slate-500">
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
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-blue-700">
                    Настройки
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    Редактирование точки
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Измени название или управляй панорамой
                  </p>
                </div>

                <div className="space-y-5 p-5">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Название точки
                    </span>
                    <input
                      type="text"
                      value={selectedPoint.title}
                      onChange={handleTitleChange}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
                      placeholder="Например, Главный вход"
                    />
                  </label>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-lg">
                        ◉
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold">Панорама</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Изображение для этой точки
                        </p>
                      </div>
                    </div>

                    {panoramaLoading ? (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                        Загружаем панораму...
                      </div>
                    ) : panoramaUrl ? (
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <img
                            src={panoramaUrl}
                            alt={`Панорама: ${selectedPoint.title}`}
                            className="h-36 w-full object-cover"
                          />
                          <p className="break-all px-3 py-2.5 text-xs text-slate-500">
                            {panoramaName || "Панорама загружена"}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setViewerOpen(true)}
                          className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          Открыть просмотр →
                        </button>

                        <button
                          type="button"
                          onClick={handlePanoramaDelete}
                          disabled={saving}
                          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          Удалить панораму
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          Панорама не добавлена
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Загрузи изображение, чтобы связать его с этой точкой.
                        </p>
                      </div>
                    )}

                    <label className="mt-3 flex cursor-pointer items-center justify-center rounded-xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50">
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

                  <div className="border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={handleDeletePoint}
                      disabled={saving}
                      className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      Удалить точку
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-xl">
                  ⚙
                </div>
                <h2 className="text-sm font-semibold">Настройки точки</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Выбери точку из списка или нажми на маркер на плане, чтобы
                  изменить её название и панораму.
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
    </main>
  );
}
