import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Trace } from "../domain/types";
import { OwnershipVisualizer } from "./ownership-visualizer";

it("distinguishes a destroyed Rc value from the allocation retained by Weak", () => {
  const trace: Trace = {
    title: "Ostatni właściciel i słaby uchwyt",
    code: "drop(last_owner);\ndrop(observer);",
    frames: [
      {
        line: 1,
        explanation: "Weak nie daje już dostępu do wartości.",
        stack: [{ name: "observer", value: "Weak", state: "weak" }],
        heap: [
          {
            id: "A",
            value: "7",
            owner: "brak",
            valueDropped: true,
            strongHandles: 0,
            weakHandles: 1,
          },
        ],
      },
      {
        line: 2,
        explanation: "Nie ma już żadnego uchwytu.",
        stack: [],
        heap: [
          {
            id: "A",
            value: "7",
            owner: "brak",
            dropped: true,
            valueDropped: true,
            strongHandles: 0,
            weakHandles: 0,
          },
        ],
      },
    ],
  };
  const retained = renderToStaticMarkup(
    createElement(OwnershipVisualizer, { trace, index: 0, onChange: () => {} }),
  );
  expect(retained).toContain("<span>słaby uchwyt</span>");
  expect(retained).toContain("Wartość zakończyła życie; alokacja pozostaje");
  expect(retained).not.toContain("Zwolniono pamięć");
  expect(retained).toContain("Jawne uchwyty Rc: 0 · Weak: 1");
  const released = renderToStaticMarkup(
    createElement(OwnershipVisualizer, { trace, index: 1, onChange: () => {} }),
  );
  expect(released).toContain("Zwolniono pamięć");
  expect(released).not.toContain("alokacja pozostaje");
});
