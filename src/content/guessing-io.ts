import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

export const guessingIoSources: Source[] = [
  {
    id: "guessing-io-bufread",
    title: "Rust standard library: BufRead",
    url: "https://doc.rust-lang.org/std/io/trait.BufRead.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie fill_buf, consume, EOF lub limitu surowej linii.",
  },
  {
    id: "guessing-io-write",
    title: "Rust standard library: Write",
    url: "https://doc.rust-lang.org/std/io/trait.Write.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie write_all, flush albo przekazywania błędów writer-a.",
  },
  {
    id: "guessing-io-utf8",
    title: "Rust standard library: str::from_utf8",
    url: "https://doc.rust-lang.org/std/str/fn.from_utf8.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie granicy bajtów i tekstu wejściowego.",
  },
  {
    id: "guessing-random-book",
    title: "The Rust Programming Language: Guessing Game",
    url: "https://doc.rust-lang.org/stable/book/ch02-00-guessing-game-tutorial.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie przykładu gry i zależności Cargo.",
  },
  {
    id: "guessing-rand-range",
    title: "rand 0.10.2: random_range",
    url: "https://docs.rs/rand/0.10.2/rand/fn.random_range.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie wersji rand albo zakresu losowania.",
  },
  {
    id: "guessing-rand-thread",
    title: "rand 0.10.2: ThreadRng",
    url: "https://docs.rs/rand/0.10.2/rand/rngs/struct.ThreadRng.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy: "Sprawdzaj przy zmianie źródła losowości w adapterze Cargo.",
  },
  {
    id: "guessing-rand-repro",
    title: "The Rust Rand Book: Reproducibility",
    url: "https://rust-random.github.io/book/crate-reprod.html",
    classification: "stable",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie obietnic powtarzalności albo wersji zależności.",
  },
  {
    id: "guessing-rand-manifest",
    title: "rand 0.10.2 Cargo.toml.orig",
    url: "https://docs.rs/crate/rand/0.10.2/source/Cargo.toml.orig",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdzaj przy zmianie pinowania rand i jego feature flags w pakiecie Cargo.",
  },
];

export const guessingIoCompetencies: Competency[] = [
  {
    id: "guessing-session-stream-contract",
    title:
      "Prowadzisz sesję przez BufRead i Write z promptem flushowanym przed odczytem oraz ograniczoną linią.",
  },
  {
    id: "guessing-injected-secret-boundary",
    title:
      "Walidujesz konfigurację przed FnOnce, wywołujesz losowanie dokładnie raz i oddzielasz politykę od adaptera rand.",
  },
];

export const guessingIoConcepts: Concept[] = [
  {
    id: "guess-session-io",
    title: "Sesja terminalowa jako adapter I/O",
    prerequisites: ["guess-round-state"],
    competencyIds: ["guessing-session-stream-contract"],
    reviewPrompt:
      "Dlaczego prompt musi zostać zapisany i flushowany przed próbą odczytu oraz czym różni się EOF od błędnego tekstu?",
    reviewAnswer:
      "Użytkownik lub terminal widzi prompt dopiero po flush; testowany reader może dzięki temu wykryć złą kolejność. EOF oznacza brak kolejnej linii i kończy sesję jako Eof, a nie jako wymyślony niepoprawny strzał. Błędny tekst jest zwykłym InputError i nie zużywa próby.",
    distinguish:
      "BufRead i Write są adapterami. Ten std-only przykład dowodzi kolejności, granic i propagacji błędów, ale nie dowodzi zachowania procesu CLI.",
  },
  {
    id: "guess-random-boundary",
    title: "Losowanie za granicą polityki",
    prerequisites: ["guess-session-io"],
    competencyIds: ["guessing-injected-secret-boundary"],
    reviewPrompt:
      "Co dokładnie dowodzi licznik closure w new_game_with, a czego nie dowodzi?",
    reviewAnswer:
      "Dowodzi, że niepoprawny limit nie wywołuje FnOnce, a poprawny limit wywołuje ją raz i przekazuje wynik do Game::new. Nie dowodzi, że rand generuje dobrą losowość ani że CLI poprawnie czyta flagi; to są osobne dowody Cargo.",
    distinguish:
      "FnOnce jest kontrolowaną granicą polityki: funkcja wybiera kiedy potrzebuje sekretu. rand::random_range(1..=100), manifest i stdin/stdout należą do zewnętrznego adaptera pakietu.",
  },
];

function choose(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: string,
  choices: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: choices.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: Object.fromEntries(
        explanations.map((item, index) => [String(index), item]),
      ),
    },
    evidenceKind:
      kind === "predict"
        ? "prediction"
        : kind === "recall"
          ? "recall"
          : "exposure",
  };
}
function run(
  id: string,
  title: string,
  prompt: string,
  code: string,
  expected: string,
): LessonStep {
  return {
    id,
    kind: "run",
    title,
    prompt,
    code,
    solution: code,
    expectedStatus: "success",
    evaluator: { kind: "exact-output", expected },
    evidenceKind: "exposure",
  };
}
function exercise(options: {
  id: string;
  kind: "debug" | "blank" | "apply";
  title: string;
  prompt: string;
  code?: string;
  solution: string;
  tests: string;
  hints: [string, string];
  gate?: boolean;
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    code: options.code,
    solution: options.solution,
    hints: options.hints,
    expectedStatus: "success",
    evaluator: { kind: "tests", tests: options.tests },
    evidenceKind: options.kind === "blank" ? "transfer" : "fix",
    evidenceGate: options.gate,
    trustedFixtureTarget: "rustc-2024",
  };
}

