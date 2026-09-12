import type { Lesson, LessonStep } from "@/domain/types";

const demo = `use std::future::{poll_fn, Future};
use std::sync::{Arc, Mutex};
use std::task::{Context, Poll, Wake, Waker};

struct Signal(Arc<Mutex<Vec<&'static str>>>);
impl Wake for Signal {
    fn wake(self: Arc<Self>) { self.0.lock().unwrap().push("wake"); }
}
struct Lease(Arc<Mutex<Vec<&'static str>>>);
impl Drop for Lease {
    fn drop(&mut self) { self.0.lock().unwrap().push("drop"); }
}
fn main() {
    let events = Arc::new(Mutex::new(Vec::new()));
    let lease = Lease(Arc::clone(&events));
    let log = Arc::clone(&events);
    let mut work = Box::pin(async move {
        let _lease = lease;
        log.lock().unwrap().push("start");
        let mut yielded = false;
        poll_fn(|cx| {
            if yielded { return Poll::Ready(()); }
            yielded = true;
            cx.waker().wake_by_ref();
            Poll::Pending
        }).await;
        log.lock().unwrap().push("finish");
    });
    let waker: Waker = Arc::new(Signal(Arc::clone(&events))).into();
    let mut cx = Context::from_waker(&waker);
    println!("{:?}", work.as_mut().poll(&mut cx));
    drop(work);
    println!("{:?}", events.lock().unwrap());
}`;

// All probes are trusted test fixtures. Manual polls are finite observations,
// never a local executor for learner or imported source.
const probes = `
use std::future::Future;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::task::{Context, Poll, Wake, Waker};

#[derive(Default)]
struct Life {
    polls: AtomicUsize,
    drops: AtomicUsize,
    effects: Mutex<Vec<&'static str>>,
}
#[derive(Default)]
struct Bell(AtomicUsize);
impl Wake for Bell {
    fn wake(self: Arc<Self>) { self.0.fetch_add(1, Ordering::SeqCst); }
}
struct Job {
    life: Arc<Life>,
    value: std::cell::RefCell<Option<String>>,
    pending_once: std::cell::Cell<bool>,
    _pin: std::marker::PhantomPinned,
}
impl Job {
    fn new(life: &Arc<Life>, value: &str, pending_once: bool) -> Self {
        Self { life: Arc::clone(life), value: std::cell::RefCell::new(Some(value.to_owned())), pending_once: std::cell::Cell::new(pending_once), _pin: std::marker::PhantomPinned }
    }
}
impl Future for Job {
    type Output = String;
    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<String> {
        self.life.polls.fetch_add(1, Ordering::SeqCst);
        assert!(self.value.borrow().is_some(), "must not repoll after Ready");
        if self.pending_once.replace(false) {
            self.life.effects.lock().unwrap().push("checkpoint");
            cx.waker().wake_by_ref();
            Poll::Pending
        } else {
            self.life.effects.lock().unwrap().push("finish");
            Poll::Ready(self.value.borrow_mut().take().unwrap())
        }
    }
}
impl Drop for Job {
    fn drop(&mut self) { self.life.drops.fetch_add(1, Ordering::SeqCst); }
}
`;

const cancelTests = `${probes}
#[test]
fn cancel_pending_drops_owned_job_without_rollback_or_second_poll() {
    let life = Arc::new(Life::default());
    let bell = Arc::new(Bell::default());
    let waker = Waker::from(Arc::clone(&bell));
    let mut cx = Context::from_waker(&waker);
    assert_eq!(cancel_after_first_poll(Job::new(&life, "żółć", true), &mut cx), Poll::Pending);
    assert_eq!(life.polls.load(Ordering::SeqCst), 1);
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
    assert!(bell.0.load(Ordering::SeqCst) > 0, "forward the supplied Context");
    assert_eq!(*life.effects.lock().unwrap(), vec!["checkpoint"]);
}
#[test]
fn ready_is_returned_without_polling_again_and_without_losing_owned_output() {
    for text in ["", "zażółć", "0"] {
        let life = Arc::new(Life::default());
        let waker = Waker::from(Arc::new(Bell::default()));
        let mut cx = Context::from_waker(&waker);
        assert_eq!(cancel_after_first_poll(Job::new(&life, text, false), &mut cx), Poll::Ready(text.to_owned()));
        assert_eq!(life.polls.load(Ordering::SeqCst), 1);
        assert_eq!(life.drops.load(Ordering::SeqCst), 1);
        assert_eq!(*life.effects.lock().unwrap(), vec!["finish"]);
    }
}`;

