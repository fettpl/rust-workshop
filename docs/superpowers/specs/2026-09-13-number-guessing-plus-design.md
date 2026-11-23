# Number Guessing+ design

[Polski](2026-09-13-number-guessing-plus-design.pl.md)

The original first portfolio project currently teaches only a result message. This milestone extends that same project into a playable terminal game with a random default secret, explicit state, failure paths, independent transfer and a downloadable Cargo starter/reference. It does not replace or rename any earlier lesson, step, project ID, notes or evidence.

## Curriculum and compatibility

- Module `number-guessing-plus`, after `testing-quality`, with four chained lessons/concepts: `guess-input-contract`, `guess-round-state`, `guess-session-io`, `guess-random-boundary`. The first lesson/concept depends on `testing-quality-workflow`.
- Each lesson has a prediction, executable observation, explanation, primary `${id}-gate`, independent `${id}-blank`, and a distinct coding retrieval exercise. Gate and blank use meaningful hidden Rust tests; a blank has no starter or supplied signature. Fresh tasks change the domain AND a relevant constraint, not only names.
- Primary tasks follow the package semantics below. Inline exercises use only std and injected values/functions. Actual rand, manifests, stdin/stdout and process exits are verified in Cargo, not claimed as proven by a one-file browser exercise.
- Keep project ID `number-guessing-result-message` and index 0. `course.project` and `projects[0]` refer to the enhanced contract. Keep its original starting lesson `number-guessing-transfer`; explicit `lessonIds` includes that lesson, `adversarial-no-clone`, and all four new lessons. Retain all old lesson/step IDs and their order.
- Package `number-guessing-workshop` reveals only the four new primary gates. It does not clear old independent results, reveal the new blank/retrieval tasks or grant mastery merely for download/checklists.
- Polish learner copy assumes basic programming and no prior Rust. Use official sources with reviewedAt 2026-09-13. Existing project patterns, persistence v3 and runner contract remain.

## Exact game contract

The package is Rust 2024, with a library and `number-guessing` binary. Pin `rand = { version = "=0.10.2", default-features = false, features = ["thread_rng"] }` and generate the real Cargo.lock. Default invocation samples `rand::random_range(1..=100)` once per game. This is an ordinary game, with no cryptographic or cross-version seeded-sequence guarantee.

Library boundaries (the package author may organize files, but preserve these public contracts):

```rust
pub enum Input { Guess(u32), Quit }
pub enum InputError { Empty, Syntax, OutOfRange }
pub fn parse_input(line: &str) -> Result<Input, InputError>;
pub enum ConfigError { Secret, Attempts }
pub enum GameError { Finished, OutOfRange }
pub enum Status { Active, Won, Lost }
pub enum Feedback { Low { remaining: u8 }, High { remaining: u8 }, Won { attempts: u8 }, Lost { secret: u32 } }
pub struct Game { /* private fields */ }
impl Game {
    pub fn new(secret: u32, attempts: u8) -> Result<Self, ConfigError>;
    pub fn submit(&mut self, guess: u32) -> Result<Feedback, GameError>;
    pub fn status(&self) -> Status;
    pub fn remaining(&self) -> u8;
}
pub fn new_game_with(attempts: u8, draw: impl FnOnce() -> u32) -> Result<Game, ConfigError>;
pub enum SessionOutcome { Won, Lost, Quit, Eof }
pub fn play<R: std::io::BufRead, W: std::io::Write>(reader: &mut R, writer: &mut W, game: Game) -> std::io::Result<SessionOutcome>;
```

Enums implement Debug/PartialEq/Eq; Copy where useful. Errors implement Display/Error. `parse_input` uses Unicode `trim`, accepts exactly lowercase `q` or nonempty ASCII digits. Leading zeroes are allowed; signs, decimal points and internal whitespace are Syntax. Empty is Empty. Digits outside 1..=100, including integer overflow, are OutOfRange. Parsing never mutates a game.

`Game::new` validates secret 1..=100, then attempts 1..=20. `submit` checks terminal status first, then range; either error leaves state unchanged. Each valid guess consumes one attempt. A correct final guess is Won, not Lost; Won reports total valid attempts used. An incorrect last guess is Lost and reveals the secret, not Low/High. All later submit calls fail Finished. `new_game_with` validates attempts before calling draw, invokes it exactly once on valid attempts, and validates the drawn secret through Game::new. Never redraw on a wrong or invalid guess.

