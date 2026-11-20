"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
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
import { Dashboard, CourseMap, ProjectView, UnavailableLesson, useOpenLesson } from "./overview";
import { LessonWorkspace } from "./lesson-workspace";
import { ReviewView } from "./review";
import { Journal, SettingsView } from "./personal";
import type { View } from "@/domain/types";
import { lessons, modules } from "@/content/course";
import { courseReviewQueue } from "@/content/learning-context";
import {
  createSaveStatusAnnouncer,
  type SaveAnnouncementEvent,
  type SaveStatusAnnouncer,
} from "./save-status-announcer";
const navItems: { id: View; label: string; icon: typeof Compass }[] = [
  { id: "dashboard", label: "Twój warsztat", icon: Compass },
  { id: "course", label: "Mapa nauki", icon: BookOpen },
  { id: "review", label: "Powtórki", icon: RotateCcw },
  { id: "project", label: "Projekt", icon: FolderCode },
  { id: "journal", label: "Notatnik", icon: NotebookPen },
];
type MenuCloseReason = "escape" | "navigation" | "resize" | "toggle";
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
  const [liveMessage, setLiveMessage] = useState("");
  const saveStatusAnnouncerRef = useRef<SaveStatusAnnouncer | null>(null);
  const headingRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const firstNavRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const resizeClosePendingRef = useRef(false);
  const focusDiagnosticOnMountRef = useRef(false);
  const focusWorkspaceOnDiagnosticCompletionRef = useRef(false);
  const requestDiagnosticFocus = useCallback(() => {
    focusDiagnosticOnMountRef.current = true;
  }, []);
  const requestDiagnosticCompletionFocus = useCallback(() => {
    focusWorkspaceOnDiagnosticCompletionRef.current = true;
  }, []);
  const takeStartFocus = useCallback(() => {
    const shouldFocus = focusDiagnosticOnMountRef.current;
    focusDiagnosticOnMountRef.current = false;
    return shouldFocus;
  }, []);
  const view = state.resume.view;
  const navigationKey =
    view === "lesson"
      ? `${view}:${state.resume.lessonId}:${state.resume.stepIndex}`
      : view;
  const previousNavigation = useRef(navigationKey);
  const openLesson = useOpenLesson();
  const savedLesson = lessons.find((lesson) => lesson.id === state.resume.lessonId);
  const currentModule =
    modules.find((module) =>
      module.lessonIds.includes(state.resume.lessonId),
    ) ?? modules[0];
  const currentLessons = lessons.filter(
    (lesson) => lesson.moduleId === currentModule.id,
  );
  const focus = state.resume.focus && view === "lesson";
  const due = courseReviewQueue(state, now).due.length;
  useEffect(() => {
    const announcer = createSaveStatusAnnouncer(
      (event: SaveAnnouncementEvent) => {
        if (event.type === "clear") {
          flushSync(() => setLiveMessage(""));
        } else {
          flushSync(() => setLiveMessage(event.text));
        }
      },
    );
    saveStatusAnnouncerRef.current = announcer;
    return () => {
      announcer.dispose();
      saveStatusAnnouncerRef.current = null;
    };
  }, []);
  useEffect(() => {
    saveStatusAnnouncerRef.current?.update({
      saveStatus,
      storageError: storageError || null,
    });
  }, [saveStatus, storageError]);
  const closeMenu = useCallback((reason: MenuCloseReason): void => {
    setMenu(false);
    if (reason === "escape") {
      requestAnimationFrame(() => {
        menuTriggerRef.current?.focus({ preventScroll: true });
      });
    }
  }, []);
  function sidebarButtons(): HTMLButtonElement[] {
    return Array.from(
      sidebarRef.current?.querySelectorAll<HTMLButtonElement>(
        "button:not([disabled])",
      ) ?? [],
    );
  }
  function handleShellKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (!menu) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu("escape");
      return;
    }
    if (event.key !== "Tab") return;
    const buttons = sidebarButtons();
    const first = buttons[0];
    const last = buttons.at(-1);
    const target = event.target;
    if (!(target instanceof HTMLElement) || !first || !last) return;
    if (target === last && !event.shiftKey) {
      event.preventDefault();
      menuTriggerRef.current?.focus();
    } else if (target === menuTriggerRef.current && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    } else if (target === menuTriggerRef.current && event.shiftKey) {
      event.preventDefault();
      last.focus();
    } else if (target === first && event.shiftKey) {
      event.preventDefault();
      menuTriggerRef.current?.focus();
    }
  }
  useLayoutEffect(() => {
    // Preserve the browser's initial focus; reset only when moving to new content.
    // Finish before another interaction can move focus into the new content.
    if (previousNavigation.current === navigationKey) return;
    previousNavigation.current = navigationKey;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    headingRef.current?.focus({ preventScroll: true });
  }, [navigationKey]);
  useLayoutEffect(() => {
    if (
      !state.diagnostic.completed ||
      !focusWorkspaceOnDiagnosticCompletionRef.current
    ) {
      return;
    }
    focusWorkspaceOnDiagnosticCompletionRef.current = false;
    headingRef.current?.focus({ preventScroll: true });
  }, [state.diagnostic.completed]);
  useLayoutEffect(() => {
    if (menu) firstNavRef.current?.focus({ preventScroll: true });
  }, [menu]);
  useLayoutEffect(() => {
    if (menu || !resizeClosePendingRef.current) return;
    resizeClosePendingRef.current = false;
    const sidebar = sidebarRef.current;
    const active = document.activeElement;
    const desktopTarget = sidebar?.querySelector<HTMLElement>(
      "nav button:not([disabled])",
    );
    const sidebarVisible =
      sidebar !== null && window.getComputedStyle(sidebar).display !== "none";
    const targetVisible =
      desktopTarget !== null &&
      desktopTarget !== undefined &&
      window.getComputedStyle(desktopTarget).display !== "none" &&
      desktopTarget.getClientRects().length > 0;
    if (sidebarVisible && sidebar?.contains(active) && targetVisible) {
      desktopTarget.focus({ preventScroll: true });
    } else {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [menu]);
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
  useEffect(() => {
    const media = window.matchMedia("(max-width: 850px)");
    let wasMobile = media.matches;
    const onResize = () => {
      const isMobile = media.matches;
      if (wasMobile && !isMobile && menu) {
        resizeClosePendingRef.current = true;
        closeMenu("resize");
      }
      wasMobile = isMobile;
    };
    media.addEventListener?.("change", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      media.removeEventListener?.("change", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, [closeMenu, menu]);
  function navigate(next: View) {
    closeMenu("navigation");
    update((s) => ({ ...s, resume: { ...s.resume, view: next } }));
    if (next === view) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        headingRef.current?.focus({ preventScroll: true });
      });
    }
  }
  if (!state.onboarding.completed) {
    return <Onboarding onStart={requestDiagnosticFocus} />;
  }
  if (!state.diagnostic.completed) {
    return (
      <Diagnostic
        takeStartFocus={takeStartFocus}
        requestCompletionFocus={requestDiagnosticCompletionFocus}
      />
    );
  }
  return (
    <div
      className={`app-shell ${focus ? "focus-mode" : ""}`}
      onKeyDown={handleShellKeyDown}
    >
      <a className="skip-link" href="#main-content" inert={menu}>
        Przejdź do treści
      </a>
      <aside
        id="mobile-navigation"
        className={`sidebar ${menu ? "mobile-open" : ""}`}
        aria-label="Nawigacja główna"
        ref={sidebarRef}
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
              ref={item.id === "dashboard" ? firstNavRef : undefined}
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
              <small>
                Lekcje: {currentLessons.length} · Twój bieżący moduł
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <div className="sidebar-trail">
            {currentLessons.map((lesson, index) => (
              <button
                key={lesson.id}
                className={lesson.id === state.resume.lessonId ? "current" : ""}
                onClick={() => {
                  closeMenu("navigation");
                  openLesson(lesson.id);
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
      <span
        className="sr-only save-live"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {liveMessage}
      </span>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              ref={menuTriggerRef}
              className="icon-button mobile-menu"
              aria-label={menu ? "Zamknij nawigację" : "Otwórz nawigację"}
              aria-controls="mobile-navigation"
              aria-expanded={menu}
              onClick={() => (menu ? closeMenu("toggle") : setMenu(true))}
            >
              <Menu size={20} aria-hidden="true" />
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
            <span className="save-status" aria-hidden="true">
              <Check size={13} />
              {saveStatus}
            </span>
            <button
              className="icon-button"
              inert={menu}
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
                inert={menu}
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
          inert={menu}
          className={view === "lesson" ? "workspace-main" : "page-main"}
        >
          {view === "dashboard" ? (
            <Dashboard />
          ) : view === "course" ? (
            <CourseMap />
          ) : view === "lesson" ? (
            savedLesson?.steps[state.resume.stepIndex] ? (
              <LessonWorkspace key={savedLesson.id} lesson={savedLesson} />
            ) : (
              <UnavailableLesson standalone />
            )
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
