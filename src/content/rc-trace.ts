import type { Trace, TraceFrame } from "../domain/types";

const first: TraceFrame["stack"][number] = {
  name: "first",
  value: "Rc → A",
  state: "owner",
};
const second: TraceFrame["stack"][number] = {
  name: "second",
  value: "Rc → A",
  state: "owner",
};
const observer: TraceFrame["stack"][number] = {
  name: "observer",
  value: "Weak → A",
  state: "weak",
};
const allocation = (
  strongHandles: number,
  weakHandles: number,
  owner: string,
  valueDropped = false,
  dropped = false,
): TraceFrame["heap"] => [
  {
    id: "A — alokacja Rc",
    value: "7_u32",
    owner,
    strongHandles,
    weakHandles,
    valueDropped,
    dropped,
  },
];

export const rcLifetimeTrace: Trace = {
  title: "Rc i Weak: życie wartości oraz alokacji",
  code: `use std::rc::Rc;
let first = Rc::new(7_u32);
let observer = Rc::downgrade(&first);
let second = Rc::clone(&first);
drop(first);
drop(second);
assert!(observer.upgrade().is_none());
drop(observer);`,
  frames: [
    {
      line: 2,
      explanation:
        "first jest jedynym właścicielem wartości 7. Model pokazuje jedną alokację Rc i uchwyty, bez obietnicy fizycznego miejsca przechowywania zmiennych.",
      stack: [first],
      heap: allocation(1, 0, "first"),
    },
    {
      line: 3,
      explanation:
        "downgrade tworzy słaby uchwyt. Nie dodaje właściciela wartości. Liczymy tylko jawne uchwyty Rc i Weak w tym przykładzie, nie wewnętrzny stan alokatora.",
      stack: [first, observer],
      heap: allocation(1, 1, "first"),
    },
    {
      line: 4,
      explanation:
        "Rc::clone dodaje drugiego właściciela tej samej wartości. Nie powstaje druga alokacja z kopią liczby.",
      stack: [first, observer, second],
      heap: allocation(2, 1, "first i second"),
    },
    {
      line: 5,
      explanation:
        "drop(first) usuwa jeden silny uchwyt. second nadal utrzymuje wartość przy życiu.",
      stack: [{ ...first, state: "dropped" }, observer, second],
      heap: allocation(1, 1, "second"),
    },
    {
      line: 6,
      explanation:
        "Znika ostatni Rc: życie wartości kończy się. observer nadal utrzymuje alokację, ale nie wartość. To różne momenty. Widoczne liczby oznaczają uchwyty w modelu, nie wynik Weak::weak_count po zniknięciu ostatniego właściciela.",
      stack: [
        { ...first, state: "dropped" },
        observer,
        { ...second, state: "dropped" },
      ],
      heap: allocation(0, 1, "brak", true),
    },
    {
      line: 7,
      explanation:
        "upgrade zwraca None. Nie można odzyskać wartości ani utworzyć nowego Rc z tego Weak, mimo że alokacja jeszcze pozostaje.",
      stack: [observer],
      heap: allocation(0, 1, "brak", true),
    },
    {
      line: 8,
      explanation:
        "Znika ostatni Weak. Nie ma już ani wartości, ani uchwytów utrzymujących jej dawną alokację: pamięć może zostać zwolniona.",
      stack: [{ ...observer, state: "dropped" }],
      heap: allocation(0, 0, "brak", true, true),
    },
  ],
};
