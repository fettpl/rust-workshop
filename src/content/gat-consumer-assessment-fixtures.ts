/** Fixed maintainer sources. The harness appends each step's authored tests. */
export const gatConsumerAssessmentFixtures: {
  id: string;
  equivalent: string;
  mutant: string;
}[] = [
  {
    id: "gat-item-capabilities-gate",
    equivalent: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    let mut counts = Vec::new();
    loop {
        let mut item = match lender.next() { Some(item) => item, None => break };
        counts.push(visit(item.as_mut()));
    }
    counts
}`,
    mutant: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn mutate_and_count<L, T, F>(lender: &mut L, mut visit: F) -> Vec<usize>
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> usize,
{
    let mut counts = Vec::new();
    while let Some(mut item) = lender.next() {
        let slice = item.as_mut();
        if !slice.is_empty() {
            counts.push(visit(slice));
        }
    }
    counts
}`,
  },
  {
    id: "gat-item-capabilities-blank",
    equivalent: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn visit_until<L, T, F>(lender: &mut L, mut visit: F) -> usize
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> bool,
{
    let mut visited = 0;
    loop {
        let Some(mut item) = lender.next() else { break };
        visited += 1;
        if !visit(item.as_mut()) { break; }
    }
    visited
}`,
    mutant: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn visit_until<L, T, F>(lender: &mut L, mut visit: F) -> usize
where
    L: SliceLender<T>,
    F: FnMut(&mut [T]) -> bool,
{
    let mut visited = 0;
    loop {
        let keep_going = match lender.next() {
            Some(mut item) => { visited += 1; visit(item.as_mut()) }
            None => break,
        };
        if !keep_going {
            let _ = lender.next();
            break;
        }
    }
    visited
}`,
  },
  {
    id: "gat-item-capabilities-review",
    equivalent: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    let mut reports = Vec::new();
    loop {
        let item = match lender.next() { Some(item) => item, None => break };
        let slice = item.as_ref();
        if slice.is_empty() { continue; }
        if let Some(report) = choose(slice) { reports.push(report); }
    }
    reports
}`,
    mutant: `trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

fn select_reports<L, T, R, F>(lender: &mut L, mut choose: F) -> Vec<R>
where
    L: SliceLender<T>,
    F: FnMut(&[T]) -> Option<R>,
{
    let mut reports = Vec::new();
    while let Some(item) = lender.next() {
        if let Some(report) = choose(item.as_ref()) { reports.push(report); }
    }
    reports
}`,
  },
  {
    id: "gat-owned-iterator-adapters-gate",
    equivalent: `use std::marker::PhantomData;

trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

#[derive(Debug, PartialEq, Eq)]
struct WindowSummary { index: usize, len: usize }

struct OwnedSummaries<L, T> {
    input: L,
    ordinal: usize,
    finished: bool,
    marker: PhantomData<fn() -> T>,
}

impl<L, T> OwnedSummaries<L, T> where L: SliceLender<T> {
    fn new(source: L) -> Self {
        Self { input: source, ordinal: 0, finished: false, marker: PhantomData }
    }
}

impl<L, T> Iterator for OwnedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.finished { return None; }
        match self.input.next() {
            Some(item) => {
                let report = WindowSummary { index: self.ordinal, len: item.as_ref().len() };
                self.ordinal = self.ordinal.saturating_add(1);
                Some(report)
            }
            None => { self.finished = true; None }
        }
    }
}`,
    mutant: `use std::marker::PhantomData;

trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}

#[derive(Debug, PartialEq, Eq)]
struct WindowSummary { index: usize, len: usize }

struct OwnedSummaries<L, T> { source: L, index: usize, done: bool, marker: PhantomData<fn() -> T> }
impl<L, T> OwnedSummaries<L, T> where L: SliceLender<T> {
    fn new(mut source: L) -> Self {
        let _ = source.next();
        Self { source, index: 0, done: false, marker: PhantomData }
    }
}
impl<L, T> Iterator for OwnedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        match self.source.next() {
            Some(item) => { let out = WindowSummary { index: self.index, len: item.as_ref().len() }; self.index = self.index.saturating_add(1); Some(out) }
            None => { self.done = true; None }
        }
    }
}`,
  },
  {
    id: "gat-owned-iterator-adapters-blank",
    equivalent: `use std::marker::PhantomData;

