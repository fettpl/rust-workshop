import type {
  Competency,
  Concept,
  Lesson,
  LessonStep,
  Source,
} from "@/domain/types";

const reviewedAt = "2026-09-13";

function choice(
  id: string,
  kind: "predict" | "explain" | "recall",
  title: string,
  prompt: string,
  correct: string,
  labels: [string, string, string],
  explanations: [string, string, string],
): LessonStep {
  return {
    id,
    kind,
    title,
    prompt,
    choices: labels.map((label, index) => ({ id: String(index), label })),
    evaluator: {
      kind: "choice",
      correct,
      explanations: Object.fromEntries(
        explanations.map((value, index) => [String(index), value]),
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
    evaluator: { kind: "exact-output", expected },
    expectedStatus: "success",
    evidenceKind: "exposure",
  };
}

function exercise(options: {
  id: string;
  kind: "debug" | "apply" | "blank";
  title: string;
  prompt: string;
  solution: string;
  tests: string;
  code?: string;
  hints: [string, string];
}): LessonStep {
  return {
    id: options.id,
    kind: options.kind,
    title: options.title,
    prompt: options.prompt,
    ...(options.code === undefined
      ? {}
      : { code: options.code, expectedStatus: "success" as const }),
    solution: options.solution,
    hints: options.hints,
    evaluator: {
      kind: "tests",
      tests: options.tests,
    },
    evidenceKind:
      options.kind === "blank"
        ? "assessment"
        : options.kind === "debug"
          ? "fix"
          : "transfer",
    evidenceGate: true,
  };
}

const inputStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
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

pub fn parse_input(_line: &str) -> Result<Input, InputError> {
    todo!("parse_input")
}
`;

const inputSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
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
impl std::fmt::Display for InputError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Empty => "Empty",
            Self::Syntax => "Syntax",
            Self::OutOfRange => "OutOfRange",
        })
    }
}
impl std::error::Error for InputError {}

pub fn parse_input(line: &str) -> Result<Input, InputError> {
    let text = line.trim();
    if text.is_empty() {
        return Err(InputError::Empty);
    }
    if text == "q" {
        return Ok(Input::Quit);
    }
    if !text.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(InputError::Syntax);
    }
    let value = match text.parse::<u32>() {
        Ok(value) => value,
        Err(_) => return Err(InputError::OutOfRange),
    };
    if !(1..=100).contains(&value) {
        return Err(InputError::OutOfRange);
    }
    Ok(Input::Guess(value))
}
`;

const inputTests = String.raw`#[test]
fn accepts_only_trimmed_lowercase_q_or_ascii_digits_in_range() {
    assert_eq!(parse_input("  007\u{2003}"), Ok(Input::Guess(7)));
    assert_eq!(parse_input("\nq\r"), Ok(Input::Quit));
    assert_eq!(parse_input("1"), Ok(Input::Guess(1)));
    assert_eq!(parse_input("100"), Ok(Input::Guess(100)));
}

#[test]
fn distinguishes_empty_syntax_and_range_including_overflow() {
    assert_eq!(parse_input("\u{2002}\t\r\n"), Err(InputError::Empty));
    for text in ["Q", " quit", "+7", "-7", "7.0", "7 0", "１２", "7\n0"] {
        assert_eq!(parse_input(text), Err(InputError::Syntax), "{text:?}");
    }
    for text in ["0", "101", "4294967296", "999999999999999999999999"] {
        assert_eq!(parse_input(text), Err(InputError::OutOfRange), "{text:?}");
    }
}
#[test]
fn input_error_is_an_ordinary_error_value() {
    fn accepts_error<E: std::error::Error>(_: &E) {}
    accepts_error(&InputError::Syntax);
    assert_eq!(InputError::OutOfRange.to_string(), "OutOfRange");
}
`;

const inputBlankSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum Command {
    Set(u16),
    Stop,
}
#[derive(Debug, PartialEq, Eq)]
pub enum CommandError {
    Empty,
    Syntax,
    OutOfRange,
}

pub fn parse_command(line: &str) -> Result<Command, CommandError> {
    let text = line.trim();
    if text.is_empty() {
        return Err(CommandError::Empty);
    }
    if text == "stop" {
        return Ok(Command::Stop);
    }
    let Some(number) = text.strip_prefix("set:") else {
        return Err(CommandError::Syntax);
    };
    if number.is_empty() || !number.bytes().all(|byte| byte.is_ascii_digit()) {
        return Err(CommandError::Syntax);
    }
    let value = match number.parse::<u16>() {
        Ok(value) => value,
        Err(_) => return Err(CommandError::OutOfRange),
    };
    if !(1..=999).contains(&value) {
        return Err(CommandError::OutOfRange);
    }
    Ok(Command::Set(value))
}
`;

const inputBlankTests = String.raw`#[test]
fn accepts_the_command_grammar_without_normalising_it() {
    assert_eq!(parse_command("\u{2003}set:009\n"), Ok(Command::Set(9)));
    assert_eq!(parse_command("stop"), Ok(Command::Stop));
    assert_eq!(parse_command("set:1"), Ok(Command::Set(1)));
    assert_eq!(parse_command("set:999"), Ok(Command::Set(999)));
}

#[test]
fn rejects_a_different_command_language_and_bad_values() {
    assert_eq!(parse_command(" \t"), Err(CommandError::Empty));
    for text in [
        "STOP",
        "set",
        "set:",
        "set:+1",
        "set:1 2",
        "set:１２",
        "set:1.0",
        " set :1",
    ] {
        assert_eq!(parse_command(text), Err(CommandError::Syntax), "{text:?}");
    }
    for text in ["set:0", "set:1000", "set:999999999999"] {
        assert_eq!(
            parse_command(text),
            Err(CommandError::OutOfRange),
            "{text:?}"
        );
    }
}
`;

const inputReviewStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum Alarm {
    At { hour: u8, minute: u8 },
    Off,
}
#[derive(Debug, PartialEq, Eq)]
pub enum AlarmError {
    Empty,
    Syntax,
    OutOfRange,
}

pub fn parse_alarm(_line: &str) -> Result<Alarm, AlarmError> {
    todo!("sprawdź całą gramatykę, nie tylko liczby")
}
`;

const inputReviewSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum Alarm {
    At { hour: u8, minute: u8 },
    Off,
}
#[derive(Debug, PartialEq, Eq)]
pub enum AlarmError {
    Empty,
    Syntax,
    OutOfRange,
}

pub fn parse_alarm(line: &str) -> Result<Alarm, AlarmError> {
    let text = line.trim();
    if text.is_empty() {
        return Err(AlarmError::Empty);
    }
    if text == "off" {
        return Ok(Alarm::Off);
    }
    let Some(time) = text.strip_prefix("at@") else {
        return Err(AlarmError::Syntax);
    };
    let Some((hour, minute)) = time.split_once(':') else {
        return Err(AlarmError::Syntax);
    };
    if hour.len() != 2
        || minute.len() != 2
        || !hour
            .bytes()
            .chain(minute.bytes())
            .all(|byte| byte.is_ascii_digit())
    {
        return Err(AlarmError::Syntax);
    }
    let hour = match hour.parse::<u8>() {
        Ok(value) => value,
        Err(_) => return Err(AlarmError::OutOfRange),
    };
    let minute = match minute.parse::<u8>() {
        Ok(value) => value,
        Err(_) => return Err(AlarmError::OutOfRange),
    };
    if hour > 23 || minute > 59 {
        return Err(AlarmError::OutOfRange);
    }
    Ok(Alarm::At { hour, minute })
}
`;

const inputReviewTests = String.raw`#[test]
fn parses_a_fixed_width_schedule_language() {
    assert_eq!(
        parse_alarm(" at@07:05\r\n"),
        Ok(Alarm::At { hour: 7, minute: 5 })
    );
    assert_eq!(parse_alarm("off"), Ok(Alarm::Off));
    assert_eq!(
        parse_alarm("at@00:00"),
        Ok(Alarm::At { hour: 0, minute: 0 })
    );
    assert_eq!(
        parse_alarm("at@23:59"),
        Ok(Alarm::At {
            hour: 23,
            minute: 59
        })
    );
}
#[test]
fn separates_grammar_from_clock_range() {
    assert_eq!(parse_alarm(""), Err(AlarmError::Empty));
    for text in [
        "AT@07:05",
        "at@7:05",
        "at@07:5",
        "at@07-05",
        "at@07:05:01",
        "at@０７:０５",
    ] {
        assert_eq!(parse_alarm(text), Err(AlarmError::Syntax), "{text:?}");
    }
    assert_eq!(parse_alarm("at@24:00"), Err(AlarmError::OutOfRange));
    assert_eq!(parse_alarm("at@23:60"), Err(AlarmError::OutOfRange));
}
`;

const gameStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum ConfigError {
    Secret,
    Attempts,
}
#[derive(Debug, PartialEq, Eq)]
pub enum GameError {
    Finished,
    OutOfRange,
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
pub struct Game {
    secret: u32,
    remaining: u8,
    used: u8,
    status: Status,
}
impl Game {
    pub fn new(secret: u32, attempts: u8) -> Result<Self, ConfigError> {
        Ok(Self {
            secret,
            remaining: attempts,
            used: 0,
            status: Status::Active,
        })
    }
    pub fn submit(&mut self, _guess: u32) -> Result<Feedback, GameError> {
        todo!("submit")
    }
    pub fn status(&self) -> Status {
        todo!()
    }
    pub fn remaining(&self) -> u8 {
        self.remaining
    }
}
`;

const gameSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum ConfigError {
    Secret,
    Attempts,
}
#[derive(Debug, PartialEq, Eq)]
pub enum GameError {
    Finished,
    OutOfRange,
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
impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Secret => "Secret",
            Self::Attempts => "Attempts",
        })
    }
}
impl std::error::Error for ConfigError {}
impl std::fmt::Display for GameError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            Self::Finished => "Finished",
            Self::OutOfRange => "OutOfRange",
        })
    }
}
impl std::error::Error for GameError {}
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
            return Ok(Feedback::Won {
                attempts: self.used,
            });
        }
        if self.remaining == 0 {
            self.status = Status::Lost;
            return Ok(Feedback::Lost {
                secret: self.secret,
            });
        }
        Ok(if guess < self.secret {
            Feedback::Low {
                remaining: self.remaining,
            }
        } else {
            Feedback::High {
                remaining: self.remaining,
            }
        })
    }
    pub fn status(&self) -> Status {
        match self.status {
            Status::Active => Status::Active,
            Status::Won => Status::Won,
            Status::Lost => Status::Lost,
        }
    }
    pub fn remaining(&self) -> u8 {
        self.remaining
    }
}
`;

const gameTests = String.raw`#[test]
fn validates_configuration_in_contract_order() {
    assert_eq!(Game::new(0, 0).map(|_| ()), Err(ConfigError::Secret));
    assert_eq!(Game::new(101, 1).map(|_| ()), Err(ConfigError::Secret));
    assert_eq!(Game::new(50, 0).map(|_| ()), Err(ConfigError::Attempts));
    assert_eq!(Game::new(50, 21).map(|_| ()), Err(ConfigError::Attempts));
    assert!(Game::new(1, 20).is_ok());
    assert!(Game::new(100, 20).is_ok());
}
#[test]
fn consumes_only_valid_guesses_and_reports_direction() {
    let mut game = match Game::new(50, 3) {
        Ok(value) => value,
        Err(error) => panic!("new game: {:?}", error),
    };
    assert_eq!(game.submit(0), Err(GameError::OutOfRange));
    assert_eq!(game.remaining(), 3);
    assert_eq!(game.submit(101), Err(GameError::OutOfRange));
    assert_eq!(game.remaining(), 3);
    assert_eq!(game.submit(20), Ok(Feedback::Low { remaining: 2 }));
    assert_eq!(game.submit(70), Ok(Feedback::High { remaining: 1 }));
    assert_eq!(game.status(), Status::Active);
}
#[test]
fn final_correct_guess_wins_and_terminal_calls_never_change_state() {
    let mut game = match Game::new(50, 2) {
        Ok(value) => value,
        Err(error) => panic!("new game: {:?}", error),
    };
    assert_eq!(game.submit(49), Ok(Feedback::Low { remaining: 1 }));
    assert_eq!(game.submit(50), Ok(Feedback::Won { attempts: 2 }));
    assert_eq!(game.status(), Status::Won);
    assert_eq!(game.remaining(), 0);
    assert_eq!(game.submit(0), Err(GameError::Finished));
    assert_eq!(game.remaining(), 0);
    assert_eq!(game.status(), Status::Won);
}
#[test]
fn first_valid_guess_reports_one_attempt() {
    let mut game = match Game::new(50, 20) {
        Ok(value) => value,
        Err(error) => panic!("new game: {:?}", error),
    };
    assert_eq!(game.submit(50), Ok(Feedback::Won { attempts: 1 }));
}
#[test]
fn incorrect_last_guess_loses_and_reveals_secret() {
    let mut game = match Game::new(3, 1) {
        Ok(value) => value,
        Err(error) => panic!("new game: {:?}", error),
    };
    assert_eq!(game.submit(2), Ok(Feedback::Lost { secret: 3 }));
    assert_eq!(game.status(), Status::Lost);
    assert_eq!(game.submit(3), Err(GameError::Finished));
    assert_eq!(game.remaining(), 0);
    assert_eq!(game.submit(0), Err(GameError::Finished));
    assert_eq!(game.remaining(), 0);
    assert_eq!(game.status(), Status::Lost);
}
#[test]
fn game_errors_implement_error_without_hiding_their_category() {
    fn accepts_error<E: std::error::Error>(_: &E) {}
    accepts_error(&ConfigError::Attempts);
    accepts_error(&GameError::Finished);
    assert_eq!(GameError::Finished.to_string(), "Finished");
}
`;

const quotaBlankSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum QuotaError {
    Capacity,
    Units,
    Pending,
    NoPending,
    WrongTicket,
    Finished,
    TokenExhausted,
}
pub struct Quota {
    remaining: u8,
    pending: Option<(u8, u8)>,
    next_ticket: u8,
}
impl Quota {
    pub fn new(capacity: u8) -> Result<Self, QuotaError> {
        if !(1..=20).contains(&capacity) {
            return Err(QuotaError::Capacity);
        }
        Ok(Self {
            remaining: capacity,
            pending: None,
            next_ticket: 1,
        })
    }
    pub fn begin(&mut self, units: u8) -> Result<u8, QuotaError> {
        if self.remaining == 0 {
            return Err(QuotaError::Finished);
        }
        if self.pending.is_some() {
            return Err(QuotaError::Pending);
        }
        if units == 0 || units > self.remaining {
            return Err(QuotaError::Units);
        }
        if self.next_ticket == 0 {
            return Err(QuotaError::TokenExhausted);
        }
        let ticket = self.next_ticket;
        if ticket == u8::MAX {
            self.next_ticket = 0;
        } else {
            self.next_ticket += 1;
        }
        self.remaining -= units;
        self.pending = Some((ticket, units));
        Ok(ticket)
    }
    pub fn confirm(&mut self, ticket: u8) -> Result<u8, QuotaError> {
        match self.pending {
            Some((saved, _)) if saved == ticket => {
                self.pending = None;
                Ok(self.remaining)
            }
            Some(_) => Err(QuotaError::WrongTicket),
            None => Err(QuotaError::NoPending),
        }
    }
    pub fn cancel(&mut self, ticket: u8) -> Result<u8, QuotaError> {
        match self.pending {
            Some((saved, units)) if saved == ticket => {
                self.pending = None;
                self.remaining += units;
                Ok(self.remaining)
            }
            Some(_) => Err(QuotaError::WrongTicket),
            None => Err(QuotaError::NoPending),
        }
    }
    pub fn remaining(&self) -> u8 {
        self.remaining
    }
    pub fn has_pending(&self) -> bool {
        self.pending.is_some()
    }
}
`;