const sessionPreamble = String.raw`use std::io::{self, BufRead, Write};

#[derive(Debug, PartialEq, Eq)]
pub enum Input {
    Guess(u32),
    Quit,
}
#[derive(Debug, PartialEq, Eq)]
pub enum InputError {
    Empty,
    Syntax,
    OutOfRange,
}
pub fn parse_input(line: &str) -> Result<Input, InputError> {
    let line = line.trim();
    if line.is_empty() {
        return Err(InputError::Empty);
    }
    if line == "q" {
        return Ok(Input::Quit);
    }
    if !line.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(InputError::Syntax);
    }
    match line.parse::<u32>() {
        Ok(number @ 1..=100) => Ok(Input::Guess(number)),
        _ => Err(InputError::OutOfRange),
    }
}
#[derive(Debug, PartialEq, Eq)]
pub enum Status {
    Active,
    Won,
    Lost,
}
#[derive(Debug, PartialEq, Eq)]
pub enum Feedback {
    Low { remaining: u8 },
    High { remaining: u8 },
    Won { attempts: u8 },
    Lost { secret: u32 },
}
#[derive(Debug, PartialEq, Eq)]
pub enum GameError {
    Finished,
    OutOfRange,
}
#[derive(Debug, PartialEq, Eq)]
pub enum ConfigError {
    Secret,
    Attempts,
}
pub struct Game {
    secret: u32,
    remaining: u8,
    used: u8,
    status: Status,
}
impl Game {
    pub fn new(secret: u32, attempts: u8) -> Result<Self, ConfigError> {
        if !(1..=100).contains(&secret) {
            return Err(ConfigError::Secret);
        }
        if !(1..=20).contains(&attempts) {
            return Err(ConfigError::Attempts);
        }
        Ok(Self {
            secret,
            remaining: attempts,
            used: 0,
            status: Status::Active,
        })
    }
    pub fn remaining(&self) -> u8 {
        self.remaining
    }
    pub fn status(&self) -> Status {
        match self.status {
            Status::Active => Status::Active,
            Status::Won => Status::Won,
            Status::Lost => Status::Lost,
        }
    }
    pub fn submit(&mut self, guess: u32) -> Result<Feedback, GameError> {
        if self.status != Status::Active {
            return Err(GameError::Finished);
        }
        if !(1..=100).contains(&guess) {
            return Err(GameError::OutOfRange);
        }
        self.remaining -= 1;
        self.used += 1;
        if guess == self.secret {
            self.status = Status::Won;
            Ok(Feedback::Won {
                attempts: self.used,
            })
        } else if self.remaining == 0 {
            self.status = Status::Lost;
            Ok(Feedback::Lost {
                secret: self.secret,
            })
        } else if guess < self.secret {
            Ok(Feedback::Low {
                remaining: self.remaining,
            })
        } else {
            Ok(Feedback::High {
                remaining: self.remaining,
            })
        }
    }
}
#[derive(Debug, PartialEq, Eq)]
pub enum SessionOutcome {
    Won,
    Lost,
    Quit,
    Eof,
}
const MAX_LINE: usize = 128;
`;

const sessionStarter =
  sessionPreamble +
  String.raw`pub fn play<R: BufRead, W: Write>(
    _reader: &mut R,
    _writer: &mut W,
    _game: Game,
) -> io::Result<SessionOutcome> {
    todo!("napisz adapter sesji")
}
`;

const sessionSolution =
  sessionPreamble +
  String.raw`fn next_line<R: BufRead>(reader: &mut R) -> io::Result<Option<String>> {
    let mut bytes = Vec::new();
    let mut terminated = false;
    loop {
        let (take, newline, over) = {
            let available = reader.fill_buf()?;
            if available.is_empty() {
                (0, false, false)
            } else if let Some(index) = available.iter().position(|byte| *byte == b'\n') {
                if bytes.len() + index > MAX_LINE {
                    (1, false, true)
                } else {
                    (index + 1, true, false)
                }
            } else if bytes.len() + available.len() <= MAX_LINE {
                (available.len(), false, false)
            } else {
                (MAX_LINE + 1 - bytes.len(), false, true)
            }
        };
        if take == 0 {
            break;
        }
        let available = reader.fill_buf()?;
        if !over {
            bytes.extend_from_slice(&available[..take - usize::from(newline)]);
        }
        reader.consume(take);
        if over {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "input line exceeds 128 bytes",
            ));
        }
        if newline {
            terminated = true;
            break;
        }
    }
    if bytes.is_empty() && !terminated {
        return Ok(None);
    }
    if terminated && bytes.last() == Some(&b'\r') {
        bytes.pop();
    }
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "input is not UTF-8"))
}
pub fn play<R: BufRead, W: Write>(
    reader: &mut R,
    writer: &mut W,
    mut game: Game,
) -> io::Result<SessionOutcome> {
    if game.status() != Status::Active {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "game already finished",
        ));
    }
    writeln!(
        writer,
        "Number Guessing+: 1..100; attempts={}. Enter q to quit.",
        game.remaining()
    )?;
    loop {
        writer.write_all(b"guess> ")?;
        writer.flush()?;
        let Some(line) = next_line(reader)? else {
            writeln!(writer, "End of input.")?;
            writer.flush()?;
            return Ok(SessionOutcome::Eof);
        };
        match parse_input(&line) {
            Err(_) => writeln!(writer, "Invalid input. Enter a number from 1 to 100 or q.")?,
            Ok(Input::Quit) => {
                writeln!(writer, "Quit.")?;
                writer.flush()?;
                return Ok(SessionOutcome::Quit);
            }
            Ok(Input::Guess(guess)) => match game.submit(guess).expect("validated active guess") {
                Feedback::Low { remaining } => writeln!(writer, "Too low; remaining={remaining}.")?,
                Feedback::High { remaining } => {
                    writeln!(writer, "Too high; remaining={remaining}.")?
                }
                Feedback::Won { attempts } => {
                    writeln!(writer, "Won in {attempts} attempts.")?;
                    writer.flush()?;
                    return Ok(SessionOutcome::Won);
                }
                Feedback::Lost { secret } => {
                    writeln!(writer, "Lost; secret={secret}.")?;
                    writer.flush()?;
                    return Ok(SessionOutcome::Lost);
                }
            },
        }
    }
}
`;

