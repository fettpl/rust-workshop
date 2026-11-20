import type { LessonStep } from "@/domain/types";

export const pivotRegionsTransfer: LessonStep = {
  id: "disjoint-regions-pivot-transfer",
  kind: "blank",
  title: "Oddziel element od obu sąsiednich regionów",
  prompt:
    "Napisz od zera `fn split_pivot<T>(buffer: &mut [T], index: usize) -> Option<(&mut [T], &mut T, &mut [T])>`. Poprawny index wskazuje istniejący element. Zwróć kolejno elementy przed nim, sam element i elementy po nim jako trzy rozłączne mutowalne pożyczki. Puste sąsiedztwo jest poprawne; pusty bufor albo index >= len zwraca None bez zmiany danych. Użyj wyłącznie bezpiecznych operacji na slice, bez Copy ani Clone dla T. Testy zmieniają wszystkie trzy części i sprawdzają ich kolejność oraz oryginalny bufor.",
  solution: `fn split_pivot<T>(buffer: &mut [T], index: usize) -> Option<(&mut [T], &mut T, &mut [T])> {
    if index >= buffer.len() { return None; }
    let (left, rest) = buffer.split_at_mut(index);
    let (pivot, right) = rest.split_first_mut()?;
    Some((left, pivot, right))
}`,
  evaluator: {
    kind: "tests",
    forbiddenPatterns: ["unsafe"],
    tests: `#[test]
fn checks_all_small_boundaries_and_mutates_three_disjoint_parts() {
    for len in 0..7 {
        for index in 0..=len + 1 {
            let mut buffer: Vec<i32> = (0..len as i32).collect();
            if index >= len {
                assert!(split_pivot(&mut buffer, index).is_none());
                assert_eq!(buffer, (0..len as i32).collect::<Vec<_>>());
            } else {
                let (left, pivot, right) = split_pivot(&mut buffer, index).unwrap();
                assert_eq!(left, &(0..index as i32).collect::<Vec<_>>());
                assert_eq!(*pivot, index as i32);
                assert_eq!(right, &((index + 1) as i32..len as i32).collect::<Vec<_>>());
                left.fill(10);
                *pivot = 20;
                right.fill(30);
                assert_eq!(buffer, (0..len).map(|i| if i < index { 10 } else if i == index { 20 } else { 30 }).collect::<Vec<_>>());
            }
        }
    }
    assert!(split_pivot(&mut [1], usize::MAX).is_none());
}

#[test]
fn borrows_non_clone_values_without_replacing_their_storage() {
    struct Token(String);
    let mut values = [Token("left".into()), Token("pivot".into()), Token("right".into())];
    let pointers = values.each_ref().map(|value| value.0.as_ptr());
    let (left, pivot, right) = split_pivot(&mut values, 1).unwrap();
    assert_eq!([left[0].0.as_ptr(), pivot.0.as_ptr(), right[0].0.as_ptr()], pointers);
    left[0].0.push('L'); pivot.0.push('P'); right[0].0.push('R');
    assert_eq!(values.each_ref().map(|value| value.0.as_str()), ["leftL", "pivotP", "rightR"]);
}`,
  },
  hints: [
    "Najpierw sprawdź, czy index wskazuje element, a nie granicę za ostatnim elementem.",
    "Po podziale przed index oddziel pierwszy element prawej części od reszty.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["unsafe-miri-disjoint-regions-contract"],
    codingTaskId: "unsafe-miri/pivot-regions-v1",
  },
};