const quotaBlankTests = String.raw`#[test]
fn cancelled_reservation_restores_quota_but_confirmed_one_spends_it() {
    let mut quota = match Quota::new(5) {
        Ok(value) => value,
        Err(error) => panic!("quota: {:?}", error),
    };
    let first = match quota.begin(2) {
        Ok(value) => value,
        Err(error) => panic!("begin: {:?}", error),
    };
    assert_eq!(quota.remaining(), 3);
    assert!(quota.has_pending());
    assert_eq!(quota.cancel(first), Ok(5));
    assert!(!quota.has_pending());
    let second = match quota.begin(5) {
        Ok(value) => value,
        Err(error) => panic!("begin: {:?}", error),
    };
    assert_eq!(quota.confirm(second), Ok(0));
    assert_eq!(quota.begin(1), Err(QuotaError::Finished));
}
#[test]
fn pending_and_wrong_ticket_do_not_change_the_two_phase_state() {
    assert_eq!(Quota::new(0).map(|_| ()), Err(QuotaError::Capacity));
    assert!(Quota::new(20).is_ok());
    assert_eq!(Quota::new(21).map(|_| ()), Err(QuotaError::Capacity));
    let mut quota = match Quota::new(4) {
        Ok(value) => value,
        Err(error) => panic!("quota: {:?}", error),
    };
    assert_eq!(quota.begin(0), Err(QuotaError::Units));
    let ticket = match quota.begin(3) {
        Ok(value) => value,
        Err(error) => panic!("begin: {:?}", error),
    };
    assert_eq!(quota.begin(1), Err(QuotaError::Pending));
    assert_eq!(
        quota.confirm(ticket.wrapping_add(1)),
        Err(QuotaError::WrongTicket)
    );
    assert_eq!(quota.remaining(), 1);
    assert!(quota.has_pending());
    assert_eq!(quota.cancel(ticket), Ok(4));
    assert_eq!(quota.confirm(ticket), Err(QuotaError::NoPending));
}
#[test]
fn tickets_grow_without_wrapping_into_a_reusable_identity() {
    let mut quota = match Quota::new(1) {
        Ok(value) => value,
        Err(error) => panic!("quota: {:?}", error),
    };
    let mut previous = 0;
    for _ in 0..254 {
        let ticket = match quota.begin(1) {
            Ok(value) => value,
            Err(error) => panic!("begin: {:?}", error),
        };
        assert!(ticket > previous);
        previous = ticket;
        assert_eq!(quota.cancel(ticket), Ok(1));
    }
    let last = match quota.begin(1) {
        Ok(value) => value,
        Err(error) => panic!("begin: {:?}", error),
    };
    assert_eq!(last, 255);
    assert_eq!(quota.cancel(last), Ok(1));
    assert_eq!(quota.begin(1), Err(QuotaError::TokenExhausted));
}
#[test]
fn over_capacity_begin_does_not_change_quota() {
    let mut quota = match Quota::new(4) {
        Ok(value) => value,
        Err(error) => panic!("quota: {:?}", error),
    };
    assert_eq!(quota.begin(5), Err(QuotaError::Units));
    assert_eq!(quota.remaining(), 4);
    assert!(!quota.has_pending());
}
`;

