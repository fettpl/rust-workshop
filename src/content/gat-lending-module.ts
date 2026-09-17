import type { CourseModule } from "../domain/types";

const criteria = [
  [
    "gat-receiver-borrows",
    "Udostępniasz element powiązany z bieżącą pożyczką producenta i zachowujesz jego własność danych.",
  ],
  [
    "gat-overlapping-mutable-windows",
    "Mutujesz nakładające się widoki kolejno, z jawną granicą szerokości i wyczerpania.",
  ],
  [
    "gat-item-capabilities",
    "Korzystasz z możliwości zadeklarowanych przy GAT bez zbędnego wymagania 'static.",
  ],
  [
    "gat-owned-iterator-adapters",
    "Kończysz pożyczkę wewnątrz next i zwracasz posiadany raport, zachowując leniwe odpytywanie źródła.",
  ],
] as const;

export const gatLendingModule: CourseModule = {
  id: "gat-lending-iterators",
  title: "GAT i lending iterators: pożyczone elementy",
  whyItMatters:
    "Czasem wynik musi żyć tylko tak długo, jak bieżąca pożyczka producenta. Zaprojektujesz takie API, bezpiecznie zmienisz nakładające się fragmenty danych i zamienisz krótkie widoki na własne raporty.",
  capabilities: [
    "Odróżnisz lifetime przechowywanych danych od lifetime elementu zwróconego przez next.",
    "Zaimplementujesz sekwencyjne nakładające się okna bez unsafe i klonowania danych.",
    "Zadeklarujesz możliwości elementu w GAT i użyjesz ich z lokalnymi danymi.",
    "Połączysz źródło pożyczanych elementów ze zwykłym iteratorem posiadanych wyników.",
  ],
  prerequisites: ["borrowed-callbacks", "iterators"],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Rozwiążesz cztery kontrakty sprawdzające pożyczki, mutację, zatrzymanie i liczbę odpytań źródła.",
    "Po podglądzie rozwiązania pozostaje niezależne zadanie od pustej kartki. Powtórki wymagają kodu dla kolejnego kontraktu.",
  ],
  projectConnection:
    "Krótkie widoki przydają się przy przetwarzaniu buforów i rekordów. Moduł ćwiczy bezpieczne API w standardowej bibliotece; async lending, abstrakcje unsafe i pomiary wydajności wymagają dalszych ćwiczeń.",
  assessmentId: "gat-owned-iterator-adapters/gat-owned-iterator-adapters-blank",
  gateCriteria: criteria.map(([id, label]) => ({
    id: `${id}-contract`,
    label,
    taskRefs: [
      { lessonId: id, stepId: `${id}-gate` },
      { lessonId: id, stepId: `${id}-blank` },
    ],
  })),
};
