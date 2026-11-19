import { authorizationRecoverySteps } from "./counted-policy-recovery";
// Mixed scope: Rust operational data is MIT; original Polish teaching prose is CC BY 4.0.
import type {
  Competency,
  Concept,
  CourseModule,
  Lesson,
  LessonStep,
  Source,
} from "../domain/types";
import {
  authorizationOperations,
  authorizationOrdinaryReviews,
} from "./service-authorization-contracts";

export const serviceAuthorizationSources: Source[] = [];
export const serviceAuthorizationCompetencies: Competency[] = [
  {
    id: "service-scoped-authority-competency",
    title:
      "Sprawdzasz pełny zakres jednego grantu i osłabiasz go bez rozszerzania praw.",
  },
  {
    id: "service-bound-authorization-use-competency",
    title:
      "Wiążesz własne żądanie ze świadkiem i atomowo księgujesz przyjęcie.",
  },
];
export const serviceAuthorizationConcepts: Concept[] = [
  {
    id: "service-scoped-authority",
    title: "Zakres i osłabianie uprawnień",
    prerequisites: [
      "service-operations-bounded-admission",
      "visibility-boundaries",
    ],
    competencyIds: ["service-scoped-authority-competency"],
    reviewPrompt:
      "Co musi pokrywać jeden grant i kiedy wolno przyjąć jego ograniczenie?",
    reviewAnswer:
      "Jeden grant pokrywa podmiot, tenant, zasób, akcję i koszt. Ograniczenie zachowuje podmiot oraz tenant, zawęża zakres i akcje, a limit kosztu nie rośnie.",
    distinguish:
      "Grant jest polityką zaufanego gospodarza, nie dowodem tożsamości. Obliczenie child nie zmienia zainstalowanego parent.",
    evidenceArtifact: "rust-code",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
  },
  {
    id: "service-bound-authorization-use",
    title: "Związanie żądania i zużycie świadka",
    prerequisites: ["service-scoped-authority"],
    competencyIds: ["service-bound-authorization-use-competency"],
    reviewPrompt: "Co świadek zachowuje i kiedy księga może się zmienić?",
    reviewAnswer:
      "Świadek przejmuje dokładne żądanie i podmiot, zachowując pożyczkę authority. Przyjęcie zużywa świadka i zapisuje oba liczniki dopiero po wszystkich kontrolach.",
    distinguish:
      "Accepted oznacza przyjęcie do skończonej księgi, bez dowodu wykonania, trwałości lub dostarczenia. Ponowna autoryzacja jest możliwa.",
    evidenceArtifact: "rust-code",
    evidenceCalibration: { version: 2, minimumCodingTasks: 2 },
  },
];

