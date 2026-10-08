import type { CourseModule } from "../domain/types";

const criteria = [
  [
    "async-lending-receiver",
    "Utrzymujesz borrowed result przez Pending, zachowujesz dane i commitujesz dopiero po ukończeniu pracy.",
  ],
  [
    "async-lending-callbacks",
    "Uruchamiasz sekwencyjny AsyncFnMut dla lokalnej pożyczki i zatrzymujesz się po błędzie.",
  ],
  [
    "async-lending-cancel-commit",
    "Rozdzielasz received, callback completion i cursor commit oraz opisujesz trwałe efekty anulowania.",
  ],
  [
    "async-lending-send-boundary",
    "Rozróżniasz Send właściciela, Send future i 'static wymagane przez tokio::spawn.",
  ],
  [
    "async-lending-dyn-adapter",
    "Wybierasz static lending albo jawny boxed adapter z lokalnym lifetime i opisanym kosztem.",
  ],
] as const;

export const asyncLendingModule: CourseModule = {
  id: "async-lending-contracts",
  title: "Async lending: pożyczone futures i granice dispatchu",
  whyItMatters:
    "Zaawansowane API async musi odpowiedzieć, kto posiada dane podczas Pending, jak długo żyje pożyczka i kiedy postęp staje się trwały. Ten moduł prowadzi od borrowed callbacku do owned future wysłanego do zadania.",
  capabilities: [
    "Utrzymasz borrowed wynik związany z wywołaniem przez kontrolowane Pending -> Ready.",
    "Uruchomisz sekwencyjny AsyncFnMut, którego future pożycza argument lub stan callbacku.",
    "Oddzielisz anulowanie przed commit od ukończonego commit i jego efektów.",
    "Sprawdzisz granicę Send + 'static dla owned future oraz ograniczenia dyn compatibility.",
  ],
  prerequisites: [
    "async-foundations",
    "borrowed-callbacks",
    "gat-lending-iterators",
  ],
  lessonIds: criteria.map(([id]) => id),
  exitGate: [
    "Rozwiążesz pięć kontraktów; gate i blank pozostają alternatywnymi formami tej samej rodziny, a receiver ma dodatkowe zadanie bounded batch z odrębną rodziną primary.",
    "Powtórka jest osobnym ćwiczeniem recall; nie tworzy nowej rodziny primary ani drugiego niezależnego zadania.",
    "Liczba rodzin primary wynika z opisu danego kontraktu. Pomoc i wyczerpanie rodziny nie otwierają nowej wersji kontraktu, a receiver może mieć dodatkową rodzinę bounded batch.",
  ],
  projectConnection:
    "Kontrakty są użyte w rozszerzeniu tokio-service-workshop: lokalny visitor pozostaje sekwencyjny, a owned producer może zostać wysłany do Tokio. Pakiet dokumentuje koszt boxed adaptera i ograniczenia rollbacku.",
  assessmentId: "async-lending-dyn-adapter/async-lending-dyn-adapter-blank",
  gateCriteria: criteria.map(([id, label]) => ({
    id: `${id}-contract`,
    label,
    requiredIndependentCodingTasks: 1,
    taskRefs: [
      { lessonId: id, stepId: `${id}-gate` },
      { lessonId: id, stepId: `${id}-blank` },
      ...(id === "async-lending-receiver"
        ? [
            {
              lessonId: id,
              stepId: "async-lending-receiver-bounded-batch",
            },
          ]
        : []),
    ],
  })),
};
