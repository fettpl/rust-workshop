"use client";
import { useEffect, useRef } from "react";
import type { LessonStep } from "@/domain/types";
import {
  recordSuppliedSolutions,
  recordExactReviewSolutionContact,
  suppliesExactReviewSolution,
} from "@/content/learning-context";
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
  const { state, update, generation } = useLearning();
  const contacted = useRef<{
    step: LessonStep;
    variant: string;
    code: string;
  } | null>(null);
  const episode = useRef<{
    step: LessonStep;
    variant: string;
    generation: number;
    eventCount: number;
  } | null>(null);
  useEffect(() => {
    const root = ref.current;
    const refs = step?.suppliedSolutions?.[variant];
    const authored = step?.[variant];
    const currentGeneration = generation();
    const newSource =
      episode.current?.step !== step ||
      episode.current?.variant !== variant ||
      episode.current?.generation !== currentGeneration;
    if (
      newSource ||
      !active ||
      !step ||
      !authored ||
      displayedCode !== authored
    ) {
      contacted.current = null;
      episode.current = step
        ? {
            step,
            variant,
            generation: currentGeneration,
            eventCount: state.events.length,
          }
        : null;
    }
    const exactReference = step && suppliesExactReviewSolution(step, variant);
    if (
      !active ||
      !root ||
      !step ||
      (!refs?.length && !exactReference) ||
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
      const addContact =
        exactReference &&
        (contacted.current?.step !== step ||
          contacted.current.variant !== variant ||
          contacted.current.code !== authored);
      if (addContact) contacted.current = { step, variant, code: authored };
      const record = (current: typeof state) => {
        const supplied = recordSuppliedSolutions(current, step, variant, now);
        return addContact
          ? recordExactReviewSolutionContact(
              supplied,
              step,
              variant,
              now,
              episode.current?.eventCount,
            )
          : supplied;
      };
      const next = record(state);
      recorded = true;
      if (next !== state)
        update((current) => (current === state ? next : record(current)));
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
  }, [active, displayedCode, generation, state, step, update, variant]);
  return ref;
}