type Operation = keyof typeof authorizationOperations;
const specs = [
  {
    operation: "policy",
    family: "exact-scope",
    gate: "authorization-exact-scope-gate",
    concept: 0,
    title: "Sprawdź dokładny zakres grantu",
    subtitle: "Jedna pełna reguła musi pokryć całe żądanie.",
    prerequisites: ["service-trust-admission", "module-visibility"],
    question:
      "Dwa granty mają osobno właściwy podmiot i właściwą akcję. Żaden nie pokrywa obu. Jaki wynik?",
    choices: [
      "NoMatchingGrant",
      "Ok po połączeniu pól",
      "TenantMismatch zawsze",
    ],
    trace:
      "Zaufany gospodarz ustawia G: subject1, tenant10, Tenant, Read+Append, max4. Principal ma subject1/tenant10. Koszt jest deklaracją, nie pomiarem pamięci ani CPU.\n\n| Żądanie | Wynik |\n| --- | --- |\n| tenant10/resource7, Append, cost4 | Ok |\n| tenant10/resource8, Read, cost0 | Ok |\n| tenant10/resource7, Append, cost5 | NoMatchingGrant |\n| tenant20/resource7, Append, cost4 | TenantMismatch |\n\nGrant innego podmiotu ani grant z innego tenanta nie dostarcza brakującego pola. Kolejność i duplikaty nie zmieniają wyniku.",
    task: "Zaimplementuj wyłącznie decide. Najpierw porównaj tenant podmiotu i zasobu. Następnie wymagaj jednego grantu pokrywającego subject, tenant, zakres, akcję i cost <= max_cost. Puste granty odmawiają; koszt zero i równość limitu są dozwolone. Nie składaj uprawnienia z różnych grantów.",
    reflection:
      "Wyjaśnij odmowę dla dwóch niepełnych grantów i dla tego samego ResourceId w innym tenancie. Kto instaluje granty? Ten model zakłada syntetyczne principal dostarczone przez gospodarza; nie uwierzytelnia żądania.",
    criteria: [
      "Wymagasz jednego pełnego grantu.",
      "Oddzielasz regułę polityki od pochodzenia tożsamości.",
    ],
  },
  {
    operation: "attenuation",
    family: "attenuation",
    gate: "authorization-attenuation-gate",
    concept: 0,
    title: "Osłab grant bez rozszerzenia praw",
    subtitle: "Zwróć dokładnie żądane ograniczenie albo WouldAmplify.",
    prerequisites: ["service-authorization-policy"],
    question:
      "Parent obejmuje resource7 i Append do kosztu4. Child żąda Tenant z tym samym limitem. Co zrobić?",
    choices: [
      "WouldAmplify",
      "Zwrócić parent po cichu",
      "Zezwolić, bo limit nie rośnie",
    ],
    trace:
      "Gospodarz ma parent subject1/tenant10, Tenant, Read+Append, max100. Child zachowuje podmiot i tenant, wybiera resource7, Append, max4. Osłabienie zwraca dokładnie child. Gospodarz tworzy osobny serwis z child i limitami accepted10/cost20.\n\n| Wejście / konfiguracja | Wynik |\n| child: resource7 Append cost4 | Accepted z oryginalnym payload |\n| child: resource8 Append cost4 | Denied(NoMatchingGrant), księga bez zmian |\n| child: resource7 Read cost4 | Denied(NoMatchingGrant), księga bez zmian |\n| child: resource7 Append cost5 | Denied(NoMatchingGrant), księga bez zmian |\n| próba rozszerzenia child do Tenant | WouldAmplify, nie instaluj |\n| osobny serwis nadal z parent: resource8 | Accepted |\n| ten serwis po jawnym replace_grants z child: resource8 | Denied(NoMatchingGrant) |\n\nSamo obliczenie child nie odwołuje parent. Pusty zbiór akcji odmawia wszystkiego; max0 z niepustymi akcjami może dopuścić koszt0. To osłabienie polityki, nie delegowanie innej tożsamości.",
    task: "Zaimplementuj wyłącznie attenuate. Zachowaj subject i tenant; akcje child mają być podzbiorem, max_cost nie może rosnąć. Tenant może przejść w jeden zasób, zasób tylko w ten sam zasób. Zwróć dokładnie requested albo WouldAmplify; nie przycinaj żądania i nie zwracaj parent zamiast child.",
    reflection:
      "Dlaczego obliczony child trzeba jawnie zainstalować? Podaj skutki pustych akcji i max0. Wskaż konkretną zmianę zasobu, która rozszerza uprawnienie mimo identycznego limitu kosztu.",
    criteria: [
      "Zwracasz dokładnie dozwolony child.",
      "Oddzielasz obliczenie ograniczenia od instalacji polityki.",
    ],
  },
  {
    operation: "binding",
    family: "request-binding",
    gate: "authorization-request-binding-gate",
    concept: 1,
    title: "Zwiąż dokładne żądanie z pożyczką",
    subtitle: "Przenieś dane bez zamiany podmiotu, payload ani zakresu.",
    prerequisites: ["service-authorization-attenuation"],
    question:
      "Zależność decide odmawia, ale dane da się przenieść do świadka. Jaki ma być wynik authorize?",
    choices: [
      "Ta sama odmowa, bez świadka",
      "Świadek z pustym payload",
      "Świadek domyślnego podmiotu",
    ],
    trace:
      "Tutaj decide to deterministyczny test double sprawdzający argumenty, nie rzeczywista polityka autoryzacji. Fixture przechowuje oczekiwany principal, Request i wynik; dokładne argumenty dostają ten wynik, inne NoMatchingGrant.\n\n| Argumenty i ustawienie test double | Wynik |\n| subject1/tenant10, resource7 Append cost4, line-α; Ok | świadek tych samych danych |\n| subject2/tenant20, resource9 Read cost3, nowy-β; Ok | świadek dokładnie nowych danych |\n| dokładne argumenty; TenantMismatch | TenantMismatch bez świadka |\n| zmieniony payload wobec oczekiwania | NoMatchingGrant |\n\nŚwiadek przechowuje &Authority oraz własne Request. Natywny pakiet osobno sprawdza prywatność, E0382 po użyciu przeniesionej wartości i E0502 przy aktualizacji authority przed późniejszym użyciem świadka. Ostatnie użycie, a nie sam koniec zakresu leksykalnego, wyznacza pożyczkę. Świadka można porzucić; późniejsza nowa autoryzacja jest dozwolona. Nie ma gwarancji globalnego zakazu powtórzenia ani rozproszonego odwołania.",
    task: "Zaimplementuj wyłącznie authorize: wywołaj zależność z dokładnym principal i pożyczką oryginalnego Request, propaguj odmowę i przenieś oryginalne wartości do Authorized z &self. Decide jest jawnie oznaczonym deterministycznym test double sprawdzającym argumenty. Nie dowodzi rzeczywistej polityki ani uwierzytelnienia; prywatność pełnego API sprawdza osobny pakiet.",
    reflection:
      "Wskaż, co sprawdza test double, a co natywny kompilator. Dlaczego rekonstrukcja z pustym payload zmienia kontrakt? Po ostatnim użyciu lub drop świadka można zmienić lokalną politykę; nie jest to odwołanie rozproszone ani gwarancja wygaśnięcia.",
    criteria: [
      "Przenosisz dokładne dane i propagujesz odmowę.",
      "Rozróżniasz test double, regułę polityki i kontrolę kompilatora.",
    ],
  },
  {
    operation: "admission",
    family: "consuming-admission",
    gate: "authorization-consuming-admission-gate",
    concept: 1,
    title: "Zużyj świadka przed zapisem księgi",
    subtitle: "Sprawdź oba nowe liczniki, potem zatwierdź oba naraz.",
    prerequisites: ["service-authorization-binding"],
    question:
      "Nowy accepted mieści się w limicie, ale charged_cost przekroczyłby budżet. Jaki stan zostaje?",
    choices: [
      "Oba liczniki bez zmian",
      "Accepted rośnie, koszt zostaje",
      "Koszt zawija się do zera",
    ],
    trace:
      "Świadek w tym modelu jest stałym wejściem testowym, bez dowodu wcześniejszej autoryzacji. Pełny pakiet osobno łączy politykę, własną authority serwisu i przyjęcie. Księga liczy przyjęte operacje; nie symuluje aktywnych połączeń ani zakończeń.\n\n| Stan / następne wejście | Wynik i stan |\n| accepting, (0,0), limits(2,4), cost4 | Accepted, (1,4) |\n| (1,4), cost1 | CostBudget, (1,4) |\n| (1,4), cost0 | Accepted, (2,4) |\n| (2,4), cost0 | Capacity, (2,4) |\n| closed | Closed, bez zmian |\n| accepted=MAX, limits MAX/MAX, cost0 | CounterOverflow, bez zmian |\n| charged=MAX, accepted0, limits MAX/MAX, cost1 | CounterOverflow, bez zmian |\n\nW pełnym serwisie denied request daje Denied przed kontrolą closed/full, a świadek innej authority nie jest wejściem publicznego submit. Accepted zachowuje dokładne dane; nie oznacza wykonania, zapisu trwałego ani dostarczenia.",
    task: "Zaimplementuj wyłącznie admit zużywające stały świadek testowy. Sprawdzaj kolejno accepting, checked accepted+1 i capacity, potem checked charged_cost+request.cost i budget. Overflow poprzedza odpowiedni limit. Dopiero po wszystkich kontrolach zapisz oba liczniki i zwróć Accepted z oryginalnymi danymi. Każda odmowa zachowuje oba liczniki. Ten model nie weryfikuje pochodzenia świadka.",
    reflection:
      "Dlaczego wcześniejszy zapis accepted łamie atomowość? Odróżnij Denied od Capacity i wyjaśnij równość budżetu oraz overflow. Jakie dalsze dowody byłyby potrzebne do stwierdzenia wykonania lub trwałości?",
    criteria: [
      "Każda odmowa zachowuje oba liczniki.",
      "Nie utożsamiasz Accepted z wykonaniem lub trwałością.",
    ],
  },
] as const;