const stateReviewStarter = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum StockError {
    Capacity,
    Units,
    Pending,
    NoPending,
    WrongToken,
    Empty,
    TokenExhausted,
}
pub struct Stock {
    available: u8,
    pending: Option<(u8, u8)>,
    next: u8,
}
impl Stock {
    pub fn new(capacity: u8) -> Result<Self, StockError> {
        Ok(Self {
            available: capacity,
            pending: None,
            next: 1,
        })
    }
    pub fn hold(&mut self, _units: u8) -> Result<u8, StockError> {
        todo!()
    }
    pub fn ship(&mut self, _token: u8) -> Result<u8, StockError> {
        todo!()
    }
    pub fn release(&mut self, _token: u8) -> Result<u8, StockError> {
        todo!()
    }
    pub fn available(&self) -> u8 {
        self.available
    }
}
`;

const stateReviewSolution = String.raw`#[derive(Debug, PartialEq, Eq)]
pub enum StockError {
    Capacity,
    Units,
    Pending,
    NoPending,
    WrongToken,
    Empty,
    TokenExhausted,
}
pub struct Stock {
    available: u8,
    pending: Option<(u8, u8)>,
    next: u8,
}
impl Stock {
    pub fn new(capacity: u8) -> Result<Self, StockError> {
        if capacity == 0 {
            Err(StockError::Capacity)
        } else {
            Ok(Self {
                available: capacity,
                pending: None,
                next: 1,
            })
        }
    }
    pub fn hold(&mut self, units: u8) -> Result<u8, StockError> {
        if self.available == 0 {
            return Err(StockError::Empty);
        }
        if self.pending.is_some() {
            return Err(StockError::Pending);
        }
        if units == 0 || units > self.available {
            return Err(StockError::Units);
        }
        if self.next == 0 {
            return Err(StockError::TokenExhausted);
        }
        let token = self.next;
        if token == u8::MAX {
            self.next = 0;
        } else {
            self.next += 1;
        }
        self.available -= units;
        self.pending = Some((token, units));
        Ok(token)
    }
    pub fn ship(&mut self, token: u8) -> Result<u8, StockError> {
        match self.pending {
            Some((saved, _)) if saved == token => {
                self.pending = None;
                Ok(self.available)
            }
            Some(_) => Err(StockError::WrongToken),
            None => Err(StockError::NoPending),
        }
    }
    pub fn release(&mut self, token: u8) -> Result<u8, StockError> {
        match self.pending {
            Some((saved, units)) if saved == token => {
                self.pending = None;
                self.available += units;
                Ok(self.available)
            }
            Some(_) => Err(StockError::WrongToken),
            None => Err(StockError::NoPending),
        }
    }
    pub fn available(&self) -> u8 {
        self.available
    }
}
`;

const stateReviewTests = String.raw`#[test]
fn stock_hold_has_a_real_commit_or_release_boundary() {
    let mut stock = match Stock::new(3) {
        Ok(value) => value,
        Err(error) => panic!("stock: {:?}", error),
    };
    let token = match stock.hold(2) {
        Ok(value) => value,
        Err(error) => panic!("hold: {:?}", error),
    };
    assert_eq!(stock.available(), 1);
    assert_eq!(stock.release(token), Ok(3));
    let token = match stock.hold(3) {
        Ok(value) => value,
        Err(error) => panic!("hold: {:?}", error),
    };
    assert_eq!(stock.ship(token), Ok(0));
    assert_eq!(stock.hold(1), Err(StockError::Empty));
}
#[test]
fn invalid_tokens_do_not_discard_a_hold() {
    assert_eq!(Stock::new(0).map(|_| ()), Err(StockError::Capacity));
    let mut stock = match Stock::new(2) {
        Ok(value) => value,
        Err(error) => panic!("stock: {:?}", error),
    };
    let token = match stock.hold(1) {
        Ok(value) => value,
        Err(error) => panic!("hold: {:?}", error),
    };
    assert_eq!(
        stock.ship(token.wrapping_add(1)),
        Err(StockError::WrongToken)
    );
    assert_eq!(stock.hold(1), Err(StockError::Pending));
    assert_eq!(stock.release(token), Ok(2));
}
#[test]
fn over_capacity_hold_does_not_change_stock() {
    let mut stock = match Stock::new(2) {
        Ok(value) => value,
        Err(error) => panic!("stock: {:?}", error),
    };
    assert_eq!(stock.hold(3), Err(StockError::Units));
    assert_eq!(stock.available(), 2);
}
#[test]
fn token_exhaustion_does_not_reuse_identity() {
    let mut stock = match Stock::new(1) {
        Ok(value) => value,
        Err(error) => panic!("stock: {:?}", error),
    };
    let mut previous = 0;
    for _ in 0..254 {
        let token = match stock.hold(1) {
            Ok(value) => value,
            Err(error) => panic!("hold: {:?}", error),
        };
        assert!(token > previous);
        previous = token;
        assert_eq!(stock.release(token), Ok(1));
    }
    let last = match stock.hold(1) {
        Ok(value) => value,
        Err(error) => panic!("hold: {:?}", error),
    };
    assert_eq!(last, 255);
    assert_eq!(stock.release(last), Ok(1));
    assert_eq!(stock.hold(1), Err(StockError::TokenExhausted));
}
`;

export const guessingCoreSources: Source[] = [
  {
    id: "guessing-std-str",
    title: "Rust standard library: str",
    url: "https://doc.rust-lang.org/std/primitive.str.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdź przy zmianie reguł trim, ASCII lub tekstowej gramatyki wejścia.",
  },
  {
    id: "guessing-std-result",
    title: "Rust standard library: Result",
    url: "https://doc.rust-lang.org/std/result/",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdź przy zmianie sposobu zwracania oczekiwanych błędów walidacji.",
  },
  {
    id: "guessing-book-enums",
    title: "The Rust Programming Language: Enums and Pattern Matching",
    url: "https://doc.rust-lang.org/book/ch06-00-enums.html",
    classification: "versioned",
    reviewedAt,
    recheckPolicy:
      "Sprawdź przy zmianie modelu stanów, wariantów informacji zwrotnej albo dopasowania.",
  },
];

export const guessingCoreCompetencies: Competency[] = [
  {
    id: "guess-parse-contract",
    title:
      "Zamieniasz tekst w jawny, całkowity kontrakt wejścia bez zgadywania znaczenia.",
  },
  {
    id: "guess-round-terminal-state",
    title:
      "Modelujesz rundę jako stan z przejściami, których nie wolno odwrócić po zakończeniu.",
  },
];

export const guessingCoreConcepts: Concept[] = [
  {
    id: "guess-input-contract",
    title: "Parser wejścia jako granica kontraktu",
    prerequisites: ["testing-quality-workflow"],
    competencyIds: ["guess-parse-contract"],
    reviewPrompt:
      "Dlaczego `parse_input` najpierw rozróżnia pustkę, potem gramatykę ASCII, a na końcu zakres?",
    reviewAnswer:
      "Każda kategoria opisuje inną naprawę dla użytkownika: brak danych, zły zapis albo liczba poza dozwolonym przedziałem. Przepełnienie po poprawnych cyfrach należy do zakresu.",
    distinguish:
      "Unicode trim usuwa białe znaki na brzegach, ale cyfry wejściowe pozostają wyłącznie ASCII; `１２` nie jest liczbą tego protokołu.",
  },
  {
    id: "guess-round-state",
    title: "Runda z próbami i stanem terminalnym",
    prerequisites: ["guess-input-contract"],
    competencyIds: ["guess-round-terminal-state"],
    reviewPrompt:
      "Czemu ostatnie poprawne zgadnięcie wygrywa, choć po nim remaining wynosi zero?",
    reviewAnswer:
      "Ważniejszy jest wynik poprawnego zgadnięcia. Próba jest zużyta, lecz to zgodność z sekretem ustala Won przed rozważeniem porażki.",
    distinguish:
      "Niepoprawne dane wejściowe nie są ruchem gry. `submit` sam otrzymuje liczbę, więc poza zakresem zwraca błąd bez zmiany stanu.",
  },
];

export const guessingCoreLessons: Lesson[] = [
  {
    id: "guess-input-contract",
    moduleId: "number-guessing-plus",
    conceptIds: ["guess-input-contract"],
    competencyIds: ["guess-parse-contract"],
    prerequisites: ["testing-quality-workflow"],
    title: "Wejście gracza ma ścisły kontrakt",
    subtitle: "Najpierw klasyfikujesz tekst, dopiero potem tworzysz ruch gry.",
    minutes: 24,
    outcomes: [
      "Rozróżnisz pustkę, złą składnię i liczbę poza zakresem.",
      "Przyjmiesz tylko `q` oraz ASCII cyfry po Unicode trim.",
      "Napiszesz testy dla przepełnienia i znaków podobnych do cyfr.",
    ],
    steps: [
      choice(
        "guess-input-contract-predict",
        "predict",
        "Przewidź kategorię",
        "Co zwraca parser dla `  4294967296  `?",
        "2",
        ["Syntax", "Empty", "OutOfRange"],
        [
          "Cyfry są poprawną gramatyką.",
          "Po trim tekst nie jest pusty.",
          "Tak: u32 nie mieści tej liczby, więc jest to błąd zakresu.",
        ],
      ),
      run(
        "guess-input-contract-run",
        "Uruchom mały kontrast",
        "`trim` usuwa Unicode whitespace na brzegach, a `is_ascii_digit` nie uznaje pełnoszerokich cyfr.",
        String.raw`fn main() {
    let text = "\u{2003}007\u{2002}".trim();
    println!("{text}");
    println!("{}", "１２".bytes().all(|b| b.is_ascii_digit()));
}
`,
        "007\nfalse\n",
      ),
      choice(
        "guess-input-contract-explain",
        "explain",
        "Nie poprawiaj wejścia po cichu",
        "Dlaczego `+7` ma być Syntax, a nie Guess(7)?",
        "0",
        [
          "Znak nie należy do ustalonej gramatyki ASCII cyfr.",
          "Każdy parser liczb powinien akceptować znak plus.",
          "Plus oznacza zawsze OutOfRange.",
        ],
        [
          "Dokładna gramatyka daje testowalną, przewidywalną granicę.",
          "Tutaj kontrakt celowo jest węższy niż ogólny parser liczby.",
          "Zakres oceniamy dopiero po udanej gramatyce cyfr.",
        ],
      ),
      exercise({
        id: "guess-input-contract-gate",
        kind: "debug",
        title: "Napraw parser bez zgadywania",
        prompt:
          "Zaimplementuj `parse_input`: Unicode trim; dokładnie lowercase `q` albo niepuste ASCII cyfry; liczby 1..=100; przepełnienie po cyfrach jest OutOfRange. Parser nie może tworzyć ani zmieniać gry. InputError implementuje Display oraz std::error::Error; jego tekst to nazwa wariantu: Empty, Syntax lub OutOfRange, tak jak w pakiecie Cargo.",
        code: inputStarter,
        solution: inputSolution,
        tests: inputTests,
        hints: [
          "Po trim rozdziel pustkę i `q`; dopiero potem oceń wszystkie bajty.",
          "`parse::<u32>()` może się nie udać mimo samych cyfr. To nadal OutOfRange.",
        ],
      }),
      exercise({
        id: "guess-input-contract-blank",
        kind: "blank",
        title: "Polecenia dozownika od pustej kartki",
        prompt:
          "Napisz od zera porównywalne przez Debug, PartialEq i Eq `Command` z wariantami `Set(u16)` i `Stop`, `CommandError` z Empty/Syntax/OutOfRange oraz parser poleceń nazwany `parse_command`. Po Unicode trim jedynymi poprawnymi poleceniami są dokładne `stop` oraz `set:` po którym występują wyłącznie niepuste ASCII cyfry liczby 1..=999. To inna gramatyka niż zgadywanie: prefiks jest obowiązkowy, a zakres ma inne granice. Sprawdź pustkę, obcy prefiks, błędną składnię i obie granice liczby własnymi przykładami.",
        solution: inputBlankSolution,
        tests: inputBlankTests,
        hints: [
          "Rozdziel prefiks `set:` od części liczbowej zanim ją sparsujesz.",
          "Nie traktuj plusa, spacji wewnętrznej ani cyfr Unicode jako wariantu liczby.",
        ],
      }),
      choice(
        "guess-input-contract-recall",
        "recall",
        "Przypomnij kolejność",
        "Jaka jest kolejność decyzji w parserze?",
        "1",
        [
          "Zakres, trim, składnia",
          "trim, pustka/polecenie, składnia cyfr, parse i zakres",
          "parse, trim, Quit",
        ],
        [
          "Zakres bez rozpoznanej liczby nie jest jeszcze znaczący.",
          "Tak. Dzięki temu każdy komunikat błędu ma jedną przyczynę.",
          "Próba parse przed sprawdzeniem składni pomiesza błędne formaty z liczbami.",
        ],
      ),
    ],
    misconceptions: [
      "`trim` oznacza akceptowanie dowolnych cyfr Unicode.",
      "Przepełnienie jest tym samym co Syntax.",
      "Parser wejścia może przy okazji zabrać próbę graczowi.",
    ],
    transferTask:
      "Zaprojektuj komendy innego urządzenia z własnym prefiksem i zakresem; testy mają rozdzielić gramatykę od wartości.",
    evidenceGate:
      "Bramka sprawdza Unicode trim, q, zera wiodące, cyfry ASCII, błędy składni, granice 1 i 100 oraz przepełnienie.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "guess-input-contract-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw kontrakt parsowania wejścia. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "guess-input-contract-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Odtwórz parser od pustej kartki dla odrębnego kontraktu. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: guessingCoreSources.map((source) => source.id),
  },
  {
    id: "guess-round-state",
    moduleId: "number-guessing-plus",
    conceptIds: ["guess-round-state"],
    competencyIds: ["guess-round-terminal-state"],
    prerequisites: ["guess-input-contract"],
    title: "Runda kończy się tylko raz",
    subtitle:
      "Walidujesz ruch, zużywasz próbę i dopiero wtedy wybierasz informację zwrotną.",
    minutes: 30,
    outcomes: [
      "Zachowasz stan przy błędzie i po zakończeniu rundy.",
      "Rozróżnisz ostatnią wygraną od ostatniej porażki.",
      "Przeniesiesz dwufazowy model na rezerwację limitu.",
    ],
    steps: [
      choice(
        "guess-round-state-predict",
        "predict",
        "Ostatnia próba",
        "Sekret to 9, remaining to 1, a gracz podaje 9. Jaki Feedback zwraca `submit`?",
        "1",
        ["Lost { secret: 9 }", "Won { attempts: ... }", "Low { remaining: 0 }"],
        [
          "Porażka dotyczy tylko niepoprawnej ostatniej próby.",
          "Tak: poprawne zgadnięcie ustala terminalny stan Won.",
          "Poprawne zgadnięcie nie potrzebuje wskazówki kierunku.",
        ],
      ),
      run(
        "guess-round-state-run",
        "Zobacz niezmienny błąd",
        "Oddziel błąd walidacji od przejścia stanu: licznik pozostaje ten sam.",
        String.raw`fn submit(remaining: &mut u8, guess: u32) -> Result<(), &'static str> {
    if !(1..=100).contains(&guess) {
        return Err("range");
    }
    *remaining -= 1;
    Ok(())
}
fn main() {
    let mut remaining = 2;
    println!("{:?} {remaining}", submit(&mut remaining, 0));
    println!("{:?} {remaining}", submit(&mut remaining, 10));
}
`,
        'Err("range") 2\nOk(()) 1\n',
      ),
      choice(
        "guess-round-state-explain",
        "explain",
        "Stan terminalny ma pierwszeństwo",
        "Dlaczego po Won `submit(0)` zwraca Finished, a nie OutOfRange?",
        "2",
        [
          "Zero staje się poprawnym zgadnięciem po wygranej.",
          "Wynik zależy od liczby prób, nie od statusu.",
          "Zakończona runda nie przyjmuje już żadnego ruchu; stan i licznik są chronione.",
        ],
        [
          "Zakres pozostaje taki sam.",
          "Status jest częścią kontraktu każdego kolejnego wywołania.",
          "Tak. Sprawdzenie terminalności poprzedza walidację nowego ruchu.",
        ],
      ),
      exercise({
        id: "guess-round-state-gate",
        kind: "debug",
        title: "Napraw przejścia rundy",
        prompt:
          "Zaimplementuj kontrakt `Game`: `new` sprawdza secret 1..=100 przed attempts 1..=20; `submit` sprawdza Finished przed zakresem; błędny ruch nie zmienia stanu; poprawny ruch zużywa próbę; ostatni poprawny ruch wygrywa, a ostatni błędny przegrywa i ujawnia secret. Won podaje liczbę zużytych poprawnych prób. ConfigError i GameError implementują Display oraz std::error::Error; tekst błędu to nazwa jego wariantu (Secret, Attempts, Finished albo OutOfRange), jak w pakiecie Cargo.",
        code: gameStarter,
        solution: gameSolution,
        tests: gameTests,
        hints: [
          "Zapisz status jako prywatne pole i zmieniaj go tylko w dwóch gałęziach terminalnych.",
          "Po odjęciu próby najpierw sprawdź zgodność z sekretem, dopiero potem remaining == 0.",
        ],
      }),
      exercise({
        id: "guess-round-state-blank",
        kind: "blank",
        title: "Dwufazowa rezerwacja limitu",
        prompt:
          "Od pustej kartki zdefiniuj porównywalny `QuotaError` z Capacity, Units, Pending, NoPending, WrongTicket, Finished i TokenExhausted oraz `Quota`. Konstruktor new przyjmuje pojemność 1..=20. Metoda begin rozpoczyna rezerwację jednostek, confirm zatwierdza ją, a cancel anuluje. Obserwatory remaining i has_pending pokazują pozostałe jednostki oraz istnienie rezerwacji. Może istnieć tylko jedna rezerwacja naraz i od razu blokuje units; confirm utrzymuje ubytek, cancel go zwraca. Zły ticket oraz błąd nie mogą usunąć rezerwacji. Ticket ma rosnąć dla kolejnych begin; po wydaniu 255 następna próba zwraca TokenExhausted zamiast zawijać i ponownie wydawać istniejący ticket.",
        solution: quotaBlankSolution,
        tests: quotaBlankTests,
        hints: [
          "Pending przechowuje zarówno ticket, jak i liczbę zablokowanych jednostek.",
          "Nie usuwaj Pending zanim nie porównasz ticketu; inaczej zły klient mógłby anulować cudzą rezerwację.",
        ],
      }),
      choice(
        "guess-round-state-recall",
        "recall",
        "Przypomnij granicę",
        "Co musi pozostać niezmienione po `Err(GameError::OutOfRange)` w aktywnej rundzie?",
        "0",
        [
          "Status, remaining i liczba użytych poprawnych prób",
          "Tylko secret",
          "Nic: błąd też zużywa próbę",
        ],
        [
          "Tak. Nieprawidłowy tekst był już odfiltrowany, a nieprawidłowa liczba nadal nie jest ruchem.",
          "To za mało: licznik prób jest także częścią stanu.",
          "Limit wiąże tylko ważne zgadnięcia.",
        ],
      ),
    ],
    misconceptions: [
      "Zerowy remaining automatycznie oznacza Lost nawet przy poprawnym zgadnięciu.",
      "Walidacja zakresu może następować przed Finished bez zmiany kontraktu.",
      "Anulowanie rezerwacji i jej potwierdzenie mają taki sam efekt na limit.",
    ],
    transferTask:
      "Przenieś zasadę nieodwracalnego zakończenia na stan rezerwacji, w którym anulowanie przywraca zasób, a potwierdzenie go zużywa.",
    evidenceGate:
      "Bramka sprawdza kolejność walidacji, wszystkie przejścia terminalne, brak utraty próby przy błędzie oraz zachowanie stanu po powtórnym wywołaniu.",
    // Szacowany czas lekcji jest orientacyjny; przerwy nie są pomiarem czasu.
    sessionStops: [
      {
        afterStepId: "guess-round-state-explain",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Napraw przejścia stanu rundy. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
      {
        afterStepId: "guess-round-state-gate",
        title: "Opcjonalna przerwa: zachowaj bieżące miejsce",
        nextGoal:
          "Odtwórz automat od pustej kartki dla odrębnego kontraktu. Szacunek czasu jest wstępny; dobierz długość sesji do siebie.",
      },
    ],
    sourceIds: guessingCoreSources.map((source) => source.id),
  },
];

export const guessingCoreReviewExercises: Record<string, LessonStep> = {
  "guess-input-contract": exercise({
    id: "review-guess-input-contract",
    kind: "apply",
    title: "Powtórka: zegarowy parser polecenia",
    prompt:
      "Napraw `parse_alarm`. Po Unicode trim parser odróżnia `off` od ścisłej składni `at@HH:MM`; pustka zwraca Empty, zła gramatyka Syntax, a liczby poza zakresem OutOfRange. Godzina i minuta mają po dwie ASCII cyfry, a zakresy to 00..=23 i 00..=59.",
    code: inputReviewStarter,
    solution: inputReviewSolution,
    tests: inputReviewTests,
    hints: [
      "Stała szerokość pól jest częścią gramatyki, nie tylko estetyką.",
      "Godzinę i minutę sprawdzaj osobno po udanej składni.",
    ],
  }),
  "guess-round-state": exercise({
    id: "review-guess-round-state",
    kind: "apply",
    title: "Powtórka: magazyn z hold, ship i release",
    prompt:
      "Napraw `Stock`: hold blokuje jednostki i wydaje token; ship zatwierdza ubytek; release zwraca jednostki. Jeden hold naraz, a błędny token nie może go utracić. Przy pojemności 1..=u8::MAX tokeny rosną; po wydaniu 255 następny hold zwraca TokenExhausted zamiast zawijać i ponownie wydawać istniejący token.",
    code: stateReviewStarter,
    solution: stateReviewSolution,
    tests: stateReviewTests,
    hints: [
      "Zapamiętaj rozmiar hold razem z tokenem.",
      "Sprawdź token przed wyczyszczeniem oczekującego hold.",
    ],
  }),
};
