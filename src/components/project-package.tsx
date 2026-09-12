"use client";

import { useEffect, useState } from "react";
import { Download, FileCode, Eye } from "lucide-react";
import type { ProjectPackage as Package } from "@/domain/types";
import {
  packageDownloadPath,
  revealProjectSolution,
  type PackageVariant,
} from "@/domain/project-package";
import { lessons } from "@/content/course";
import { useLearning } from "./learning-provider";
import { Eyebrow } from "./ui";

export function ProjectPackage({ project }: { project: Package }) {
  const { update } = useLearning();
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
  const [variant, setVariant] = useState<PackageVariant>("starter");
  const [path, setPath] = useState(
    project.files.find((file) => file.path === "README.md")?.path ??
      project.files[0].path,
  );
  const file =
    project.files.find((item) => item.path === path) ?? project.files[0];
  const content =
    variant === "solution" ? (file.solution ?? file.starter) : file.starter;
  function showReference() {
    update((state) =>
      revealProjectSolution(state, project, lessons, Date.now()),
    );
    setVariant("solution");
  }
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
          onClick={() => setVariant("starter")}
        >
          Pliki startowe
        </button>
        <button
          className="secondary"
          aria-pressed={variant === "solution"}
          onClick={showReference}
        >
          <Eye size={17} />
          Pokaż rozwiązanie pakietu
        </button>
      </div>
      <p className="package-help-note">
        Podgląd rozwiązania zapisuje użycie pomocy w powiązanych lekcjach.
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