function coding(
  operation: Operation,
  suffix: "apply" | "blank" | "recall",
  conceptId: string,
  family: string,
  task: string,
): LessonStep {
  const data = authorizationOperations[operation];
  return {
    id: `authorization-${operation}-${suffix}`,
    kind: suffix,
    title:
      suffix === "apply"
        ? "Zaimplementuj operację"
        : suffix === "blank"
          ? "Napisz samodzielnie od pustego edytora"
          : "Odtwórz z innymi danymi",
    prompt: `${task}\n\n${suffix === "blank" ? "Skopiuj poniższy minimalny szkielet i samodzielnie uzupełnij jedną operację. Pusty edytor jest aliasem tej samej rodziny, bez dodatkowego kredytu." : "Uzupełnij jedną operację w minimalnym modelu."}\n\n\`\`\`rust\n${data.promptScaffold}\n\`\`\``,
    code: suffix === "blank" ? "" : data.starter,
    solution: data.canonical,
    expectedStatus: "success",
    evaluator: {
      kind: "tests",
      tests: suffix === "recall" ? data.recallTests : data.tests,
    },
    evidence: {
      version: 2,
      conceptIds: [conceptId],
      codingTaskId: `service-authorization/${family}-v1`,
    },
    evidenceKind: suffix === "recall" ? "recall" : "transfer",
    ...(suffix === "recall" ? {} : { evidenceGate: true }),
  };
}
export const serviceAuthorizationLessons: Lesson[] = specs.map((spec) => {
  const conceptId = serviceAuthorizationConcepts[spec.concept].id;
  return {
    id: `service-authorization-${spec.operation}`,
    moduleId: "service-authorization",
    conceptIds: [conceptId],
    competencyIds: [serviceAuthorizationCompetencies[spec.concept].id],
    prerequisites: [...spec.prerequisites],
    title: spec.title,
    subtitle: spec.subtitle,
    outcomes: [...spec.criteria],
    steps: [
      {
        id: `authorization-${spec.operation}-predict`,
        kind: "predict",
        title: "Przewidź wynik",
        prompt: spec.question,
        choices: spec.choices.map((label, i) => ({ id: String(i), label })),
        evaluator: {
          kind: "choice",
          correct: "0",
          explanations: {
            "0": "Tak. Zachowaj dokładnie opisaną granicę kontraktu.",
            "1": "To narusza warunek opisanej operacji.",
            "2": "Ten wynik nie wynika z podanych danych.",
          },
        },
        evidenceKind: "prediction",
        evidence: { version: 2, conceptIds: [conceptId] },
      },
      {
        id: `authorization-${spec.operation}-model`,
        kind: "observe",
        title: "Prześledź dane i wynik",
        prompt: spec.trace,
        evaluator: {
          kind: "answer",
          accepted: ["Prześledzony model"],
          feedback: "Porównaj niezmienniki z literalnymi wynikami tabeli.",
        },
        evidenceKind: "exposure",
        evidence: { version: 2, conceptIds: [conceptId] },
      },
      coding(spec.operation, "apply", conceptId, spec.family, spec.task),
      coding(spec.operation, "blank", conceptId, spec.family, spec.task),
      coding(spec.operation, "recall", conceptId, spec.family, spec.task),
      {
        id: `authorization-${spec.operation}-reflect`,
        kind: "assessment",
        title: "Wyjaśnij granicę i ograniczenie",
        prompt: spec.reflection,
        evaluator: { kind: "rubric", criteria: [...spec.criteria] },
        rubric: [...spec.criteria],
        evidenceKind: "self-rating",
        evidence: { version: 2, conceptIds: [conceptId] },
      },
      authorizationRecoverySteps[spec.operation],
    ],
    misconceptions: [
      "Syntetyczny principal dowodzi tożsamości.",
      "Zaliczenie modelu dowodzi bezpieczeństwa wdrożenia.",
    ],
    transferTask: spec.reflection,
    evidenceGate:
      "Apply i blank to ta sama rodzina. Osobna operacja dostarcza drugiej rodziny pojęcia; recall nie daje nowej rodziny.",
    sourceIds:
      spec.concept === 0
        ? ["service-operations-enums", "service-operations-testing"]
        : [
            "cargo-reference-visibility",
            "rust-book-ownership",
            "service-operations-testing",
          ],
  };
});