const cancelStarter = `use std::future::Future;
use std::task::{Context, Poll};

fn cancel_after_first_poll<F: Future>(future: F, cx: &mut Context<'_>) -> Poll<F::Output> {
    let _ = (future, cx);
    Poll::Pending
}`;
const cancelSolution = `use std::future::Future;
use std::task::{Context, Poll};

fn cancel_after_first_poll<F: Future>(future: F, cx: &mut Context<'_>) -> Poll<F::Output> {
    let mut future = Box::pin(future);
    future.as_mut().poll(cx)
}`;

const slotSolution = `use std::future::Future;
use std::pin::Pin;

fn cancel_slot<F: Future>(slot: &mut Option<Pin<Box<F>>>, cancel: bool) -> bool {
    if cancel { slot.take().is_some() } else { false }
}`;
const slotTests = `${probes}
#[test]
fn keep_preserves_identity_and_unpolled_cancellation_is_idempotent() {
    let life = Arc::new(Life::default());
    let mut slot = Some(Box::pin(Job::new(&life, "owned", true)));
    let before = std::ptr::from_ref(slot.as_ref().unwrap().as_ref().get_ref());
    assert!(!cancel_slot(&mut slot, false));
    assert_eq!(std::ptr::from_ref(slot.as_ref().unwrap().as_ref().get_ref()), before);
    assert_eq!(life.polls.load(Ordering::SeqCst), 0);
    assert_eq!(life.drops.load(Ordering::SeqCst), 0);
    assert!(cancel_slot(&mut slot, true));
    assert!(slot.is_none());
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
    assert_eq!(life.polls.load(Ordering::SeqCst), 0);
    assert!(!cancel_slot(&mut slot, true));
    assert!(!cancel_slot(&mut slot, false));
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
}
#[test]
fn cancelling_pending_keeps_checkpoint_and_never_runs_finish() {
    let life = Arc::new(Life::default());
    let bell = Arc::new(Bell::default());
    let waker = Waker::from(Arc::clone(&bell));
    let mut cx = Context::from_waker(&waker);
    let mut slot = Some(Box::pin(Job::new(&life, "pending", true)));
    assert!(slot.as_mut().unwrap().as_mut().poll(&mut cx).is_pending());
    assert!(bell.0.load(Ordering::SeqCst) > 0);
    assert!(!cancel_slot(&mut slot, false));
    assert_eq!(life.drops.load(Ordering::SeqCst), 0);
    assert!(cancel_slot(&mut slot, true));
    assert!(slot.is_none());
    assert_eq!(life.polls.load(Ordering::SeqCst), 1);
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
    assert_eq!(*life.effects.lock().unwrap(), vec!["checkpoint"]);
}`;

const reviewTests = `${probes}
#[test]
fn retains_pending_then_takes_ready_and_never_repolls_finished_job() {
    let life = Arc::new(Life::default());
    let bell = Arc::new(Bell::default());
    let waker = Waker::from(Arc::clone(&bell));
    let mut cx = Context::from_waker(&waker);
    let mut slot = Some(Box::pin(Job::new(&life, "zażółć", true)));
    assert_eq!(try_finish(&mut slot, &mut cx), None);
    assert!(slot.is_some());
    assert_eq!(life.polls.load(Ordering::SeqCst), 1);
    assert_eq!(life.drops.load(Ordering::SeqCst), 0);
    assert!(bell.0.load(Ordering::SeqCst) > 0);
    assert_eq!(try_finish(&mut slot, &mut cx), Some("zażółć".to_owned()));
    assert!(slot.is_none());
    assert_eq!(life.polls.load(Ordering::SeqCst), 2);
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
    assert_eq!(try_finish(&mut slot, &mut cx), None);
    assert_eq!(life.polls.load(Ordering::SeqCst), 2);
    assert_eq!(*life.effects.lock().unwrap(), vec!["checkpoint", "finish"]);
}
#[test]
fn handles_empty_slot_and_immediately_ready_empty_output() {
    let life = Arc::new(Life::default());
    let waker = Waker::from(Arc::new(Bell::default()));
    let mut cx = Context::from_waker(&waker);
    let mut slot: Option<Pin<Box<Job>>> = None;
    assert_eq!(try_finish(&mut slot, &mut cx), None);
    slot = Some(Box::pin(Job::new(&life, "", false)));
    assert_eq!(try_finish(&mut slot, &mut cx), Some(String::new()));
    assert!(slot.is_none());
    assert_eq!(life.polls.load(Ordering::SeqCst), 1);
    assert_eq!(life.drops.load(Ordering::SeqCst), 1);
}`;

