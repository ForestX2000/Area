import type { SpacePlan } from "../types/space";

export const demoSpace: SpacePlan = {
  id: "demo-space",
  projectId: "demo-project",
  name: "Выставочный центр",
  width: 1000,
  height: 700,

  rooms: [
    {
      id: "room-1",
      name: "Регистрация",
      x: 40,
      y: 40,
      width: 270,
      height: 180,
    },
    {
      id: "room-2",
      name: "Зал 1",
      x: 350,
      y: 40,
      width: 250,
      height: 180,
    },
    {
      id: "room-3",
      name: "Зал 2",
      x: 640,
      y: 40,
      width: 300,
      height: 180,
    },
    {
      id: "room-4",
      name: "Кафе",
      x: 40,
      y: 470,
      width: 270,
      height: 180,
    },
    {
      id: "room-5",
      name: "Конференц-зал",
      x: 640,
      y: 470,
      width: 300,
      height: 180,
    },
  ],

  points: [
    {
      id: "point-1",
      name: "Главный вход",
      category: "entrance",
      description: "Вход в выставочный центр",
      x: 175,
      y: 220,
    },
    {
      id: "point-2",
      name: "Стойка регистрации",
      category: "service",
      description: "Здесь можно получить информацию",
      x: 175,
      y: 120,
    },
    {
      id: "point-3",
      name: "Точка Wi-Fi",
      category: "wifi",
      description: "Бесплатный доступ к Wi-Fi",
      x: 770,
      y: 120,
    },
    {
      id: "point-4",
      name: "Кафе",
      category: "room",
      description: "Кафе для посетителей",
      x: 175,
      y: 550,
    },
  ],
};