export const serviceAuthorizationReviewExercises: Record<string, LessonStep> =
  Object.fromEntries(
    [
      ["service-scoped-authority", "scopedAuthority", "attenuation"],
      ["service-bound-authorization-use", "boundUse", "consuming-admission"],
    ].map(([concept, key, family]) => {
      const data =
        authorizationOrdinaryReviews[
          key as keyof typeof authorizationOrdinaryReviews
        ];
      return [
        concept,
        {
          id: `review-${concept}`,
          kind: "recall",
          title: "Powtórka: jedna operacja",
          prompt: `Skopiuj minimalny szkielet i odtwórz operację dla innych danych: subject2, tenant20, resource9, cost3. To zwykła powtórka, bez nowej rodziny głównej. ${key === "boundUse" ? "Świadek jest stałym wejściem testowym; model nie dowodzi autoryzacji." : "Zachowaj dokładnie żądane ograniczenie bez rozszerzenia praw."}\n\n\`\`\`rust\n${data.promptScaffold}\n\`\`\``,
          code: "",
          solution: data.canonical,
          evaluator: { kind: "tests", tests: data.tests },
          expectedStatus: "success",
          evidenceKind: "recall",
          evidence: {
            version: 2,
            conceptIds: [concept],
            codingTaskId: `service-authorization/${family}-v1`,
          },
        },
      ];
    }),
  );