const sessionTests = String.raw`use std::cell::Cell;
use std::io::{self, BufRead, Cursor, Read, Write};
use std::rc::Rc;

#[test]
fn processes_a_final_line_without_lf_and_reports_eof_only_after_a_real_empty_read() {
    let mut input = Cursor::new(b"4\r\n7".to_vec());
    let mut output = Vec::new();
    assert_eq!(
        play(&mut input, &mut output, Game::new(7, 2).unwrap()).unwrap(),
        SessionOutcome::Won
    );
    assert_eq!(
        String::from_utf8(output).unwrap(),
        "Number Guessing+: 1..100; attempts=2. Enter q to quit.\nguess> Too low; remaining=1.\nguess> Won in 2 attempts.\n"
    );
    let mut empty = Cursor::new(Vec::<u8>::new());
    let mut output = Vec::new();
    assert_eq!(
        play(&mut empty, &mut output, Game::new(7, 2).unwrap()).unwrap(),
        SessionOutcome::Eof
    );
    assert!(
        String::from_utf8(output)
            .unwrap()
            .ends_with("guess> End of input.\n")
    );
}
#[test]
fn blank_lf_and_crlf_lines_are_invalid_without_consuming_an_attempt() {
    for data in [b"\n7\n".to_vec(), b"\r\n7\n".to_vec()] {
        let mut input = Cursor::new(data);
        let mut output = Vec::new();
        assert_eq!(
            play(&mut input, &mut output, Game::new(7, 1).unwrap()).unwrap(),
            SessionOutcome::Won
        );
        let output = String::from_utf8(output).unwrap();
        assert!(output.contains("Invalid input. Enter a number from 1 to 100 or q.\n"));
        assert!(output.ends_with("guess> Won in 1 attempts.\n"));
    }
}
#[test]
fn invalid_syntax_does_not_consume_attempt_and_high_feedback_is_preserved() {
    let mut input = Cursor::new(b"oops\n9\n7\n".to_vec());
    let mut output = Vec::new();
    assert_eq!(
        play(&mut input, &mut output, Game::new(7, 2).unwrap()).unwrap(),
        SessionOutcome::Won
    );
    assert_eq!(
        String::from_utf8(output).unwrap(),
        "Number Guessing+: 1..100; attempts=2. Enter q to quit.\nguess> Invalid input. Enter a number from 1 to 100 or q.\nguess> Too high; remaining=1.\nguess> Won in 2 attempts.\n"
    );
}
#[test]
fn final_wrong_guess_reports_loss_and_reveals_the_secret() {
    let mut input = Cursor::new(b"6\n".to_vec());
    let mut output = Vec::new();
    assert_eq!(
        play(&mut input, &mut output, Game::new(7, 1).unwrap()).unwrap(),
        SessionOutcome::Lost
    );
    assert_eq!(
        String::from_utf8(output).unwrap(),
        "Number Guessing+: 1..100; attempts=1. Enter q to quit.\nguess> Lost; secret=7.\n"
    );
}
struct FlushBeforeRead {
    data: Vec<u8>,
    position: usize,
    flushed: Rc<Cell<bool>>,
}
impl Read for FlushBeforeRead {
    fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
        let bytes = self.fill_buf()?;
        let n = bytes.len().min(out.len());
        out[..n].copy_from_slice(&bytes[..n]);
        self.consume(n);
        Ok(n)
    }
}
impl BufRead for FlushBeforeRead {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        assert!(self.flushed.get(), "read happened before prompt flush");
        Ok(&self.data[self.position..])
    }
    fn consume(&mut self, amount: usize) {
        self.position += amount;
    }
}
struct ProbeWriter {
    bytes: Vec<u8>,
    flushed: Rc<Cell<bool>>,
    flushes: usize,
    fail_write: bool,
    fail_flush: bool,
}
impl Write for ProbeWriter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        if self.fail_write {
            return Err(io::Error::new(io::ErrorKind::BrokenPipe, "write marker"));
        }
        self.flushed.set(false);
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        if self.fail_flush {
            return Err(io::Error::new(io::ErrorKind::TimedOut, "flush marker"));
        }
        self.flushed.set(true);
        self.flushes += 1;
        Ok(())
    }
}
#[test]
fn flushes_prompt_before_every_read_and_terminal_message() {
    let flushed = Rc::new(Cell::new(false));
    let mut reader = FlushBeforeRead {
        data: b"oops\nq\n".to_vec(),
        position: 0,
        flushed: Rc::clone(&flushed),
    };
    let mut writer = ProbeWriter {
        bytes: Vec::new(),
        flushed,
        flushes: 0,
        fail_write: false,
        fail_flush: false,
    };
    assert_eq!(
        play(&mut reader, &mut writer, Game::new(7, 1).unwrap()).unwrap(),
        SessionOutcome::Quit
    );
    assert_eq!(writer.flushes, 3);
    for (data, game, expected) in [
        (
            b"7\n".to_vec(),
            Game::new(7, 1).unwrap(),
            SessionOutcome::Won,
        ),
        (
            b"6\n".to_vec(),
            Game::new(7, 1).unwrap(),
            SessionOutcome::Lost,
        ),
        (
            b"q\n".to_vec(),
            Game::new(7, 1).unwrap(),
            SessionOutcome::Quit,
        ),
        (Vec::new(), Game::new(7, 1).unwrap(), SessionOutcome::Eof),
    ] {
        let flushed = Rc::new(Cell::new(false));
        let mut reader = FlushBeforeRead {
            data,
            position: 0,
            flushed: Rc::clone(&flushed),
        };
        let mut writer = ProbeWriter {
            bytes: Vec::new(),
            flushed,
            flushes: 0,
            fail_write: false,
            fail_flush: false,
        };
        assert_eq!(play(&mut reader, &mut writer, game).unwrap(), expected);
        assert_eq!(writer.flushes, 2, "terminal output must be flushed");
    }
}
#[test]
fn terminal_game_is_rejected_before_any_write() {
    let mut game = Game::new(7, 1).unwrap();
    assert!(matches!(game.submit(7), Ok(Feedback::Won { .. })));
    let marker = Rc::new(Cell::new(false));
    let mut input = Cursor::new(b"q\n".to_vec());
    let mut writer = ProbeWriter {
        bytes: Vec::new(),
        flushed: marker,
        flushes: 0,
        fail_write: false,
        fail_flush: false,
    };
    let error = play(&mut input, &mut writer, game).unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::InvalidInput);
    assert!(writer.bytes.is_empty());
    assert_eq!(writer.flushes, 0);
}
struct BrokenReader;
impl Read for BrokenReader {
    fn read(&mut self, _: &mut [u8]) -> io::Result<usize> {
        Err(io::Error::new(
            io::ErrorKind::ConnectionReset,
            "read marker",
        ))
    }
}
impl BufRead for BrokenReader {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        Err(io::Error::new(
            io::ErrorKind::ConnectionReset,
            "read marker",
        ))
    }
    fn consume(&mut self, _: usize) {}
}
struct ChunkedReader {
    data: Vec<u8>,
    position: usize,
    chunk: usize,
}
impl Read for ChunkedReader {
    fn read(&mut self, out: &mut [u8]) -> io::Result<usize> {
        let bytes = self.fill_buf()?;
        let n = bytes.len().min(out.len());
        out[..n].copy_from_slice(&bytes[..n]);
        self.consume(n);
        Ok(n)
    }
}
impl BufRead for ChunkedReader {
    fn fill_buf(&mut self) -> io::Result<&[u8]> {
        let end = (self.position + self.chunk).min(self.data.len());
        Ok(&self.data[self.position..end])
    }
    fn consume(&mut self, amount: usize) {
        assert!(
            amount <= 129,
            "adapter consumed more than the bounded probe"
        );
        self.position += amount;
    }
}
#[test]
fn preserves_error_markers_and_rejects_129th_raw_byte_without_waiting_for_lf() {
    let mut reader = BrokenReader;
    let mut output = Vec::new();
    let error = play(&mut reader, &mut output, Game::new(7, 1).unwrap()).unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::ConnectionReset);
    assert_eq!(error.to_string(), "read marker");
    let mut exact = vec![b'1'; 128];
    exact.extend_from_slice(b"\n7\n");
    let mut reader = Cursor::new(exact);
    let mut output = Vec::new();
    assert_eq!(
        play(&mut reader, &mut output, Game::new(7, 1).unwrap()).unwrap(),
        SessionOutcome::Won
    );
    let mut reader = Cursor::new(vec![b'x'; 129]);
    let mut output = Vec::new();
    assert_eq!(
        play(&mut reader, &mut output, Game::new(7, 1).unwrap())
            .unwrap_err()
            .kind(),
        io::ErrorKind::InvalidData
    );
    let mut reader = Cursor::new(vec![0xff, b'\n']);
    let mut output = Vec::new();
    assert_eq!(
        play(&mut reader, &mut output, Game::new(7, 1).unwrap())
            .unwrap_err()
            .kind(),
        io::ErrorKind::InvalidData
    );
    let mut reader = ChunkedReader {
        data: vec![b'x'; 130],
        position: 0,
        chunk: 7,
    };
    let mut output = Vec::new();
    assert_eq!(
        play(&mut reader, &mut output, Game::new(7, 1).unwrap())
            .unwrap_err()
            .kind(),
        io::ErrorKind::InvalidData
    );
    assert_eq!(reader.position, 129);
    let marker = Rc::new(Cell::new(false));
    let mut input = Cursor::new(b"q\n".to_vec());
    let mut bad_write = ProbeWriter {
        bytes: Vec::new(),
        flushed: Rc::clone(&marker),
        flushes: 0,
        fail_write: true,
        fail_flush: false,
    };
    let error = play(&mut input, &mut bad_write, Game::new(7, 1).unwrap()).unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::BrokenPipe);
    assert_eq!(error.to_string(), "write marker");
    let mut input = Cursor::new(b"q\n".to_vec());
    let mut bad_flush = ProbeWriter {
        bytes: Vec::new(),
        flushed: marker,
        flushes: 0,
        fail_write: false,
        fail_flush: true,
    };
    let error = play(&mut input, &mut bad_flush, Game::new(7, 1).unwrap()).unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::TimedOut);
    assert_eq!(error.to_string(), "flush marker");
}
`;

