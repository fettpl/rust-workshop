"use client";

import { useEffect, useState } from "react";
import { Download, FileCode, Eye } from "lucide-react";
import type { ProjectPackage as Package } from "@/domain/types";
import {
  packageDownloadPath,
  type PackageVariant,
} from "@/domain/project-package";
import { revealCourseProjectPackageVariant } from "@/content/learning-context";
import { lessons } from "@/content/course";
import { stepKey } from "@/persistence/state";
import { useLearning } from "./learning-provider";
import { Eyebrow } from "./ui";

export function ProjectPackage({ project }: { project: Package }) {
  const { state, update } = useLearning();
  const [variant, setVariant] = useState<PackageVariant>("starter");
  const previewRefs =
    variant === "solution"
      ? [...(project.starterRevealStepRefs ?? []), ...project.revealStepRefs]
      : (project.starterRevealStepRefs ?? []);
  const needsExposure = previewRefs.some(
    (ref) => !state.steps[stepKey(ref.lessonId, ref.stepId)]?.revealed,
  );
  useEffect(() => {
    // Also restore exposure if imported progress changes while a preview is open.
    if (needsExposure) {
      update((state) =>
        revealCourseProjectPackageVariant(
          state,
          project,
          lessons,
          variant,
          Date.now(),
        ),
      );
    }
  }, [project, update, needsExposure, variant]);
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
        urls: (["starter", "solution"] as const).map(
          (variant) =>
            new URL(
              packageDownloadPath(project, variant),
              window.location.origin,
            ).href,
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
        aria-label="Pakiet Cargo"
        aria-busy="true"
      >
        <p>Otwieranie pakietu…</p>
      </section>
    );
  return (
    <section className="project-package" aria-label="Pakiet Cargo">
      <Eyebrow>OD EDYTORA DO TERMINALA</Eyebrow>
      <h2>{project.title}</h2>
      <p>{project.description}</p>
      <ol>
        {project.instructions.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>
      <p className="muted">
        Pakiet zawiera pliki ćwiczenia. Swoje rozwiązania z edytora możesz
        przenieść do nich po rozpakowaniu. Pobranie plików ani uruchomienie
        Cargo poza aplikacją nie zalicza automatycznie lekcji.
      </p>
      <div className="package-variants" aria-label="Wariant pakietu">
        <button
          className="secondary"
          aria-pressed={variant === "starter"}
          onClick={() => showVariant("starter")}
        >
          Pliki startowe
        </button>
        <button
          className="secondary"
          aria-pressed={variant === "solution"}
          onClick={() => showVariant("solution")}
        >
          <Eye size={17} />
          Pokaż rozwiązanie pakietu
        </button>
      </div>
      <p className="package-help-note">
        {project.starterRevealStepRefs?.length
          ? "Podgląd lub pobranie plików startowych zapisuje pomoc w zadaniach z gotowymi manifestami. Rozwiązanie pakietu zapisuje także pomoc w powiązanych zadaniach Rust."
          : "Podgląd rozwiązania zapisuje użycie pomocy w powiązanych lekcjach."}{" "}
        Wcześniejsze samodzielne wyniki pozostają zachowane.
      </p>
      <div className="package-file-header">
        <label>
          Plik w pakiecie
          <select
            aria-label="Plik w pakiecie"
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
          href={packageDownloadPath(project, variant)}
          download={`${project.id}-${variant}.zip`}
          onClick={() => expose(variant)}
        >
          <Download size={17} />
          {variant === "starter"
            ? "Pobierz pakiet startowy"
            : "Pobierz rozwiązanie"}
        </a>
      </div>
      <div className="package-file-caption">
        <FileCode size={16} />
        <strong>{file.path}</strong>
        <span>
          {variant === "starter" ? "Plik startowy" : "Rozwiązanie referencyjne"}
        </span>
      </div>
      <pre
        className="package-file-content"
        tabIndex={0}
        aria-label="Zawartość pliku"
      >
        <code>{content}</code>
      </pre>
    </section>
  );
}