export const serviceAuthorizationModule: CourseModule = {
  id: "service-authorization",
  title: "Zakres autoryzacji i związane żądanie",
  whyItMatters:
    "Jawna polityka i własność pomagają zachować granicę między odmową a przyjęciem.",
  capabilities: serviceAuthorizationCompetencies.map((item) => item.title),
  prerequisites: ["service-operations"],
  lessonIds: serviceAuthorizationLessons.map((lesson) => lesson.id),
  exitGate: [
    "Sprawdzasz pełny grant i monotoniczne ograniczenie.",
    "Zachowujesz dokładne dane i atomową księgę.",
  ],
  projectConnection:
    "Osobny pakiet natywny składa cztery operacje i sprawdza kompilatorem prywatność oraz pożyczki. Modele lekcji sprawdzają po jednej operacji.",
  assessmentId: "authorization-admission-blank",
  gateCriteria: specs.map((spec) => ({
    id: spec.gate,
    label: spec.criteria[0],
    taskRefs: [
      ...["apply", "blank"].map((suffix) => ({
        lessonId: `service-authorization-${spec.operation}`,
        stepId: `authorization-${spec.operation}-${suffix}`,
      })),
      {
        lessonId: `service-authorization-${spec.operation}`,
        stepId: authorizationRecoverySteps[spec.operation].id,
      },
    ],
    requiredIndependentCodingTasks: 1,
  })),
};