const randomPreamble = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum ConfigError {
    Secret,
    Attempts,
}
#[derive(Debug, PartialEq, Eq)]
pub struct Game {
    secret: u32,
    attempts: u8,
}
impl Game {
    pub fn new(secret: u32, attempts: u8) -> Result<Self, ConfigError> {
        if !(1..=100).contains(&secret) {
            return Err(ConfigError::Secret);
        }
        if !(1..=20).contains(&attempts) {
            return Err(ConfigError::Attempts);
        }
        Ok(Self { secret, attempts })
    }
}
`;
const randomStarter =
  randomPreamble +
  String.raw`pub fn new_game_with<F: FnOnce() -> u32>(_attempts: u8, _draw: F) -> Result<Game, ConfigError> {
    todo!("waliduj przed losowaniem")
}
`;
const randomSolution =
  randomPreamble +
  String.raw`pub fn new_game_with<F: FnOnce() -> u32>(attempts: u8, draw: F) -> Result<Game, ConfigError> {
    if !(1..=20).contains(&attempts) {
        return Err(ConfigError::Attempts);
    }
    Game::new(draw(), attempts)
}
`;
const randomTests = String.raw`use std::cell::Cell;
#[test]
fn validates_zero_attempts_before_calling_the_fn_once_drawer() {
    let calls = Cell::new(0);
    assert_eq!(
        new_game_with(0, || {
            calls.set(calls.get() + 1);
            7
        }),
        Err(ConfigError::Attempts)
    );
    assert_eq!(calls.get(), 0);
}
#[test]
fn validates_twenty_one_attempts_before_calling_the_fn_once_drawer() {
    let calls = Cell::new(0);
    assert_eq!(
        new_game_with(21, || {
            calls.set(calls.get() + 1);
            7
        }),
        Err(ConfigError::Attempts)
    );
    assert_eq!(calls.get(), 0);
}
#[test]
fn accepts_the_twenty_attempt_limit_and_draws_once() {
    let calls = Cell::new(0);
    assert_eq!(
        new_game_with(20, || {
            calls.set(calls.get() + 1);
            42
        })
        .unwrap(),
        Game {
            secret: 42,
            attempts: 20
        }
    );
    assert_eq!(calls.get(), 1);
}
#[test]
fn draws_once_for_valid_configuration_and_preserves_secret_errors_without_redraw() {
    let calls = Cell::new(0);
    assert_eq!(
        new_game_with(3, || {
            calls.set(calls.get() + 1);
            101
        }),
        Err(ConfigError::Secret)
    );
    assert_eq!(calls.get(), 1);
    let calls = Cell::new(0);
    assert_eq!(
        new_game_with(3, || {
            calls.set(calls.get() + 1);
            42
        })
        .unwrap(),
        Game {
            secret: 42,
            attempts: 3
        }
    );
    assert_eq!(calls.get(), 1);
}
`;

const shiftBlankSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum ShiftError {
    Crew,
    Badge,
    Reserved,
}
#[derive(Debug, PartialEq, Eq)]
pub struct Shift {
    badge: u16,
    crew: u8,
}
pub fn assign_shift_with<F: FnOnce() -> u16>(
    crew: u8,
    reserved: &[u16],
    choose_badge: F,
) -> Result<Shift, ShiftError> {
    if !(2..=9).contains(&crew) {
        return Err(ShiftError::Crew);
    }
    let badge = choose_badge();
    if !(100..=999).contains(&badge) {
        return Err(ShiftError::Badge);
    }
    if reserved.contains(&badge) {
        return Err(ShiftError::Reserved);
    }
    Ok(Shift { badge, crew })
}
`;
const shiftBlankTests = String.raw`use std::cell::Cell;
#[test]
fn crew_is_checked_before_badge_source() {
    let calls = Cell::new(0);
    assert_eq!(
        assign_shift_with(1, &[321], || {
            calls.set(1);
            321
        }),
        Err(ShiftError::Crew)
    );
    assert_eq!(calls.get(), 0);
}
#[test]
fn a_valid_crew_consumes_one_badge_and_keeps_its_exact_value() {
    let calls = Cell::new(0);
    assert_eq!(
        assign_shift_with(4, &[999], || {
            calls.set(calls.get() + 1);
            321
        })
        .unwrap(),
        Shift {
            badge: 321,
            crew: 4
        }
    );
    assert_eq!(calls.get(), 1);
}
#[test]
fn reserved_badge_is_rejected_without_redrawing_even_when_reserved_twice() {
    let calls = Cell::new(0);
    assert_eq!(
        assign_shift_with(4, &[321, 321], || {
            calls.set(calls.get() + 1);
            321
        }),
        Err(ShiftError::Reserved)
    );
    assert_eq!(calls.get(), 1);
}
#[test]
fn badge_range_is_checked_after_the_single_source_call() {
    let calls = Cell::new(0);
    assert_eq!(
        assign_shift_with(4, &[], || {
            calls.set(calls.get() + 1);
            99
        }),
        Err(ShiftError::Badge)
    );
    assert_eq!(calls.get(), 1);
}

#[test]
fn shift_accepts_both_inclusive_boundaries_and_rejects_upper_overflow() {
    for crew in [2, 9] {
        for badge in [100, 999] {
            assert_eq!(assign_shift_with(crew, &[], || badge), Ok(Shift { badge, crew }));
        }
    }
    let calls = Cell::new(0);
    assert_eq!(assign_shift_with(10, &[], || { calls.set(calls.get() + 1); 100 }), Err(ShiftError::Crew));
    assert_eq!(calls.get(), 0);
    assert_eq!(assign_shift_with(9, &[], || { calls.set(calls.get() + 1); 1000 }), Err(ShiftError::Badge));
    assert_eq!(calls.get(), 1);
}
`;
const laneReviewSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum SourceError {
    Offline,
}
#[derive(Debug, PartialEq, Eq)]
pub enum LaneError {
    Slots,
    Ticket,
    Source(SourceError),
}
#[derive(Debug, PartialEq, Eq)]
pub struct Lane {
    ticket: u16,
    slots: u8,
}
pub fn open_lane_with<F: FnOnce() -> Result<u16, SourceError>>(
    slots: u8,
    ticket_source: F,
) -> Result<Lane, LaneError> {
    if !(1..=4).contains(&slots) {
        return Err(LaneError::Slots);
    }
    let ticket = ticket_source().map_err(LaneError::Source)?;
    if !(5000..=5999).contains(&ticket) {
        return Err(LaneError::Ticket);
    }
    Ok(Lane { ticket, slots })
}
`;
const laneReviewTests = String.raw`use std::cell::Cell;
#[test]
fn slot_error_does_not_consume_ticket_source() {
    let seen = Cell::new(0);
    assert_eq!(
        open_lane_with(0, || {
            seen.set(1);
            Ok(5000)
        }),
        Err(LaneError::Slots)
    );
    assert_eq!(seen.get(), 0);
}
#[test]
fn ticket_is_drawn_once_after_slot_validation() {
    let seen = Cell::new(0);
    assert_eq!(
        open_lane_with(2, || {
            seen.set(seen.get() + 1);
            Ok(5123)
        })
        .unwrap(),
        Lane {
            ticket: 5123,
            slots: 2
        }
    );
    assert_eq!(seen.get(), 1);
}
#[test]
fn source_failure_is_propagated_without_retry() {
    let seen = Cell::new(0);
    assert_eq!(
        open_lane_with(2, || {
            seen.set(seen.get() + 1);
            Err(SourceError::Offline)
        }),
        Err(LaneError::Source(SourceError::Offline))
    );
    assert_eq!(seen.get(), 1);
}
#[test]
fn invalid_ticket_is_rejected_after_one_source_call() {
    let seen = Cell::new(0);
    assert_eq!(
        open_lane_with(2, || {
            seen.set(seen.get() + 1);
            Ok(4999)
        }),
        Err(LaneError::Ticket)
    );
    assert_eq!(seen.get(), 1);
}
`;

const sessionRun = String.raw`use std::io::{BufRead, Cursor};
fn main() {
    let mut input = Cursor::new(b"pierwsza\ndruga".to_vec());
    let mut line = String::new();
    input.read_line(&mut line).unwrap();
    print!("{line}");
    line.clear();
    input.read_line(&mut line).unwrap();
    print!("{line}");
}
`;
const randomRun = String.raw`fn new_game_with(draw: impl FnOnce() -> u32) -> u32 {
    draw()
}
fn main() {
    let secret = new_game_with(|| 37);
    println!("secret={secret}");
}
`;

export const guessingIoLessons: Lesson[] = [
  {
    id: "guess-session-io",
    moduleId: "number-guessing-plus",
    conceptIds: ["guess-session-io"],
    competencyIds: ["guessing-session-stream-contract"],
    prerequisites: ["guess-round-state"],
    title: "Sesja: prompt, linia i zakończenie",
    subtitle:
      "Wyjście musi dotrzeć do użytkownika zanim adapter zacznie czekać na wejście.",
    minutes: 32,
    outcomes: [
      "Flushujesz prompt przed każdym odczytem.",
      "Rozróżniasz końcową linię bez LF, EOF i niepoprawne wejście.",
      "Ograniczasz linię do 128 surowych bajtów i przekazujesz błędy I/O.",
    ],
    steps: [
      choose(
        "guess-session-io-predict",
        "predict",
        "Czy prompt jest już widoczny?",
        "Writer buforuje `guess> `. Co musi zdarzyć się przed readerem?",
        "1",
        [
          "Sam write_all wystarcza",
          "Trzeba wywołać flush",
          "Reader sam opróżnia writer",
        ],
        [
          "Zapis może pozostać w buforze.",
          "Tak: kontrakt interaktywny wymaga flush przed odczytem.",
          "Reader nie zarządza obcym writerem.",
        ],
      ),
      run(
        "guess-session-io-run",
        "Końcowa linia nie znika",
        "Uruchom przykład: drugi read_line zwraca dane mimo braku LF.",
        sessionRun,
        "pierwsza\ndruga",
      ),
      choose(
        "guess-session-io-explain",
        "explain",
        "EOF to nie literówka",
        "Co powinno się stać, gdy BufRead zwraca pusty buffer przed kolejną linią?",
        "2",
        [
          "Zużyć próbę za błędny strzał",
          "Dopisać pusty String i dalej pytać",
          "Zakończyć jako Eof",
        ],
        [
          "EOF nie jest poleceniem gracza.",
          "To tworzy sztuczne wejście.",
          "Tak: kończymy bez fabrykowania zgadywania.",
        ],
      ),
      exercise({
        id: "guess-session-io-gate",
        kind: "debug",
        title: "Napraw adapter sesji",
        prompt:
          "Uzupełnij `play` dla dostarczonych parsera i Game. Zakończona gra zwraca InvalidInput przed zapisem.\n\nNagłówek to `Number Guessing+: 1..100; attempts=N. Enter q to quit.` z LF; N to początkowa liczba prób.\nPrzed każdą linią zapisz `guess> ` bez LF i wywołaj flush.\n\nBłąd parsera wypisuje `Invalid input. Enter a number from 1 to 100 or q.` bez zużycia próby.\nLow i High wypisują odpowiednio `Too low; remaining=N.` oraz `Too high; remaining=N.`.\nWyniki terminalne wypisują `Won in N attempts.`, `Lost; secret=N.`, `Quit.` albo `End of input.` i zwracają odpowiadający SessionOutcome.\nKażdy komunikat poza promptem kończy LF; wynik terminalny także flushuj.\n\nPusta linia jest błędnym wejściem, a EOF bez danych kończy sesję. Przetwórz CRLF i ostatnią niepustą linię bez LF.\nLimit to 128 surowych bajtów przed LF, wliczając CR; wykryj przekroczenie, konsumując najwyżej 129 bajtów.\nNadmiar i błędne UTF-8 zwracają InvalidData. Zachowaj oryginalne błędy read/write/flush. Użyj dostarczonych adapterów BufRead/Write.",
        code: sessionStarter,
        solution: sessionSolution,
        tests: sessionTests,
        hints: [
          "Zbuduj mały next_line na fill_buf/consume; po 128 bajtach wolno obejrzeć tylko kolejny bajt potrzebny do decyzji.",
          'Po `write_all(b"guess> ")` wywołaj flush zanim dotkniesz readera; po wyniku końcowym flushuj tekst końcowy.',
        ],
        gate: true,
      }),
      exercise({
        id: "guess-session-io-blank",
        kind: "blank",
        title: "Odbiór komunikatu dyspozytora",
        prompt:
          "Od pustej kartki napisz odbiornik `receive_notice`. Protokół ma w nagłówku napisać `NOTICE READY\n`, przed każdym odczytem `notice> ` i flush. Odczytaj jedną linię o limicie 64 surowych bajtów przed LF (wliczając CR), pozostawiając kolejną linię w readerze; zwróć `Ok(Some(String))` dla poprawnego UTF-8, `Ok(None)` tylko dla EOF bez danych; CRLF normalizuj, usuwając CR wyłącznie wtedy, gdy nastąpiło po nim LF. Samotny CR przed EOF jest częścią tekstu komunikatu. W przeciwieństwie do gry nie ma parsowania poleceń ani pętli: pojedynczy komunikat bez LF jest prawidłowy, a błędy odczytu, zapisu i flush przekaż wywołującemu bez zmian.",
        solution: String.raw`use std::io::{self, BufRead, Write};
