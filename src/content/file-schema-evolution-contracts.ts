// MIT: fixed browser model. Native parsing and filesystem operations have a separate contract.
const model = `use std::num::NonZeroU64;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Version { V1, V2 }
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum NextId { Available(NonZeroU64), Exhausted }
#[derive(Debug, Eq, PartialEq)]
pub struct Entry { id: NonZeroU64, done: bool, title: String }
#[derive(Debug, Eq, PartialEq)]
pub struct LegacyEntry { done: bool, title: String }
#[derive(Debug, Eq, PartialEq)]
pub struct LegacyTodo { entries: Vec<LegacyEntry> }
#[derive(Debug, Eq, PartialEq)]
pub struct Todo { entries: Vec<Entry>, next_id: NextId }
#[derive(Debug, Eq, PartialEq)]
pub enum Decoded { Legacy(LegacyTodo), Current(Todo) }
#[derive(Debug, Eq, PartialEq)]
pub struct Loaded { version: Version, todo: Todo }
#[derive(Debug, Eq, PartialEq)]
pub enum ConversionError { TooManyLegacyRecords }

impl Entry {
    pub fn id(&self) -> NonZeroU64 { self.id }
    pub fn done(&self) -> bool { self.done }
    pub fn title(&self) -> &str { &self.title }
}
impl LegacyEntry {
    pub fn done(&self) -> bool { self.done }
    pub fn title(&self) -> &str { &self.title }
}
impl LegacyTodo {
    pub fn entries(&self) -> &[LegacyEntry] { &self.entries }
}
impl Todo {
    pub fn entries(&self) -> &[Entry] { &self.entries }
    pub fn next_id(&self) -> NextId { self.next_id }
}
impl Loaded {
    pub fn version(&self) -> Version { self.version }
    pub fn todo(&self) -> &Todo { &self.todo }
    pub fn into_todo(self) -> Todo { self.todo }
}
`;

const program = (body: string) => `${model}
pub fn normalize(decoded: Decoded) -> Result<Loaded, ConversionError> {
${body}
}

fn main() {}
`;
const starter = program('    todo!("implement normalization")');

const tests = String.raw`#[test]
fn file_schema_normalization_contract() {
    let legacy = Decoded::Legacy(LegacyTodo { entries: vec![
        LegacyEntry { done: false, title: "  plan\tA  ".into() },
        LegacyEntry { done: true, title: "dup".into() },
        LegacyEntry { done: false, title: "dup".into() },
    ]});
    let loaded = normalize(legacy).expect("valid legacy input");
    assert_eq!(loaded.version(), Version::V1);
    let actual: Vec<_> = loaded.todo().entries().iter()
        .map(|row| (row.id().get(), row.done(), row.title())).collect();
    assert_eq!(actual, [(1, false, "  plan\tA  "), (2, true, "dup"), (3, false, "dup")], "legacy-literal");
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::new(4).unwrap()));

    let legacy = Decoded::Legacy(LegacyTodo { entries: vec![
        LegacyEntry { done: false, title: "zeta".into() },
        LegacyEntry { done: true, title: "alpha".into() },
        LegacyEntry { done: true, title: "alpha".into() },
    ]});
    let loaded = normalize(legacy).expect("valid duplicate rows");
    let actual: Vec<_> = loaded.todo().entries().iter()
        .map(|row| (row.id().get(), row.done(), row.title())).collect();
    assert_eq!(actual, [(1, false, "zeta"), (2, true, "alpha"), (3, true, "alpha")], "legacy-order-and-duplicates");
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::new(4).unwrap()));

    let current = Decoded::Current(Todo { entries: vec![
        Entry { id: NonZeroU64::new(9).unwrap(), done: true, title: "więcej\t ".into() },
        Entry { id: NonZeroU64::new(2).unwrap(), done: false, title: "więcej\t ".into() },
    ], next_id: NextId::Available(NonZeroU64::new(12).unwrap()) });
    let loaded = normalize(current).expect("valid current input");
    assert_eq!(loaded.version(), Version::V2);
    let actual: Vec<_> = loaded.todo().entries().iter()
        .map(|row| (row.id().get(), row.done(), row.title())).collect();
    assert_eq!(actual, [(9, true, "więcej\t "), (2, false, "więcej\t ")], "current-literal");
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::new(12).unwrap()), "current-next");

    let empty = normalize(Decoded::Legacy(LegacyTodo { entries: vec![] })).unwrap();
    assert_eq!(empty.version(), Version::V1);
    assert!(empty.todo().entries().is_empty());
    assert_eq!(empty.todo().next_id(), NextId::Available(NonZeroU64::MIN));
    let exhausted = normalize(Decoded::Current(Todo { entries: vec![], next_id: NextId::Exhausted })).unwrap();
    assert_eq!(exhausted.version(), Version::V2);
    assert!(exhausted.todo().entries().is_empty());
    assert_eq!(exhausted.into_todo().next_id(), NextId::Exhausted);
}
`;

