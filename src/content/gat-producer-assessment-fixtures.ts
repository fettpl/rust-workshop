const trait = `trait LendingIterator {
    type Item<'a> where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>>;
}`;

const rowEquivalent = `${trait}
struct RowLender<T> { rows: Vec<Vec<T>>, cursor: usize }
impl<T> RowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, cursor: 0 } } }
impl<T> LendingIterator for RowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let row = self.rows.get_mut(self.cursor)?; self.cursor += 1; Some(row.as_mut_slice()) }
}`;
const rowMutant = `${trait}
struct RowLender<T> { rows: Vec<Vec<T>>, next: usize }
impl<T> RowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, next: 0 } } }
impl<T> LendingIterator for RowLender<T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.next >= self.rows.len() { return None; } let index = self.next; self.next += 1; if self.rows[index].is_empty() { self.next = self.rows.len(); return None; } Some(self.rows[index].as_mut_slice()) }
}`;

const presentEquivalent = `${trait}
struct PresentValueLender<T> { values: Vec<Option<T>>, cursor: usize }
impl<T> PresentValueLender<T> { fn new(values: Vec<Option<T>>) -> Self { Self { values, cursor: 0 } } }
impl<T> LendingIterator for PresentValueLender<T> {
    type Item<'a> = &'a mut T where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let start = self.cursor; let len = self.values.len(); let found = self.values[start..].iter_mut().enumerate().find_map(|(offset, slot)| slot.as_mut().map(|value| (offset, value))); match found { Some((offset, value)) => { self.cursor = start + offset + 1; Some(value) }, None => { self.cursor = len; None } } }
}`;
const presentMutant = `${trait}
struct PresentValueLender<T> { values: Vec<Option<T>>, next: usize }
impl<T> PresentValueLender<T> { fn new(values: Vec<Option<T>>) -> Self { Self { values, next: 0 } } }
impl<T> LendingIterator for PresentValueLender<T> {
    type Item<'a> = &'a mut T where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let len = self.values.len(); while self.next < len { let index = self.next; self.next += 1; match self.values[index].as_mut() { Some(value) => return Some(value), None => { self.next = len; return None; } } } None }
}`;

const windowsEquivalent = `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct WindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> WindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { match width { 0 => Err(WidthError::Zero), width => Ok(Self { data, width, position: 0, done: false }) } } }
impl<T> LendingIterator for WindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let end = self.position.checked_add(self.width)?; if self.done || end > self.data.len() { self.done = true; return None; } let start = self.position; self.position = self.position.saturating_add(1); self.data.get_mut(start..end) }
}`;
const windowsMutant = `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct WindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> WindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { Err(WidthError::Zero) } else { Ok(Self { data, width, position: 0, done: false }) } } }
impl<T> LendingIterator for WindowsMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done || self.position >= self.data.len() || self.width > self.data.len() - self.position { self.done = true; return None; } let start = self.position; let end = start.checked_add(self.width)?; self.position = start.saturating_add(self.width); self.data.get_mut(start..end) }
}`;

const prefixesEquivalent = `${trait}
struct GrowingPrefixesMut<'data, T> { data: &'data mut [T], maximum: usize, length: usize, done: bool }
impl<'data, T> GrowingPrefixesMut<'data, T> { fn new(data: &'data mut [T], maximum: usize) -> Self { Self { data, maximum, length: 1, done: false } } }
impl<T> LendingIterator for GrowingPrefixesMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { let limit = self.maximum.min(self.data.len()); if self.done || self.length == 0 || self.length > limit { self.done = true; return None; } let output = self.data.get_mut(..self.length); self.length = self.length.saturating_add(1); if self.length > limit { self.done = true; } output }
}`;
const prefixesMutant = `${trait}
struct GrowingPrefixesMut<'data, T> { data: &'data mut [T], maximum: usize, length: usize, done: bool }
impl<'data, T> GrowingPrefixesMut<'data, T> { fn new(data: &'data mut [T], maximum: usize) -> Self { Self { data, maximum, length: 1, done: false } } }
impl<T> LendingIterator for GrowingPrefixesMut<'_, T> {
    type Item<'a> = &'a mut [T] where Self: 'a;
    fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done || self.length == 0 || self.length > self.maximum || self.length > self.data.len() { self.done = true; return None; } let end = self.length; self.length = self.length.saturating_add(1); if end >= self.maximum || end >= self.data.len() { self.done = true; } self.data.get_mut(end.saturating_sub(1)..end) }
}`;