export const asyncCancellationReview: LessonStep = {
  id: "review-future-cancellation",
  kind: "apply",
  title: "Powtórka: zachowaj Pending, odbierz Ready",
  prompt:
    "Tym razem operacja ma przetrwać Pending. Uzupełnij try_finish: pusty slot daje None bez poll; zajęty wykonuje najwyżej jeden poll z przekazanym Context. Pending zachowuje tę samą przyszłość i daje None. Ready zwraca Some(wynik), usuwa przyszłość ze slotu i niszczy ją. Kolejne wywołanie nie może pollować zakończonej przyszłości. Test wykonuje drugą próbę po sprawdzeniu żądania wake, potem sprawdza pusty slot. To sterowana obserwacja cyklu życia, nie executor.",
  code: `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

fn try_finish<F: Future>(slot: &mut Option<Pin<Box<F>>>, cx: &mut Context<'_>) -> Option<F::Output> {
    let _ = (slot, cx);
    None
}`,
  solution: `use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

fn try_finish<F: Future>(slot: &mut Option<Pin<Box<F>>>, cx: &mut Context<'_>) -> Option<F::Output> {
    match slot.as_mut()?.as_mut().poll(cx) {
        Poll::Pending => None,
        Poll::Ready(value) => {
            slot.take();
            Some(value)
        }
    }
}`,
  evaluator: {
    kind: "tests",
    tests: reviewTests,
    forbiddenPatterns: ["unsafe", "block_on", "thread::sleep"],
  },
  expectedStatus: "success",
  hints: [
    "None dla wyniku może oznaczać pusty slot albo Pending. Tylko jeden z tych stanów ma nadal posiadać przyszłość.",
    "Po Ready odbierz wynik i opróżnij slot; po Pending nie zabieraj jego zawartości.",
  ],
  evidenceKind: "transfer",
};