pub fn receive_notice<R: BufRead, W: Write>(
    reader: &mut R,
    writer: &mut W,
) -> io::Result<Option<String>> {
    writer.write_all(b"NOTICE READY\nnotice> ")?;
    writer.flush()?;
    let mut bytes = Vec::new();
    let mut terminated = false;
    loop {
        let (n, nl, over) = {
            let b = reader.fill_buf()?;
            if b.is_empty() {
                (0, false, false)
            } else if let Some(i) = b.iter().position(|x| *x == b'\n') {
                if bytes.len() + i > 64 {
                    (1, false, true)
                } else {
                    (i + 1, true, false)
                }
            } else if bytes.len() + b.len() <= 64 {
                (b.len(), false, false)
            } else {
                (65 - bytes.len(), false, true)
            }
        };
        if n == 0 {
            break;
        };
        let b = reader.fill_buf()?;
        if !over {
            bytes.extend_from_slice(&b[..n - usize::from(nl)])
        };
        reader.consume(n);
        if over {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                "notice too long",
            ));
        };
        if nl {
            terminated = true;
            break;
        }
    }
    if bytes.is_empty() && !terminated {
        return Ok(None);
    };
    if terminated && bytes.last() == Some(&b'\r') {
        bytes.pop();
    }
    String::from_utf8(bytes)
        .map(Some)
        .map_err(|_| io::Error::new(io::ErrorKind::InvalidData, "notice is not UTF-8"))
}
`,
        tests: String.raw`use std::io::Cursor;