## Stream and terminal contract

`play` receives a newly created Active Game; if supplied a terminal Game, return InvalidInput before writing. Emit exactly `Number Guessing+: 1..100; attempts=N. Enter q to quit.\n` using initial remaining count. Before each input read, write `guess> ` and flush. Lines are LF-separated; a final nonempty line without LF is processed. CRLF works through trim. An empty final read is EOF, not a fabricated guess.

Each raw line is at most 128 bytes before LF (including CR). Read at most 129 raw bytes to detect overflow without materializing the rest. UTF-8 failure or overlong line aborts with io::ErrorKind::InvalidData; these are distinct from a well-formed but invalid guess. Preserve actual read/write/flush errors. A limited reader cannot bound allocations performed inside an arbitrary caller-supplied BufRead.

Output after parsing: `Invalid input. Enter a number from 1 to 100 or q.\n` for any InputError (does not consume an attempt); `Too low; remaining=N.\n` or `Too high; remaining=N.\n`; `Won in N attempts.\n`; `Lost; secret=N.\n`; `Quit.\n`; or `End of input.\n`. Flush terminal output before returning. Quit/EOF do not fabricate a loss. Interactive output may already have been written when an I/O error occurs. The attempt limit bounds valid guesses, not total invalid input or wall time.

CLI: `number-guessing [--attempts N] [--secret N]`, defaults six attempts and random secret. `--secret` is an explicit reproducible practice mode; ordinary play uses random. Each option appears at most once, in either order, with ASCII decimal value. No positional arguments, unknown options, missing values, signs, invalid ranges or duplicate flags. `--help` is accepted only by itself, prints usage and exits 0. Invalid CLI configuration exits 2 on stderr, before a game header or secret draw. Valid configuration calls new_game_with; `--secret` supplies that explicit value, otherwise the function draws random once. Exit 0 for Won, 1 for Lost/Quit/EOF, 2 for configuration/I/O errors. Keep stdin/stdout as adapters around the library; no direct process exits in the library.

## Evidence and maintainer safety

- Write authored tests before references and observe intentional TODO starter failures. Test all parser boundaries, every terminal transition, last-attempt win, repeated terminal calls, invalid input without lost attempts, injected draw count, bounded chunks, CRLF/EOF, prompt flush ordering and failing read/write/flush.
- Test the actual process with --secret for exact low/high/win/loss/quit/EOF transcripts and codes; test bad options without stdout. Exercise normal random invocation using an adaptive bisection driver reading the actual prompt, so it wins within seven guesses without assuming any seeded sequence or requiring random uniqueness. Bound process waits and kill/reap on failure.
- Maintainer mutation checks must reject decrement-on-invalid, redraw-during-round, loss-before-final-win and missing-prompt-flush bugs for the intended test assertion, never merely a compiler error or timeout.
- Fetch only this repository-authored locked package in a dedicated verifier with exact optional `--fetch` and `--msrv`; accept no paths, learner code or dependency overrides. All verification after fetch is offline/locked. The MSRV mode resolves and checks cargo/rustc/rustdoc 1.85.0 and pins all child-process tools; CI covers both stable and this declared minimum. Generic archive verification remains offline-only.
- Validate integration, legacy notes/export/import/resume, package reveal and fresh gates. Extend existing production E2E/offline checks; bump service-worker content version. Independently review authors and integration, then commit/push/PR and merge only after exact-head CI succeeds.

## Sources for the chosen RNG boundary

- https://doc.rust-lang.org/stable/book/ch02-00-guessing-game-tutorial.html
- https://docs.rs/crate/rand/0.10.2/source/Cargo.toml.orig
- https://docs.rs/rand/0.10.2/rand/fn.random_range.html
- https://docs.rs/rand/0.10.2/rand/rngs/struct.ThreadRng.html
- https://rust-random.github.io/book/crate-reprod.html

Rulings: extend the same first project instead of adding a duplicate; compatibility is ID-based. Keep the existing feature checkout and its three release-evidence documentation edits. The previously approved autonomous course-development and release scope covers this milestone; no new deployment or hosting choice is implied.