trait SliceLender<T> {
    type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}
struct WindowSummary { index: usize, len: usize }
struct NonEmptySummaries<L, T> { input: L, ordinal: usize, finished: bool, marker: PhantomData<fn() -> T> }
impl<L, T> NonEmptySummaries<L, T> where L: SliceLender<T> {
    fn new(source: L) -> Self { Self { input: source, ordinal: 0, finished: false, marker: PhantomData } }
}
impl<L, T> Iterator for NonEmptySummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.finished { return None; }
        loop {
            match self.input.next() {
                Some(item) => {
                    let index = self.ordinal;
                    self.ordinal = self.ordinal.saturating_add(1);
                    let len = item.as_ref().len();
                    if len > 0 { return Some(WindowSummary { index, len }); }
                }
                None => { self.finished = true; return None; }
            }
        }
    }
}`,
    mutant: `use std::marker::PhantomData;
trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
#[derive(Debug, PartialEq, Eq)] struct WindowSummary { index: usize, len: usize }
struct NonEmptySummaries<L, T> { source: L, index: usize, done: bool, marker: PhantomData<fn() -> T> }
impl<L, T> NonEmptySummaries<L, T> where L: SliceLender<T> { fn new(source: L) -> Self { Self { source, index: 0, done: false, marker: PhantomData } } }
impl<L, T> Iterator for NonEmptySummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        match self.source.next() {
            Some(item) => { let len = item.as_ref().len(); let out = WindowSummary { index: self.index, len }; self.index = self.index.saturating_add(1); Some(out) }
            None => { self.done = true; None }
        }
    }
}`,
  },
  {
    id: "gat-owned-iterator-adapters-review",
    equivalent: `use std::marker::PhantomData;
trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
#[derive(Debug, PartialEq, Eq)] struct WindowSummary { index: usize, len: usize }
struct CappedSummaries<L, T> { input: L, limit: usize, ordinal: usize, finished: bool, marker: PhantomData<fn() -> T> }
impl<L, T> CappedSummaries<L, T> where L: SliceLender<T> { fn new(source: L, maximum: usize) -> Self { Self { input: source, limit: maximum, ordinal: 0, finished: false, marker: PhantomData } } }
impl<L, T> Iterator for CappedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.finished { return None; }
        match self.input.next() {
            Some(item) => { let index = self.ordinal; self.ordinal = self.ordinal.saturating_add(1); let len = item.as_ref().len(); if len > self.limit { self.finished = true; None } else { Some(WindowSummary { index, len }) } }
            None => { self.finished = true; None }
        }
    }
}`,
    mutant: `use std::marker::PhantomData;
trait SliceLender<T> { type Item<'a>: AsRef<[T]> + AsMut<[T]> where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>; }
#[derive(Debug, PartialEq, Eq)] struct WindowSummary { index: usize, len: usize }
struct CappedSummaries<L, T> { source: L, maximum: usize, index: usize, done: bool, marker: PhantomData<fn() -> T> }
impl<L, T> CappedSummaries<L, T> where L: SliceLender<T> { fn new(source: L, maximum: usize) -> Self { Self { source, maximum, index: 0, done: false, marker: PhantomData } } }
impl<L, T> Iterator for CappedSummaries<L, T> where L: SliceLender<T> {
    type Item = WindowSummary;
    fn next(&mut self) -> Option<Self::Item> {
        if self.done { return None; }
        match self.source.next() {
            Some(item) => { let index = self.index; self.index = self.index.saturating_add(1); let len = item.as_ref().len(); if len > self.maximum { None } else { Some(WindowSummary { index, len }) } }
            None => { self.done = true; None }
        }
    }
}`,
  },
];