#[test]
fn header_prompt_and_final_notice_are_observable() {
    let mut input = Cursor::new(b"alarm".to_vec());
    let mut output = Vec::new();
    assert_eq!(
        receive_notice(&mut input, &mut output).unwrap(),
        Some(String::from("alarm"))
    );
    assert_eq!(output, b"NOTICE READY\nnotice> ");
}
#[test]
fn blank_lf_and_crlf_are_messages_but_empty_eof_is_none() {
    for data in [b"\n".to_vec(), b"\r\n".to_vec()] {
        let mut input = Cursor::new(data);
        let mut output = Vec::new();
        assert_eq!(
            receive_notice(&mut input, &mut output).unwrap(),
            Some(String::new())
        );
    }
    let mut input = Cursor::new(Vec::<u8>::new());
    let mut output = Vec::new();
    assert_eq!(receive_notice(&mut input, &mut output).unwrap(), None);
}
#[test]
fn lone_cr_at_eof_is_payload_and_lf_only_removes_the_terminator() {
    for (bytes, expected) in [
        (b"alarm\n".as_slice(), "alarm"),
        (b"alarm\r\n".as_slice(), "alarm"),
        (b"alarm\r".as_slice(), "alarm\r"),
        (b"\r".as_slice(), "\r"),
        (b"alarm".as_slice(), "alarm"),
    ] {
        let mut input = Cursor::new(bytes);
        let mut output = Vec::new();
        assert_eq!(receive_notice(&mut input, &mut output).unwrap().as_deref(), Some(expected));
    }
}
#[test]
fn notice_flush_precedes_every_input_access() {
    use std::cell::Cell;
    use std::rc::Rc;
    struct Writer { written: Vec<u8>, flushed: Rc<Cell<bool>> }
    impl std::io::Write for Writer {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            self.written.extend_from_slice(bytes);
            Ok(bytes.len())
        }
        fn flush(&mut self) -> std::io::Result<()> {
            self.flushed.set(self.written == b"NOTICE READY\nnotice> ");
            Ok(())
        }
    }
    struct Reader { data: Cursor<Vec<u8>>, flushed: Rc<Cell<bool>> }
    impl std::io::Read for Reader {
        fn read(&mut self, out: &mut [u8]) -> std::io::Result<usize> {
            assert!(self.flushed.get(), "prompt must be flushed before read");
            std::io::Read::read(&mut self.data, out)
        }
    }
    impl std::io::BufRead for Reader {
        fn fill_buf(&mut self) -> std::io::Result<&[u8]> {
            assert!(self.flushed.get(), "prompt must be flushed before fill_buf");
            std::io::BufRead::fill_buf(&mut self.data)
        }
        fn consume(&mut self, count: usize) { std::io::BufRead::consume(&mut self.data, count); }
    }
    let flushed = Rc::new(Cell::new(false));
    let mut reader = Reader { data: Cursor::new(b"alarm\nnext\n".to_vec()), flushed: Rc::clone(&flushed) };
    let mut writer = Writer { written: Vec::new(), flushed };
    assert_eq!(receive_notice(&mut reader, &mut writer).unwrap().as_deref(), Some("alarm"));
    assert_eq!(reader.data.position(), 6, "the following notice remains unread");
}
#[test]
fn notice_preserves_read_write_and_flush_errors() {
    use std::io::{self, BufRead, Read, Write};
    struct BrokenReader;
    impl Read for BrokenReader {
        fn read(&mut self, _: &mut [u8]) -> io::Result<usize> { Err(io::Error::new(io::ErrorKind::ConnectionReset, "notice read marker")) }
    }
    impl BufRead for BrokenReader {
        fn fill_buf(&mut self) -> io::Result<&[u8]> { Err(io::Error::new(io::ErrorKind::ConnectionReset, "notice read marker")) }
        fn consume(&mut self, _: usize) {}
    }
    struct BrokenWriter { fail_write: bool }
    impl Write for BrokenWriter {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            if self.fail_write { Err(io::Error::new(io::ErrorKind::BrokenPipe, "notice write marker")) } else { Ok(bytes.len()) }
        }
        fn flush(&mut self) -> io::Result<()> { Err(io::Error::new(io::ErrorKind::TimedOut, "notice flush marker")) }
    }
    let error = receive_notice(&mut BrokenReader, &mut Vec::new()).unwrap_err();
    assert_eq!(error.kind(), io::ErrorKind::ConnectionReset);
    assert_eq!(error.to_string(), "notice read marker");
    for (fail_write, kind, marker) in [
        (true, io::ErrorKind::BrokenPipe, "notice write marker"),
        (false, io::ErrorKind::TimedOut, "notice flush marker"),
    ] {
        let mut reader = Cursor::new(b"alarm\n".as_slice());
        let error = receive_notice(&mut reader, &mut BrokenWriter { fail_write }).unwrap_err();
        assert_eq!(error.kind(), kind);
        assert_eq!(error.to_string(), marker);
        assert_eq!(reader.position(), 0, "output failure must precede input");
    }
}
#[test]
fn notice_counts_raw_bytes_before_normalizing_crlf_and_rejects_invalid_utf8() {
    for suffix in [b"".as_slice(), b"\n".as_slice()] {
        let mut bytes = vec![b'x'; 64];
        bytes.extend_from_slice(suffix);
        let mut reader = Cursor::new(bytes);
        assert_eq!(receive_notice(&mut reader, &mut Vec::new()).unwrap().unwrap().len(), 64);
    }
    let mut exact_crlf = vec![b'x'; 63];
    exact_crlf.extend_from_slice(b"\r\n");
    assert_eq!(receive_notice(&mut Cursor::new(exact_crlf), &mut Vec::new()).unwrap().unwrap().len(), 63);
    let mut excessive_crlf = vec![b'x'; 64];
    excessive_crlf.extend_from_slice(b"\r\n");
    let error = receive_notice(&mut Cursor::new(excessive_crlf), &mut Vec::new()).unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
    let error = receive_notice(&mut Cursor::new(vec![0xff, b'\n']), &mut Vec::new()).unwrap_err();
    assert_eq!(error.kind(), std::io::ErrorKind::InvalidData);
}
#[test]
fn over_limit_is_invalid_data() {
    let mut input = Cursor::new(vec![b'x'; 65]);
    let mut output = Vec::new();
    assert_eq!(
        receive_notice(&mut input, &mut output).unwrap_err().kind(),
        std::io::ErrorKind::InvalidData
    );
}
`,
        hints: [
          "Ten transfer ma jeden komunikat i limit 64, więc nie kopiuj pętli gry bez zmiany kontraktu.",
          "Header i prompt mogą być zapisane razem, ale flush nadal musi zajść przed fill_buf.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "write_all nie obiecuje widoczności promptu bez flush.",
      "Brak LF na końcu prawidłowych danych nie jest EOF przed linią.",
      "read_line/read_until do rosnącego bufora nie ogranicza alokacji przed kontrolą limitu.",
    ],
    transferTask:
      "Zaprojektuj odbiór pojedynczego komunikatu urządzenia z innym limitem oraz wyraźnym EOF, bez kopiowania sesji gry.",
    evidenceGate:
      "Testy obserwują flush przed odczytem, terminalny EOF, CRLF i finalną linię, granicę 128/129 oraz oryginalne rodzaje błędów I/O.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "guess-session-io-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw sesję korzystającą z BufRead i Write. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "guess-session-io-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Odtwórz sesję od pustej kartki i sprawdź błędy I/O. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: guessingIoSources.slice(0, 3).map((source) => source.id),
  },
  {
    id: "guess-random-boundary",
    moduleId: "number-guessing-plus",
    conceptIds: ["guess-random-boundary"],
    competencyIds: ["guessing-injected-secret-boundary"],
    prerequisites: ["guess-session-io"],
    title: "Sekret losowany tylko raz",
    subtitle: "Najpierw walidacja polityki, potem pojedyncze wywołanie FnOnce.",
    minutes: 24,
    outcomes: [
      "Nie uruchamiasz draw dla błędnej liczby prób.",
      "Przekazujesz sekret do Game::new i nie maskujesz jego błędu.",
      "Wiesz, że rand i CLI są dowodem Cargo poza ćwiczeniem przeglądarkowym.",
    ],
    steps: [
      choose(
        "guess-random-boundary-predict",
        "predict",
        "Czy wolno już losować?",
        "attempts=0, a draw zwiększa licznik. Jaki wynik jest wymagany?",
        "0",
        ["Attempts i licznik 0", "Attempts i licznik 1", "Secret i licznik 1"],
        [
          "Tak: walidacja limitu wyprzedza FnOnce.",
          "Niepotrzebny draw łamie granicę polityki.",
          "Sekret nie powinien być jeszcze znany.",
        ],
      ),
      run(
        "guess-random-boundary-run",
        "Wstrzyknięta deterministyczna wartość",
        "Ćwiczenie nie używa rand. Closure daje kontrolowaną wartość do obserwacji.",
        randomRun,
        "secret=37\n",
      ),
      choose(
        "guess-random-boundary-explain",
        "explain",
        "Jaki dowód daje closure?",
        "Które stwierdzenie jest prawdziwe?",
        "1",
        [
          "Test closure potwierdza losowość ThreadRng.",
          "Test closure potwierdza liczbę i chwilę wywołań, nie jakość rand.",
          "FnOnce pozwala poprawnie wylosować kilka sekretów.",
        ],
        [
          "Nie ma tu ThreadRng.",
          "Dokładnie: losowość i CLI bada pakiet Cargo.",
          "FnOnce może zostać wywołane co najwyżej raz.",
        ],
      ),
      exercise({
        id: "guess-random-boundary-gate",
        kind: "debug",
        title: "Waliduj przed draw",
        prompt:
          "Uzupełnij `new_game_with`. Dla attempts poza 1..=20 zwróć ConfigError::Attempts bez wywołania FnOnce. Dla poprawnego limitu wywołaj draw dokładnie raz i przekaż sekret do Game::new, zachowując ConfigError::Secret. To jest test polityki; właściwy pakiet osobno używa `rand::random_range(1..=100)`, przypiętego rand 0.10.2 i testów CLI.",
        code: randomStarter,
        solution: randomSolution,
        tests: randomTests,
        hints: [
          "Granica attempts jest znana przed wywołaniem closure.",
          "Nie zamieniaj błędu Game::new na nowy ani nie próbuj losować drugi raz.",
        ],
        gate: true,
      }),
      exercise({
        id: "guess-random-boundary-blank",
        kind: "blank",
        title: "Przydział identyfikatora zmiany",
        prompt:
          "Od pustej kartki zaimplementuj `assign_shift_with`. Najpierw zaakceptuj crew tylko w 2..=9, potem pojedynczy FnOnce wybiera badge. Badge musi być w 100..=999 i nie może znajdować się na przekazanej liście zarezerwowanych identyfikatorów; kolizja zwraca ShiftError::Reserved bez ponawiania źródła. Zwróć Shift albo odpowiedni ShiftError. To inna dziedzina i inne granice niż sekretny numer gry, lecz zachowuje zasadę: walidacja niezależnej konfiguracji przed źródłem jednorazowej wartości.",
        solution: shiftBlankSolution,
        tests: shiftBlankTests,
        hints: [
          "Crew sprawdzasz zanim zmienna badge w ogóle istnieje.",
          "Zapisz wynik closure do lokalnego badge, sprawdź zakres i listę rezerwacji raz; FnOnce nie może zostać użyte ponownie.",
        ],
        gate: true,
      }),
    ],
    misconceptions: [
      "Wstrzyknięte closure ma udowodnić jakość generatora losowego.",
      "Błędny sekret uzasadnia kolejne losowanie.",
      "Warunek limitu można sprawdzić po wywołaniu FnOnce bez znaczenia dla kontraktu.",
    ],
    transferTask:
      "Przenieś granicę jednorazowego źródła wartości do przydziału innego zasobu z odmiennym zakresem i walidacją.",
    evidenceGate:
      "Testy liczą wywołania: 0 dla złej konfiguracji, 1 dla poprawnej, również gdy sekret jest błędny.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "guess-random-boundary-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw granicę wstrzykiwanego sekretu. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "guess-random-boundary-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Odtwórz granicę sekretu od pustej kartki w odrębnym kontrakcie. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: guessingIoSources.slice(3).map((source) => source.id),
  },
];

export const guessingIoReviewExercises: Record<string, LessonStep> = {
  "guess-session-io": exercise({
    id: "review-guess-session-io",
    kind: "apply",
    title: "Powtórka: gotowość skanera",
    prompt:
      "Napisz `announce_scanner`. Przyjmuje Write i identyfikator stanowiska 1..=99. Dla prawidłowego identyfikatora zapisuje dokładnie `SCANNER N READY` z końcowym LF, potem flushuje i zwraca Ok(()). Dla 0 lub wartości ponad 99 zwraca InvalidInput bez write ani flush. To nie jest sesja gry: nie czyta linii i nie ma limitu wejścia, lecz nadal sprawdza widoczność komunikatu przez flush. Zachowaj oryginalny błąd write lub flush; po błędzie write nie flushuj.",
    solution: String.raw`use std::io::{self, Write};
