"use client";
import { useEffect, useRef } from "react";
import type { LessonStep } from "@/domain/types";
import { recordSuppliedSolutions } from "@/content/learning-context";
import { useLearning } from "./learning-provider";

/** Attribute authored prerequisites after their code is actually visible. */
export function useSuppliedSolutionExposure<
  T extends HTMLElement = HTMLDivElement,
>(
  step: LessonStep | undefined,
  variant: "code" | "solution",
  displayedCode: string | undefined,
  active = true,
) {
  const ref = useRef<T>(null);
  const { state, update } = useLearning();
  useEffect(() => {
    const root = ref.current;
    const refs = step?.suppliedSolutions?.[variant];
    const authored = step?.[variant];
    if (
      !active ||
      !root ||
      !step ||
      !refs?.length ||
      !authored ||
      displayedCode !== authored
    )
      return;

    let recorded = false;
    let observedContent: HTMLElement | undefined;
    const recordVisibleCode = () => {
      if (recorded || document.visibilityState !== "visible") return;
      // Wait for the dynamic editor's contents, including its accessible fallback.
      const content = root.querySelector<HTMLElement>(
        variant === "solution"
          ? ".revealed-solution pre"
          : "textarea.code-textarea, .monaco-editor .view-lines, pre.code-sample",
      );
      if (
        !content ||
        (!content.textContent && !(content instanceof HTMLTextAreaElement))
      )
        return;
      if (content instanceof HTMLTextAreaElement && content.value !== authored)
        return;
      // A long review section can already intersect while its editor is below the fold.
      if (observedContent !== content) {
        if (observedContent) intersection.unobserve(observedContent);
        observedContent = content;
        intersection.observe(content);
      }
      const box = content.getBoundingClientRect();
      const style = getComputedStyle(content);
      if (
        !box.width ||
        !box.height ||
        box.bottom <= 0 ||
        box.right <= 0 ||
        box.top >= window.innerHeight ||
        box.left >= window.innerWidth ||
        style.visibility !== "visible"
      )
        return;

      const now = Date.now();
      const next = recordSuppliedSolutions(state, step, variant, now);
      recorded = true;
      if (next !== state) {
        update((current) =>
          current === state
            ? next
            : recordSuppliedSolutions(current, step, variant, now),
        );
      }
    };
    const intersection = new IntersectionObserver(recordVisibleCode);
    const contents = new MutationObserver(recordVisibleCode);
    intersection.observe(root);
    contents.observe(root, { childList: true, subtree: true });
    document.addEventListener("visibilitychange", recordVisibleCode);
    recordVisibleCode();
    return () => {
      intersection.disconnect();
      contents.disconnect();
      document.removeEventListener("visibilitychange", recordVisibleCode);
    };
  }, [active, displayedCode, state, step, update, variant]);
  return ref;
}
