"use client";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpRight,
  RotateCcw,
  FolderCode,
  NotebookPen,
  Settings,
  Sun,
  Moon,
  WifiOff,
  Check,
  Menu,
} from "lucide-react";
import { useClock } from "./use-clock";
import { LearningProvider, useLearning } from "./learning-provider";
import { Onboarding, Diagnostic } from "./onboarding";
import { Dashboard, CourseMap, ProjectView, useOpenLesson } from "./overview";
import { LessonWorkspace } from "./lesson-workspace";
import { ReviewView } from "./review";
import { Journal, SettingsView } from "./personal";
import type { View } from "@/domain/types";
import { lessons, modules } from "@/content/course";
import { dueReviews } from "@/engine/learning";
const navItems: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "dashboard", label: "Twój warsztat", icon: Compass },
  { id: "course", label: "Mapa nauki", icon: BookOpen },
  { id: "review", label: "Powtórki", icon: RotateCcw },
  { id: "project", label: "Projekt", icon: FolderCode },
  { id: "journal", label: "Notatnik", icon: NotebookPen },
];
export default function App() {
  return (
    <LearningProvider>
      <AppShell />
    </LearningProvider>
  );
}
function AppShell() {
  const now = useClock();
  const { state, update, saveStatus, storageError } = useLearning();
  const [online, setOnline] = useState(true);
  const [menu, setMenu] = useState(false);
  const headingRef = useRef<HTMLElement>(null);
  const view = state.resume.view;
  const openLesson = useOpenLesson();
  const currentModule =
    modules.find((module) =>
      module.lessonIds.includes(state.resume.lessonId),
    ) ?? modules[0];
  const currentLessons = lessons.filter(
    (lesson) => lesson.moduleId === currentModule.id,
  );
  const focus = state.resume.focus && view === "lesson";
  const due = dueReviews(state, now).length;
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  function navigate(next: View) {
    update((s) => ({ ...s, resume: { ...s.resume, view: next } }));
    setMenu(false);
    requestAnimationFrame(() => headingRef.current?.focus());
  }
  if (!state.onboarding.completed) return <Onboarding />;
  if (!state.diagnostic.completed) return <Diagnostic />;
  return (
    <div className={`app-shell ${focus ? "focus-mode" : ""}`}>
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <aside
        className={`sidebar ${menu ? "mobile-open" : ""}`}
        aria-label="Nawigacja główna"
      >
        <button className="brand" onClick={() => navigate("dashboard")}>
          <span className="brand-mark">r.</span>rust
          <span className="brand-light">workshop</span>
        </button>
        <p className="sidebar-label">PRZESTRZEŃ DO NAUKI</p>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {item.id === "review" && due > 0 && (
                <span className="count">{due}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-course">
          <span className="sidebar-label">TERAZ ODKRYWASZ</span>
          <button onClick={() => navigate("course")} className="sidebar-module">
            <span className="module-glyph" aria-hidden="true">
              ↳
            </span>
            <span>
              {currentModule.title}
              <small>{currentLessons.length} lekcji · Twój bieżący moduł</small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <div className="sidebar-trail">
            {currentLessons.map((lesson, index) => (
              <button
                key={lesson.id}
                className={lesson.id === state.resume.lessonId ? "current" : ""}
                onClick={() => {
                  openLesson(lesson.id);
                  setMenu(false);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {lesson.title}
              </button>
            ))}
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="local-note">
            <span className="status-dot" />
            Twoje dane, Twoje urządzenie
          </div>
          <button className="nav-item" onClick={() => navigate("settings")}>
            <Settings size={18} />
            Ustawienia i postęp
          </button>
          <div className="profile">
            <span className="avatar">
              {(state.onboarding.name || "Ty").slice(0, 1).toUpperCase()}
            </span>
            <span>
              {state.onboarding.name || "Twój profil"}
              <small>Uczysz się we własnym tempie</small>
            </span>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Otwórz nawigację"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={20} />
            </button>
            <span>Warsztat</span>
            <span className="breadcrumb-slash">/</span>
            <strong>
              {view === "lesson"
                ? currentModule.title
                : (navItems.find((n) => n.id === view)?.label ?? "Ustawienia")}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="save-status">
              <Check size={13} />
              {saveStatus}
            </span>
            <button
              className="icon-button"
              aria-label={
                state.settings.theme === "light"
                  ? "Włącz ciemny motyw"
                  : "Włącz jasny motyw"
              }
              onClick={() =>
                update((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    theme: s.settings.theme === "light" ? "dark" : "light",
                  },
                }))
              }
            >
              {state.settings.theme === "light" ? (
                <Moon size={17} />
              ) : (
                <Sun size={17} />
              )}
            </button>
            {view === "lesson" && (
              <button
                className="quiet-button"
                aria-pressed={focus}
                onClick={() =>
                  update((s) => ({
                    ...s,
                    resume: { ...s.resume, focus: !s.resume.focus },
                  }))
                }
              >
                {focus ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )}
                <span>{focus ? "Wyjdź ze skupienia" : "Skupienie"}</span>
              </button>
            )}
          </div>
        </header>
        {storageError && (
          <div role="alert" className="global-alert">
            {storageError}
          </div>
        )}
        {!online && (
          <div role="status" className="offline-banner">
            <WifiOff size={16} />
            Tryb offline. Możesz uczyć się i edytować kod. Kompilator wymaga
            połączenia.
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          ref={headingRef}
          className={view === "lesson" ? "workspace-main" : "page-main"}
        >
          {view === "dashboard" ? (
            <Dashboard />
          ) : view === "course" ? (
            <CourseMap />
          ) : view === "lesson" ? (
            <LessonWorkspace key={state.resume.lessonId} />
          ) : view === "review" ? (
            <ReviewView />
          ) : view === "project" ? (
            <ProjectView />
          ) : view === "journal" ? (
            <Journal />
          ) : (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
