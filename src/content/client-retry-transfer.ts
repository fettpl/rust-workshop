import type { LessonStep } from "@/domain/types";

function practice(
  id: string,
  concept: string,
  title: string,
  prompt: string,
  signature: string,
  body: string,
  tests: string,
): LessonStep {
  return {
    id,
    kind: "apply",
    title,
    prompt,
    code: signature + " {\n    todo!()\n}",
    solution: signature + " {\n" + body + "\n}",
    evaluator: { kind: "tests", tests },
    evidenceKind: "transfer",
    expectedStatus: "success",
    evidence: {
      version: 2,
      conceptIds: [concept],
      codingTaskId: "service-client/" + id + "-v1",
    },
  };
}

const policy = "service-client-retry-policy";
const ambiguity = "service-client-ambiguity-contract";

export const retryQueue = practice(
  "retry-ready-queue",
  policy,
  "Wybierz żądania gotowe do ponowienia",
  "Dyspozytor ma kolejkę niezależnych żądań. Zwróć pożyczone identyfikatory w kolejności wejścia, po jednym dla każdego kwalifikującego się wpisu. BUSY i QUEUE_FULL pozwalają ponowić próbę. Wszystkie inne odpowiedzi są końcowe. Wymagaj co najmniej jednej wykonanej próby i attempts < limit. Żądanie jest gotowe od last + backoff włącznie i tylko przed deadline. Odrzuć przepełnienie oraz wpisy, dla których czas jeszcze nie nadszedł. Nie usuwaj duplikatów.",
  `struct Pending<'a> {
    id: &'a str, status: &'a str, attempts: u8, limit: u8,
    last: u64, backoff: u64, deadline: u64,
}
fn ready_ids<'a>(queue: &[Pending<'a>], now: u64) -> Vec<&'a str>`,
  `    queue.iter().filter(|item| {
        matches!(item.status, "BUSY" | "QUEUE_FULL")
            && item.attempts > 0 && item.attempts < item.limit
            && item.last.checked_add(item.backoff).is_some_and(|due| due <= now)
            && now < item.deadline
    }).map(|item| item.id).collect()`,
  `#[test]
fn considers_each_request_and_both_time_boundaries() {
    let item = |id, status, attempts, limit, last, backoff, deadline|
        Pending { id, status, attempts, limit, last, backoff, deadline };
    let q = [
        item("a","BUSY",1,3,3,2,9), item("x","CONFLICT",1,3,3,2,9),
        item("b","QUEUE_FULL",1,2,5,0,6), item("a","BUSY",1,3,1,1,6),
        item("x","STORAGE",1,3,1,1,9), item("x","?",1,3,1,1,9),
        item("x","BUSY",0,3,1,1,9), item("x","BUSY",2,2,1,1,9),
        item("x","BUSY",1,3,u64::MAX,2,9),
    ];
    assert_eq!(ready_ids(&q, 4), vec!["a"]);
    assert_eq!(ready_ids(&q, 5), vec!["a", "b", "a"]);
    assert_eq!(ready_ids(&q, 6), vec!["a"]);
    assert!(ready_ids(&q, 9).is_empty());
    assert!(ready_ids(&[], 4).is_empty());
}`,
);

export const retryWindows = practice(
  "retry-time-windows",
  policy,
  "Wyznacz okna prób pod wspólnym terminem",
  "Zwróć plan okien [start, end) dla jednego żądania. Pierwsza próba zaczyna się w now. Po zakończeniu próby numer k (od 1) odczekaj k * backoff. Czas trwania próby wynosi width, ale przytnij koniec okna do wspólnego deadline. Nie twórz okna, którego start wypada w deadline lub później. Limit prób, width i backoff muszą być dodatnie, inaczej zwróć Err(Invalid). Przepełnienie przy potrzebnym mnożeniu lub dodawaniu daje Err(Overflow), także przy obliczaniu końca przed przycięciem. Po osiągnięciu limitu prób albo deadline nie obliczaj kolejnego startu. Jeśli now >= deadline i polityka jest poprawna, plan jest pusty.",
  `#[derive(Debug, PartialEq)]
enum PlanError { Invalid, Overflow }
fn windows(now: u64, deadline: u64, limit: u8, width: u64, backoff: u64) -> Result<Vec<(u64,u64)>, PlanError>`,
  `    if limit == 0 || width == 0 || backoff == 0 { return Err(PlanError::Invalid); }
    let mut plan = Vec::new();
    let mut start = now;
    for k in 1..=limit {
        if start >= deadline { break; }
        let end = start.checked_add(width).ok_or(PlanError::Overflow)?.min(deadline);
        plan.push((start, end));
        if k == limit || end == deadline { break; }
        let delay = backoff.checked_mul(u64::from(k)).ok_or(PlanError::Overflow)?;
        start = end.checked_add(delay).ok_or(PlanError::Overflow)?;
    }
    Ok(plan)`,
  `#[test]
fn shares_deadline_and_uses_the_previous_end() {
    assert_eq!(windows(3,18,5,3,2), Ok(vec![(3,6),(8,11),(15,18)]));
    assert_eq!(windows(3,17,5,3,2), Ok(vec![(3,6),(8,11),(15,17)]));
    assert_eq!(windows(3,8,5,3,2), Ok(vec![(3,6)]));
    assert_eq!(windows(9,8,2,3,2), Ok(vec![]));
    assert_eq!(windows(1,100,2,3,2), Ok(vec![(1,4),(6,9)]));
}
#[test]
fn rejects_invalid_or_overflowing_calculations_only_when_needed() {
    for (limit,width,backoff) in [(0,1,1),(1,0,1),(1,1,0)] {
        assert_eq!(windows(9,8,limit,width,backoff), Err(PlanError::Invalid));
    }
    assert_eq!(windows(u64::MAX-1,u64::MAX,1,2,1), Err(PlanError::Overflow));
    assert_eq!(windows(0,u64::MAX,2,1,u64::MAX), Err(PlanError::Overflow));
    assert_eq!(windows(0,u64::MAX,3,1,u64::MAX/2+1), Err(PlanError::Overflow));
    assert_eq!(windows(0,9,1,2,u64::MAX), Ok(vec![(0,2)]));
}`,
);

