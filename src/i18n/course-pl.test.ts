import { expect, it } from "vitest";
import {
  courseTextInventory,
  getLocalizedCourse,
  translateCourseText,
} from "./course";
import polish from "./course.pl.json";

it("shows Polish task headings and project instructions in the Polish edition", () => {
  const inventory = new Set(courseTextInventory());
  for (const key of Object.keys(polish))
    expect(inventory.has(key), key).toBe(true);
  const course = getLocalizedCourse("pl");
  const steps = course.lessons.flatMap((lesson) => lesson.steps);
  expect(
    steps.some(
      (step) =>
        step.title === "Od podstaw: czas życia i wariancja typu MutSlot",
    ),
  ).toBe(true);
  expect(steps.some((step) => step.title.startsWith("Blank page:"))).toBe(
    false,
  );
  expect(
    course.projects.find((item) => item.id === "service-operations")?.package
      ?.description,
  ).toContain("Ogranicz liczbę przyjmowanych zadań");
  expect(translateCourseText("Err(ParseIntError)", "pl")).toBe(
    "Err(ParseIntError)",
  );
});

it("uses Polish module and lesson names while retaining their stable identities", () => {
  const polishCourse = getLocalizedCourse("pl");
  const englishCourse = getLocalizedCourse("en");
  const closuresModule = polishCourse.modules.find(
    (item) =>
      item.title ===
      "Domknięcia: przechwytywanie danych i wymagania funkcji zwrotnych",
  );
  expect(closuresModule).toBeDefined();
  expect(
    englishCourse.modules.find((item) => item.id === closuresModule!.id)?.title,
  ).toMatch(/closure/i);
  expect(
    polishCourse.lessons.some(
      (item) => item.title === "Zbuduj ByteView z jawną inicjalizacją",
    ),
  ).toBe(true);
  expect(
    polishCourse.lessons.some(
      (item) => item.title === "Opcjonalne funkcje pakietu Cargo",
    ),
  ).toBe(true);
});
