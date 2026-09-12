"use client";
import { ArrowLeft, ArrowRight, Layers, Database } from "lucide-react";
import type { Trace } from "@/domain/types";
const labels = {
  owner: "właściciel",
  copied: "niezależna kopia",
  moved: "przeniesiono",
  shared: "współdzielone &",
  mutable: "wyłączne &mut",
  dropped: "koniec zakresu",
};
export function OwnershipVisualizer({
  trace,
  index,
  onChange,
}: {
  trace: Trace;
  index: number;
  onChange: (n: number) => void;
}) {
  const current = Math.min(index, trace.frames.length - 1);
  const frame = trace.frames[current];
  return (
    <section className="visualizer">
      <header>
        <span className="micro">MODEL PAMIĘCI</span>
        <h2>{trace.title}</h2>
        <p className="footnote">
          Model dydaktyczny przygotowanego przykładu; nie śledzi zmian w
          edytorze.
        </p>
      </header>
      <div className="trace-code">
        {trace.code.split("\n").map((line, i) => (
          <div key={i} className={i + 1 === frame.line ? "active-line" : ""}>
            <span>{i + 1}</span>
            <code>{line || " "}</code>
          </div>
        ))}
      </div>
      <div className="memory-state">
        <div className="stack-region">
          <h3>
            <Layers size={15} />
            Stack / zmienne
          </h3>
          {frame.stack.length === 0 ? (
            <p className="muted">Brak aktywnych zmiennych</p>
          ) : (
            frame.stack.map((item, i) => (
              <div
                key={item.name + i}
                className={`memory-variable ${item.state}`}
              >
                <code>{item.name}</code>
                <code>{item.value}</code>
                <span>{labels[item.state]}</span>
              </div>
            ))
          )}
        </div>
        <div className="heap-region">
          <h3>
            <Database size={15} />
            Heap / wartości
          </h3>
          {frame.heap.length === 0 ? (
            <p className="muted">Brak alokacji na heap</p>
          ) : (
            frame.heap.map((item) => (
              <div
                key={item.id}
                className={`heap-value ${item.dropped ? "dropped" : ""}`}
              >
                <span>{item.id}</span>
                <code>{item.value}</code>
                <small>
                  {item.dropped
                    ? "Zwolniono pamięć"
                    : `Właściciel: ${item.owner}`}
                </small>
              </div>
            ))
          )}
        </div>
      </div>
      <p className="trace-explanation" role="status">
        {frame.explanation}
      </p>
      <div className="trace-controls">
        <button
          className="secondary"
          disabled={current === 0}
          onClick={() => onChange(current - 1)}
        >
          <ArrowLeft size={15} />
          Wstecz
        </button>
        <span className="micro">
          {current + 1} / {trace.frames.length}
        </span>
        <button
          className="secondary"
          disabled={current === trace.frames.length - 1}
          onClick={() => onChange(current + 1)}
        >
          Następna linia
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