export const retryReplicas = practice(
  "retry-replica-frame",
  ambiguity,
  "Wyślij jedną ramkę przez kolejne repliki",
  "Dostałeś gotową ramkę binarną i listę nazw replik. Wywołaj send(nazwa, ramka) raz na odwiedzoną replikę w kolejności listy. Przekaż dokładnie te same bajty, także dla pustej ramki. Po Lost przejdź dalej. Po Receipt(n) dla n > 0 zwróć Some(n), po Receipt(0) lub Refused natychmiast zakończ z None. Brak pozytywnego pokwitowania albo pusta lista daje None. Nie dodawaj nazwy repliki ani numeru próby do ramki.",
  `enum Reply { Lost, Refused, Receipt(u64) }
fn try_replicas<F>(frame: &[u8], replicas: &[&str], mut send: F) -> Option<u64>
where F: FnMut(&str, &[u8]) -> Reply`,
  `    for replica in replicas {
        match send(replica, frame) {
            Reply::Lost => continue,
            Reply::Receipt(n) if n > 0 => return Some(n),
            Reply::Refused | Reply::Receipt(_) => return None,
        }
    }
    None`,
  `#[test]
fn preserves_binary_payload_and_replica_order_until_the_receipt() {
    let mut seen = Vec::new();
    let payload = [0, 255, 9, 0, 10];
    assert_eq!(try_replicas(&payload, &["b","a","c"], |name, bytes| {
        seen.push((name.to_owned(), bytes.to_vec()));
        if seen.len() == 2 { Reply::Receipt(73) } else { Reply::Lost }
    }), Some(73));
    assert_eq!(seen, vec![("b".to_owned(),payload.to_vec()),("a".to_owned(),payload.to_vec())]);
}
#[test]
fn stops_on_a_terminal_reply_and_does_not_invent_a_receipt() {
    assert_eq!(try_replicas(b"x", &[], |_,_| panic!("unexpected send")), None);
    for malformed in [false,true] {
        let mut calls = 0;
        assert_eq!(try_replicas(b"", &["a","b"], |_,bytes| {
            assert!(bytes.is_empty()); calls += 1;
            if malformed { Reply::Receipt(0) } else { Reply::Refused }
        }), None);
        assert_eq!(calls, 1);
    }
    let mut names = Vec::new();
    assert_eq!(try_replicas(b"f", &["b","b","a"], |name,_| { names.push(name.to_owned()); Reply::Lost }), None);
    assert_eq!(names, ["b","b","a"]);
}`,
);

export const retryLedger = practice(
  "retry-receipt-ledger",
  ambiguity,
  "Rozlicz obserwacje jednego żądania",
  "Dziennik miesza obserwacje różnych żądań. Dla podanego id czytaj wyłącznie pasujące wpisy w kolejności zapisu. Brak wpisów daje Missing. Busy i Refused są jednoznaczną odmową tej próby. Lost, Storage i pokwitowanie o sekwencji zero wprowadzają niepewność, której dalsze odmowy nie kasują. Pierwsze dopasowane Receipt(n) z n > 0 rozstrzyga wynik na Delivered(n). Jeśli zabrakło takiego pokwitowania, zwróć Unknown po dowolnej niepewności albo Rejected po samych odmowach.",
  `enum Seen { Lost, Storage, Busy, Refused, Receipt(u64) }
#[derive(Debug, PartialEq)]
enum Outcome { Missing, Delivered(u64), Rejected, Unknown }
fn reconcile(id: &str, ledger: &[(&str, Seen)]) -> Outcome`,
  `    let mut outcome = Outcome::Missing;
    for (key, observation) in ledger {
        if *key != id { continue; }
        match observation {
            Seen::Receipt(n) if *n > 0 => return Outcome::Delivered(*n),
            Seen::Lost | Seen::Storage | Seen::Receipt(_) => outcome = Outcome::Unknown,
            Seen::Busy | Seen::Refused if outcome == Outcome::Missing => outcome = Outcome::Rejected,
            _ => {}
        }
    }
    outcome`,
  `#[test]
fn separates_streams_and_keeps_the_first_matching_valid_receipt() {
    let log = [("a",Seen::Lost),("b",Seen::Receipt(42)),("a",Seen::Busy),("a",Seen::Refused),
               ("a",Seen::Receipt(72)),("a",Seen::Receipt(99)),("a",Seen::Storage)];
    assert_eq!(reconcile("a",&log[..4]), Outcome::Unknown);
    assert_eq!(reconcile("a",&log), Outcome::Delivered(72));
    assert_eq!(reconcile("b",&log), Outcome::Delivered(42));
    assert_eq!(reconcile("c",&log), Outcome::Missing);
}
#[test]
fn tracks_uncertainty_in_both_orders() {
    for event in [Seen::Lost,Seen::Storage,Seen::Receipt(0)] {
        assert_eq!(reconcile("x",&[("x",Seen::Busy),("x",event),("x",Seen::Busy)]), Outcome::Unknown);
    }
    assert_eq!(reconcile("x",&[("x",Seen::Refused),("other",Seen::Lost),("x",Seen::Busy)]), Outcome::Rejected);
    assert_eq!(reconcile("x",&[("x",Seen::Busy),("x",Seen::Lost)]), Outcome::Unknown);
}`,
);
