"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FileCode, Eye } from "lucide-react";
import type { ProjectPackage as Package } from "@/domain/types";
import {
  hasDatedPackageExposure,
  packageDownloadPath,
  packageRevealRefs,
  type PackageVariant,
} from "@/domain/project-package";
import { revealCourseProjectPackageVariant } from "@/content/learning-context";
import { lessons } from "@/content/course";
import { useLearning } from "./learning-provider";
import { Eyebrow } from "./ui";
import { localizedPackageMarkdown } from "@/i18n/package-markdown";
import { useLocale } from "./locale-provider";

export function ProjectPackage({ project }: { project: Package }) {
  const { t, locale, courseText } = useLocale();
  const { state, update } = useLearning();
  const [variant, setVariant] = useState<PackageVariant>("starter");
  const previewRefs = useMemo(
    () => packageRevealRefs(project, variant),
    [project, variant],
  );
  const needsExposure = previewRefs.some(
    (ref) => !hasDatedPackageExposure(state, ref, Infinity),
  );
  useEffect(() => {
    const now = Date.now();
    if (previewRefs.some((ref) => !hasDatedPackageExposure(state, ref, now))) {
      update((current) =>
        revealCourseProjectPackageVariant(
          current,
          project,
          lessons,
          variant,
          now,
        ),
      );
    }
  }, [previewRefs, project, state, update, variant]);
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    let active = true;
    void navigator.serviceWorker.ready.then((registration) => {
      if (!active) return;
      registration.active?.postMessage({
        type: "CACHE_RESOURCES",
        urls: (["pl", "en"] as const).flatMap((locale) =>
          (["starter", "solution"] as const).map(
            (variant) =>
              new URL(
                packageDownloadPath(project, variant, locale),
                window.location.origin,
              ).href,
          ),
        ),
      });
    });
    return () => {
      active = false;
    };
  }, [project]);
  const [path, setPath] = useState(
    project.files.find((file) => file.path === "README.md")?.path ??
      project.files[0].path,
  );
  const file =
    project.files.find((item) => item.path === path) ?? project.files[0];
  const content =
    variant === "solution" ? (file.solution ?? file.starter) : file.starter;
  function expose(nextVariant: PackageVariant) {
    update((state) =>
      revealCourseProjectPackageVariant(
        state,
        project,
        lessons,
        nextVariant,
        Date.now(),
      ),
    );
  }
  function showVariant(nextVariant: PackageVariant) {
    expose(nextVariant);
    setVariant(nextVariant);
  }
  if (needsExposure)
    return (
      <section
        className="project-package"
        aria-label={t("Pakiet Cargo")}
        aria-busy="true"
      >
        <p>{t("Otwieranie pakietu…")}</p>
      </section>
    );
  return (
    <section className="project-package" aria-label={t("Pakiet Cargo")}>
      <Eyebrow>{t("OD EDYTORA DO TERMINALA")}</Eyebrow>
      <h2>{courseText(project.title)}</h2>
      <p>{courseText(project.description)}</p>
      <ol>
        {project.instructions.map((instruction) => (
          <li key={courseText(instruction)}>{courseText(instruction)}</li>
        ))}
      </ol>
      <p className="muted">
        {t(
          "Pakiet zawiera pliki ćwiczenia. Swoje rozwiązania z edytora możesz przenieść do nich po rozpakowaniu. Pobranie plików ani uruchomienie Cargo poza aplikacją nie zalicza automatycznie lekcji.",
        )}
      </p>
      <div className="package-variants" aria-label={t("Wariant pakietu")}>
        <button
          className="secondary"
          aria-pressed={variant === "starter"}
          onClick={() => showVariant("starter")}
        >
          {t("Pliki startowe")}
        </button>
        <button
          className="secondary"
          aria-pressed={variant === "solution"}
          onClick={() => showVariant("solution")}
        >
          <Eye size={17} />
          {t("Pokaż rozwiązanie pakietu")}
        </button>
      </div>
      <p className="package-help-note">
        {project.starterRevealStepRefs?.length
          ? t(
              "Podgląd lub pobranie plików startowych zapisuje pomoc w zadaniach, których rozwiązania zawiera starter. Rozwiązanie pakietu zapisuje także pomoc w powiązanych zadaniach Rust.",
            )
          : t(
              "Podgląd rozwiązania zapisuje użycie pomocy w powiązanych lekcjach.",
            )}{" "}
        {t("Wcześniejsze samodzielne wyniki pozostają zachowane.")}
      </p>
      <div className="package-file-header">
        <label>
          {t("Plik w pakiecie")}
          <select
            aria-label={t("Plik w pakiecie")}
            value={file.path}
            onChange={(event) => setPath(event.target.value)}
          >
            {project.files.map((item) => (
              <option key={item.path} value={item.path}>
                {item.path}
              </option>
            ))}
          </select>
        </label>
        <a
          className="primary"
          href={packageDownloadPath(project, variant, locale)}
          download={`${project.id}-${variant}.zip`}
          onClick={() => expose(variant)}
        >
          <Download size={17} />
          {variant === "starter"
            ? t("Pobierz pakiet startowy")
            : t("Pobierz rozwiązanie")}
        </a>
      </div>
      <div className="package-file-caption">
        <FileCode size={16} />
        <strong>{file.path}</strong>
        <span>
          {variant === "starter"
            ? t("Plik startowy")
            : t("Rozwiązanie referencyjne")}
        </span>
      </div>
      <pre
        className="package-file-content"
        tabIndex={0}
        aria-label={t("Zawartość pliku")}
      >
        <code>
          {file.path.endsWith(".md")
            ? localizedPackageMarkdown(content, locale)
            : content}
        </code>
      </pre>
    </section>
  );
}