const reverseRowsEquivalent = `${trait}
struct ReverseRowLender<T> { rows: Vec<Vec<T>>, position: usize, done: bool }
impl<T> ReverseRowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { let position = rows.len(); Self { rows, position, done: false } } }
impl<T> LendingIterator for ReverseRowLender<T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done || self.position == 0 { self.done = true; return None; } self.position -= 1; Some(self.rows[self.position].as_mut_slice()) } }
`;
const reverseRowsMutant = `${trait}
struct ReverseRowLender<T> { rows: Vec<Vec<T>>, position: usize, done: bool }
impl<T> ReverseRowLender<T> { fn new(rows: Vec<Vec<T>>) -> Self { Self { rows, position: 0, done: false } } }
impl<T> LendingIterator for ReverseRowLender<T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done || self.position >= self.rows.len() { self.done = true; return None; } let position = self.position; self.position += 1; Some(self.rows[position].as_mut_slice()) } }
`;

const reverseWindowsEquivalent = `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct ReverseWindowsMut<'data, T> { data: &'data mut [T], width: usize, position: usize, done: bool }
impl<'data, T> ReverseWindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { Err(WidthError::Zero) } else { let position = data.len().checked_sub(width).unwrap_or(0); let done = width > data.len(); Ok(Self { data, width, position, done }) } } }
impl<T> LendingIterator for ReverseWindowsMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done { return None; } let start = self.position; let end = start + self.width; self.done = start == 0; if !self.done { self.position -= 1; } self.data.get_mut(start..end) } }
`;
const reverseWindowsMutant = `${trait}
#[derive(Debug, PartialEq, Eq)] enum WidthError { Zero }
struct ReverseWindowsMut<'data, T> { data: &'data mut [T], width: usize, position: Option<usize>, done: bool }
impl<'data, T> ReverseWindowsMut<'data, T> { fn new(data: &'data mut [T], width: usize) -> Result<Self, WidthError> { if width == 0 { return Err(WidthError::Zero); } Ok(Self { position: data.len().checked_sub(width), data, width, done: false }) } }
impl<T> LendingIterator for ReverseWindowsMut<'_, T> { type Item<'a> = &'a mut [T] where Self: 'a; fn next<'a>(&'a mut self) -> Option<Self::Item<'a>> { if self.done { return None; } let start = self.position?; let end = start + self.width; self.position = start.checked_sub(self.width); if self.position.is_none() { self.done = true; } self.data.get_mut(start..end) } }
`;

export const gatProducerAssessmentFixtures: {
  id: string;
  equivalent: string;
  mutant: string;
}[] = [
  {
    id: "gat-receiver-borrows-gate",
    equivalent: rowEquivalent,
    mutant: rowMutant,
  },
  {
    id: "gat-receiver-borrows-blank",
    equivalent: presentEquivalent,
    mutant: presentMutant,
  },
  {
    id: "gat-overlapping-mutable-windows-gate",
    equivalent: windowsEquivalent,
    mutant: windowsMutant,
  },
  {
    id: "gat-overlapping-mutable-windows-blank",
    equivalent: prefixesEquivalent,
    mutant: prefixesMutant,
  },
  {
    id: "gat-receiver-borrows-review",
    equivalent: reverseRowsEquivalent,
    mutant: reverseRowsMutant,
  },
  {
    id: "gat-overlapping-mutable-windows-review",
    equivalent: reverseWindowsEquivalent,
    mutant: reverseWindowsMutant,
  },
];