const reviewTests = String.raw`#[test]
fn file_schema_normalization_recall() {
    let input = Decoded::Legacy(LegacyTodo { entries: vec![
        LegacyEntry { done: false, title: "Ala".into() },
        LegacyEntry { done: false, title: "Ala".into() },
        LegacyEntry { done: true, title: "  ż\teta  ".into() },
    ]});
    let loaded = normalize(input).expect("valid legacy recall input");
    assert_eq!(loaded.version(), Version::V1);
    let actual: Vec<_> = loaded.todo().entries().iter()
        .map(|row| (row.id().get(), row.done(), row.title())).collect();
    assert_eq!(actual, [(1, false, "Ala"), (2, false, "Ala"), (3, true, "  ż\teta  ")], "review-legacy-literal");
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::new(4).unwrap()));

    let input = Decoded::Current(Todo { entries: vec![
        Entry { id: NonZeroU64::new(7).unwrap(), done: false, title: "Żółć".into() },
        Entry { id: NonZeroU64::new(3).unwrap(), done: true, title: "  dwa  ".into() },
    ], next_id: NextId::Available(NonZeroU64::new(20).unwrap()) });
    let loaded = normalize(input).expect("valid current recall input");
    assert_eq!(loaded.version(), Version::V2);
    let actual: Vec<_> = loaded.todo().entries().iter()
        .map(|row| (row.id().get(), row.done(), row.title())).collect();
    assert_eq!(actual, [(7, false, "Żółć"), (3, true, "  dwa  ")], "review-current-literal");
    assert_eq!(loaded.todo().next_id(), NextId::Available(NonZeroU64::new(20).unwrap()), "review-current-next");
}
`;

const canonicalBody = `    match decoded {
        Decoded::Current(todo) => Ok(Loaded { version: Version::V2, todo }),
        Decoded::Legacy(value) => {
            let mut entries = Vec::new();
            let mut next_id = NextId::Available(NonZeroU64::MIN);
            for row in value.entries {
                let NextId::Available(id) = next_id else {
                    return Err(ConversionError::TooManyLegacyRecords);
                };
                entries.push(Entry { id, done: row.done, title: row.title });
                next_id = match id.get().checked_add(1).and_then(NonZeroU64::new) {
                    Some(next) => NextId::Available(next),
                    None => NextId::Exhausted,
                };
            }
            Ok(Loaded { version: Version::V1, todo: Todo { entries, next_id } })
        }
    }`;
const canonical = program(canonicalBody);