export const moveSlotTransfer: LessonStep = {
  id: "slot-state-move-transfer",
  kind: "blank",
  title: "Przenieś wartość między dwoma slotami",
  prompt:
    "Zdefiniuj `fn move_slot<T>(source: &mut Option<T>, destination: &mut Option<T>) -> bool` w bezpiecznym Rust. Tylko pełne source i puste destination pozwalają przenieść oryginalną wartość i zwrócić true. Po sukcesie source jest None, a destination zawiera tę wartość. W pozostałych trzech kombinacjach zwróć false i zachowaj oba sloty bez zmian. Nie wymagaj Copy ani Clone; nie porzucaj wartości. Option<T> opisuje tutaj Empty/Full bez niezainicjalizowanej pamięci. Testy sprawdzają własność i dokładny Drop po sukcesie oraz odrzuceniu transferu.",
  solution: `fn move_slot<T>(source: &mut Option<T>, destination: &mut Option<T>) -> bool {
    if source.is_none() || destination.is_some() { return false; }
    *destination = source.take();
    true
}`,
  evaluator: {
    kind: "tests",
    forbiddenPatterns: ["unsafe", "mem::forget"],
    tests: `#[test]
fn checks_all_four_states_and_repeated_moves() {
    for full_source in [false, true] {
        for full_destination in [false, true] {
            let mut source = full_source.then_some(17);
            let mut destination = full_destination.then_some(29);
            let before = (source, destination);
            let moved = move_slot(&mut source, &mut destination);
            assert_eq!(moved, full_source && !full_destination);
            assert_eq!((source, destination), if moved { (None, Some(17)) } else { before });
        }
    }
    let mut source = Some(String::from("oryginalna wartość"));
    let pointer = source.as_ref().unwrap().as_ptr();
    let mut destination = None;
    assert!(move_slot(&mut source, &mut destination));
    assert_eq!(destination.as_ref().unwrap().as_ptr(), pointer);
    assert!(!move_slot(&mut source, &mut destination));
    assert!(move_slot(&mut destination, &mut source));
    assert_eq!(source.as_deref(), Some("oryginalna wartość"));
    assert!(destination.is_none());
}

#[test]
fn preserves_non_clone_owners_and_drops_each_value_exactly_once() {
    use std::cell::RefCell;
    use std::rc::Rc;
    struct Probe(u8, Rc<RefCell<Vec<u8>>>);
    impl Drop for Probe { fn drop(&mut self) { self.1.borrow_mut().push(self.0); } }
    let drops = Rc::new(RefCell::new(Vec::new()));
    {
        let mut source = Some(Probe(1, drops.clone()));
        let mut destination = Some(Probe(2, drops.clone()));
        assert!(!move_slot(&mut source, &mut destination));
        assert_eq!(source.as_ref().unwrap().0, 1);
        assert_eq!(destination.as_ref().unwrap().0, 2);
        assert!(drops.borrow().is_empty());
        drop(destination.take());
        assert_eq!(*drops.borrow(), [2]);
        assert!(move_slot(&mut source, &mut destination));
        assert!(source.is_none());
        assert_eq!(destination.as_ref().unwrap().0, 1);
        assert_eq!(*drops.borrow(), [2]);
    }
    assert_eq!(*drops.borrow(), [2, 1]);
}`,
  },
  hints: [
    "Sprawdź oba warunki przed zmianą któregokolwiek slotu.",
    "Option::take przenosi własność i pozostawia None; odrzucony transfer nie powinien go wykonywać.",
  ],
  evidenceKind: "transfer",
  evidenceGate: true,
  evidence: {
    version: 2,
    conceptIds: ["unsafe-miri-slot-state-contract"],
    codingTaskId: "unsafe-miri/slot-owner-transfer-v1",
  },
};

export const miriArchiveRecoverySources = {
  [pivotRegionsTransfer.id]: {
    equivalent: `fn split_pivot<T>(buffer: &mut [T], index: usize) -> Option<(&mut [T], &mut T, &mut [T])> {
    let (left, rest) = buffer.split_at_mut_checked(index)?;
    match rest.split_first_mut() { Some((pivot, right)) => Some((left, pivot, right)), None => None }
}`,
    mutant: pivotRegionsTransfer.solution!.replace(
      "index >= buffer.len()",
      "index == 0 || index >= buffer.len()",
    ),
  },
  [moveSlotTransfer.id]: {
    equivalent: `fn move_slot<T>(source: &mut Option<T>, destination: &mut Option<T>) -> bool {
    match (source.as_ref(), destination.as_ref()) {
        (Some(_), None) => { std::mem::swap(source, destination); true },
        _ => false,
    }
}`,
    mutant: moveSlotTransfer.solution!.replace(
      "source.is_none() || destination.is_some()",
      "source.is_none()",
    ),
  },
};
