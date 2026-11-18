import type { ProjectContract, ProjectInstructionCard } from "@/domain/types";
import {
  STUDY_SESSION_PROJECT_ID,
  studySessionNoteFields,
} from "@/domain/study-session-practice";
import { useLearning } from "./learning-provider";
import { LearningText } from "./learning-text";
import { Eyebrow } from "./ui";

function InstructionBody({ card }: { card: ProjectInstructionCard }) {
  return (
    <>
      {card.summary && (
        <p>
          <LearningText>{card.summary}</LearningText>
        </p>
      )}
      <ol>
        {card.points.map((point) => (
          <li key={point}>
            <LearningText>{point}</LearningText>
          </li>
        ))}
      </ol>
    </>
  );
}

function StudySessionNotes({ stage }: { stage: "first" | "change" }) {
  const { state, update } = useLearning();
  return studySessionNoteFields
    .filter((field) => field.stage === stage)
    .map((field) => (
      <div className="study-session-note" key={field.key}>
        <label htmlFor={field.key}>{field.label}</label>
        <p className="footnote" id={`${field.key}-guidance`}>
          {field.guidance}
        </p>
        <textarea
          id={field.key}
          aria-describedby={`${field.key}-guidance`}
          value={state.notes[field.key] ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            update((current) => ({
              ...current,
              notes: { ...current.notes, [field.key]: value },
            }));
          }}
        />
      </div>
    ));
}

/** Both entry points render the same authored contract and durable notes. */
export function LearnerInstruction({ project }: { project: ProjectContract }) {
  const card = project.learnerInstruction;
  if (!card) return null;
  const isStudySession = project.id === STUDY_SESSION_PROJECT_ID;
  return (
    <section
      className="project-package learner-instruction"
      aria-labelledby={`project-instruction-${project.id}`}
    >
      <Eyebrow>PRACA WŁASNA</Eyebrow>
      <h2 id={`project-instruction-${project.id}`}>{card.title}</h2>
      <InstructionBody card={card} />
      {isStudySession && (
        <section aria-label="Pierwsza wersja Study Session CLI">
          <h3>Pierwsza wersja — materiał do przeglądu</h3>
          <p>
            Do samooceny lub przeglądu zewnętrznego przygotuj własny projekt
            Cargo: Cargo.toml, źródła i testy. Dołącz poniższe uzasadnienie,
            własny test i rzeczywiste wyniki CLI. Wskaż, gdzie znajduje się
            oceniana wersja kodu, aby dało się powiązać z nią wyniki.
          </p>
          <p>
            Uruchom CLI we własnym środowisku. Tutaj zapisujesz swoją relację
            z pracy. Znajdziesz ją również w Notatniku. Jeśli prosisz kogoś
            o recenzję, przekaż tej osobie kod, testy i wyniki.
          </p>
          <StudySessionNotes stage="first" />
        </section>
      )}
      {card.followUp && (
        <details className="learner-instruction-followup">
          <summary>
            <LearningText>{card.followUp.title}</LearningText>
          </summary>
          <InstructionBody card={card.followUp} />
          {isStudySession && (
            <>
              <p>
                Najpierw udokumentuj samoocenę lub przegląd pierwszej wersji.
                Następnie przekaż zmienione źródła i testy, wyniki regresji oraz
                opis tego, co pozostało do sprawdzenia.
              </p>
              <StudySessionNotes stage="change" />
            </>
          )}
        </details>
      )}
    </section>
  );
}