export const asyncCancellationLesson: Lesson = {
  id: "future-cancellation",
  moduleId: "async-foundations",
  conceptIds: ["future-cancellation"],
  competencyIds: ["design-cancellation-contracts"],
  prerequisites: ["future-ownership"],
  title: "Anulowanie przez Drop future",
  subtitle:
    "Zobacz, co zostaje po przerwaniu pracy, i zaprojektuj własność operacji, którą można zachować lub porzucić.",
  minutes: 20,
  outcomes: [
    "Rozdzielisz wcześniejszy efekt od kodu po przerwanym await.",
    "Zwolnisz przechowywany stan future także przed pierwszym poll.",
    "Odróżnisz porzucenie future od anulowania niezależnego zadania.",
  ],
  steps: [
    {
      id: "future-cancellation-predict",
      kind: "predict",
      title: "Co zostaje po przerwaniu?",
      prompt:
        "Prześledź kod przed uruchomieniem. Po pierwszym Pending niszczymy właściciela work. Które zdarzenia zostaną zapisane? Signal zapisuje wake, gdy przyszłość prosi o następny poll.",
      code: demo,
      solution: demo,
      expectedStatus: "success",
      choices: [
        {
          id: "rollback",
          label: "Tylko drop: wcześniejszy efekt zostanie cofnięty",
        },
        { id: "cancel", label: "start, wake, drop — bez finish" },
        { id: "finish", label: "start, wake, finish, drop" },
      ],
      evaluator: {
        kind: "choice",
        correct: "cancel",
        explanations: {
          rollback: "Drop nie cofa zapisu start.",
          cancel:
            "Budzenie prosi o możliwość dalszego poll; właściciel może zamiast tego porzucić przyszłość. Lease zostanie zniszczony.",
          finish: "Kod po Pending nie wykona się bez dalszego postępu future.",
        },
      },
      evidenceKind: "prediction",
    },
    {
      id: "future-cancellation-run",
      kind: "run",
      title: "Zobacz efekt, wake i Drop",
      prompt:
        "Uruchom ten sam przykład. Skończona obserwacja obejmuje jeden poll; nie ma pętli oczekiwania. Drop usuwa Lease przechowywany przez async, ale pozostawia wpis start we współdzielonym logu.",
      code: demo,
      solution: demo,
      expectedStatus: "success",
      evaluator: {
        kind: "exact-output",
        expected: 'Pending\n["start", "wake", "drop"]\n',
      },
      evidenceKind: "exposure",
    },
    {
      id: "future-cancellation-independent",
      kind: "explain",
      title: "Kto naprawdę posiada pracę?",
      prompt:
        "Future może tylko oczekiwać na wynik pracy uruchomionej gdzie indziej. Co gwarantuje porzucenie takiego uchwytu?",
      choices: [
        {
          id: "local",
          label:
            "Zniszczenie własnego stanu uchwytu; zatrzymanie niezależnej pracy zależy od jej kontraktu",
        },
        {
          id: "all",
          label: "Zatrzymanie wszystkich zadań, na które uchwyt oczekiwał",
        },
        {
          id: "undo",
          label: "Cofnięcie wcześniejszych zapisów niezależnej pracy",
        },
      ],
      evaluator: {
        kind: "choice",
        correct: "local",
        explanations: {
          local:
            "Własność uchwytu i własność niezależnego zadania to osobne granice. Tokio pokaże je na JoinHandle.",
          all: "Samo Future nie narzuca protokołu zatrzymania pracy zewnętrznej.",
          undo: "Anulowanie nie jest rollbackiem.",
        },
      },
      evidenceKind: "exposure",
    },
    {
      id: "future-cancellation-drop-gate",
      kind: "debug",
      title: "Jedna próba i koniec własności",
      prompt:
        "Napraw cancel_after_first_poll: przejmuje dowolny Future, bezpiecznie przypina go i wykonuje dokładnie jeden poll z dostarczonym Context. Zwraca jego Poll i niszczy przyszłość przed powrotem, zarówno po Pending, jak i Ready. Wynik może nie być Copy; przyszłość może nie być Unpin. To jawny kontrakt jednorazowej próby, a nie sposób oczekiwania na wynik.",
      code: cancelStarter,
      solution: cancelSolution,
      expectedStatus: "success",
      evaluator: {
        kind: "tests",
        tests: cancelTests,
        forbiddenPatterns: ["unsafe", "block_on", "thread::sleep"],
      },
      hints: [
        "Zwrócenie Pending bez wywołania poll pomija nawet pierwszy efekt operacji.",
        "Box::pin zapewnia Pin bez boundu Unpin. Po pojedynczym poll lokalny właściciel wychodzi z zakresu.",
      ],
      evidenceKind: "transfer",
      evidenceGate: true,
    },
    {
      id: "future-cancellation-blank",
      kind: "blank",
      title: "Od pustej kartki: zachować czy anulować?",
      prompt:
        "Zaprojektuj cancel_slot dla aplikacji przechowującej opcjonalną operację. Pierwszy argument to mutowalna pożyczka Option<Pin<Box<F>>> dla dowolnego F: Future, drugi to bool cancel; wynikiem jest bool mówiący, czy teraz usunięto istniejącą operację. Gdy cancel jest false, zawartość i jej tożsamość pozostają bez zmian, a wynik to false. Gdy true, slot staje się pusty, a jego wcześniejsza przyszłość zostaje zniszczona. Pusty slot daje false. Funkcja nigdy nie polluje. Musi działać przed startem i po Pending, także przy ponownym anulowaniu; nie wolno wyciekać zasobami, klonować ani wymagać Unpin.",
      solution: slotSolution,
      evaluator: {
        kind: "tests",
        tests: slotTests,
        forbiddenPatterns: ["unsafe", ".clone()", "mem::forget", "Box::leak"],
      },
      hints: [
        "Zniszczenie pożyczki do slotu nie niszczy wartości należącej do slotu.",
        "Option pozwala oddzielić przeniesienie zawartości od pozostawienia pustego miejsca. Zwracany bool opisuje faktyczne usunięcie.",
      ],
      evidenceKind: "assessment",
      evidenceGate: true,
    },
  ],
  misconceptions: [
    "Pending nie wykonało żadnych efektów.",
    "Drop zapewnia rollback.",
    "Budzenie zobowiązuje właściciela do kolejnego poll.",
    "Porzucenie uchwytu zawsze zatrzymuje niezależne zadanie.",
  ],
  transferTask:
    "Zaprojektuj stan aplikacji przechowujący operację i zdecyduj, kiedy zachować ją po Pending, a kiedy anulować. Opisz, co pozostanie po przerwaniu i kto odpowiada za niezależną pracę.",
  evidenceGate:
    "Pierwsza bramka obserwuje pojedynczy poll, bieżący Waker, Ready/Pending i Drop. Niezależny blank sprawdza zachowanie tożsamości, usunięcie przed startem lub po Pending, brak dodatkowego poll oraz idempotencję.",
  sourceIds: [
    "async-foundations-std-future",
    "async-foundations-std-waker",
    "async-foundations-std-pin",
    "async-foundations-book-17-futures",
  ],
};