const equivalents = [
  program(`    let value = match decoded {
        Decoded::Current(todo) => return Ok(Loaded { version: Version::V2, todo }),
        Decoded::Legacy(value) => value,
    };
    let entries = value.entries.into_iter().enumerate().map(|(index, row)| {
        let id = u64::try_from(index).ok()
            .and_then(|index| index.checked_add(1))
            .and_then(NonZeroU64::new)
            .ok_or(ConversionError::TooManyLegacyRecords)?;
        Ok(Entry { id, done: row.done, title: row.title })
    }).collect::<Result<Vec<_>, ConversionError>>()?;
    let last_id = entries.last().map_or(0, |entry| entry.id.get());
    let next_id = last_id.checked_add(1).and_then(NonZeroU64::new)
        .map_or(NextId::Exhausted, NextId::Available);
    Ok(Loaded { version: Version::V1, todo: Todo { entries, next_id } })`),
  program(`    if let Decoded::Legacy(value) = decoded {
        let mut entries = Vec::with_capacity(value.entries.len());
        let mut assigned = 0_u64;
        for LegacyEntry { done, title } in value.entries {
            let id = assigned.checked_add(1).and_then(NonZeroU64::new)
                .ok_or(ConversionError::TooManyLegacyRecords)?;
            assigned = id.get();
            entries.push(Entry { id, done, title });
        }
        let next_id = match assigned.checked_add(1).and_then(NonZeroU64::new) {
            Some(next) => NextId::Available(next),
            None => NextId::Exhausted,
        };
        return Ok(Loaded { version: Version::V1, todo: Todo { entries, next_id } });
    }
    let Decoded::Current(todo) = decoded else { unreachable!() };
    Ok(Loaded { version: Version::V2, todo })`),
] as const;

function mutant(
  id: string,
  before: string,
  after: string,
  mainAssertion: string,
  reviewAssertion: string,
) {
  if (canonicalBody.split(before).length !== 2)
    throw new Error(`Non-unique browser mutation ${id}`);
  return {
    id,
    source: program(canonicalBody.replace(before, after)),
    mainAssertion,
    reviewAssertion,
  };
}
const semanticMutants = [
  mutant(
    "M01",
    "for row in value.entries {",
    "let mut rows = value.entries;\n            rows.sort_by(|a, b| a.title.cmp(&b.title));\n            for row in rows {",
    "legacy-order-and-duplicates",
    "review-legacy-literal",
  ),
  mutant(
    "M02",
    "for row in value.entries {",
    "let mut rows = value.entries;\n            rows.dedup_by(|a, b| a.done == b.done && a.title == b.title);\n            for row in rows {",
    "legacy-order-and-duplicates",
    "review-legacy-literal",
  ),
  mutant(
    "M03",
    "title: row.title",
    "title: row.title.trim().to_owned()",
    "legacy-literal",
    "review-legacy-literal",
  ),
  mutant(
    "M04",
    "done: row.done",
    "done: !row.done",
    "legacy-literal",
    "review-legacy-literal",
  ),
  mutant(
    "M05",
    "let mut next_id = NextId::Available(NonZeroU64::MIN);",
    "let mut next_id = NextId::Available(NonZeroU64::new(2).unwrap());",
    "legacy-literal",
    "review-legacy-literal",
  ),
  mutant(
    "M06",
    "Decoded::Current(todo) => Ok(Loaded { version: Version::V2, todo }),",
    `Decoded::Current(mut todo) => {
            for (index, entry) in todo.entries.iter_mut().enumerate() {
                entry.id = u64::try_from(index).ok()
                    .and_then(|index| index.checked_add(1))
                    .and_then(NonZeroU64::new)
                    .ok_or(ConversionError::TooManyLegacyRecords)?;
            }
            Ok(Loaded { version: Version::V2, todo })
        },`,
    "current-literal",
    "review-current-literal",
  ),
  mutant(
    "M07",
    "Decoded::Current(todo) => Ok(Loaded { version: Version::V2, todo }),",
    `Decoded::Current(mut todo) => {
            let largest = todo.entries.iter().map(|entry| entry.id.get()).max().unwrap_or(0);
            todo.next_id = largest.checked_add(1).and_then(NonZeroU64::new)
                .map_or(NextId::Exhausted, NextId::Available);
            Ok(Loaded { version: Version::V2, todo })
        },`,
    "current-next",
    "review-current-next",
  ),
];

export const fileSchemaNormalizationContract = {
  starter,
  promptScaffold: starter,
  canonical,
  equivalents,
  tests,
  reviewTests,
  expectedTest: "file_schema_normalization_contract",
  expectedReviewTest: "file_schema_normalization_recall",
  semanticMutants,
};