pub fn announce_scanner<W: Write>(writer: &mut W, station: u8) -> io::Result<()> {
    if !(1..=99).contains(&station) {
        return Err(io::Error::new(io::ErrorKind::InvalidInput, "station"));
    }
    writeln!(writer, "SCANNER {station} READY")?;
    writer.flush()
}
`,
    tests: String.raw`use std::io::{self, Write};
struct Probe {
    text: Vec<u8>,
    flushes: usize,
}
impl Write for Probe {
    fn write(&mut self, b: &[u8]) -> io::Result<usize> {
        self.text.extend_from_slice(b);
        Ok(b.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        self.flushes += 1;
        Ok(())
    }
}
#[test]
fn valid_station_writes_exact_announcement_then_flushes() {
    let mut probe = Probe {
        text: Vec::new(),
        flushes: 0,
    };
    announce_scanner(&mut probe, 7).unwrap();
    assert_eq!(probe.text, b"SCANNER 7 READY\n");
    assert_eq!(probe.flushes, 1);
}
#[test]
fn invalid_station_touches_no_output() {
    let mut probe = Probe {
        text: Vec::new(),
        flushes: 0,
    };
    assert_eq!(
        announce_scanner(&mut probe, 0).unwrap_err().kind(),
        io::ErrorKind::InvalidInput
    );
    assert!(probe.text.is_empty());
    assert_eq!(probe.flushes, 0);
}

#[test]
fn scanner_preserves_original_output_error_and_skips_flush_after_write_failure() {
    struct Broken { fail_write: bool, flushes: usize }
    impl Write for Broken {
        fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
            if self.fail_write { Err(io::Error::new(io::ErrorKind::BrokenPipe, "scanner write marker")) } else { Ok(bytes.len()) }
        }
        fn flush(&mut self) -> io::Result<()> {
            self.flushes += 1;
            Err(io::Error::new(io::ErrorKind::TimedOut, "scanner flush marker"))
        }
    }
    for (fail_write, kind, message, flushes) in [
        (true, io::ErrorKind::BrokenPipe, "scanner write marker", 0),
        (false, io::ErrorKind::TimedOut, "scanner flush marker", 1),
    ] {
        let mut writer = Broken { fail_write, flushes: 0 };
        let error = announce_scanner(&mut writer, 99).unwrap_err();
        assert_eq!(error.kind(), kind);
        assert_eq!(error.to_string(), message);
        assert_eq!(writer.flushes, flushes);
    }
}
`,
    hints: [
      "Walidacja stanowiska nie wymaga writer-a, więc wykonaj ją przed writeln!.",
      "writeln! daje końcowy LF; zwróć bezpośrednio wynik flush.",
    ],
  }),
  "guess-random-boundary": exercise({
    id: "review-guess-random-boundary",
    kind: "apply",
    title: "Powtórka: otwarcie pasa",
    prompt:
      "Napisz `open_lane_with`: slots jest w 1..=4 i musi zostać zatwierdzone przed jednym FnOnce ticket_source. Źródło może zwrócić błąd, który trzeba opakować jako LaneError::Source bez ponawiania; poprawny ticket ma należeć do 5000..=5999. Zwróć Lane albo LaneError.",
    solution: laneReviewSolution,
    tests: laneReviewTests,
    hints: [
      "Walidacja slots nie potrzebuje ticket, więc poprzedza closure.",
      "Przenieś błąd źródła do LaneError i nie wywołuj FnOnce ponownie.",
    ],
  }),
};
