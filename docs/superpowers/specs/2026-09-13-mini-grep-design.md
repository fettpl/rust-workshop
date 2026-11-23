# Mini grep — integration project

[Polski](2026-09-13-mini-grep-design.pl.md)

The approved goal of the entire course includes Mini grep from the original briefing and
extension described in `docs/advanced-curriculum.md`. This stage builds one developed library design and CLI,
along with lessons, independent transfer attempts and actual process tests. Does not
change existing student identifiers or local records.

## Product contract

`mini-grep [-C N] [--] QUERY PATH...` searches for a literal void of the lift UTF-8, taking into account the size of the
letters. Supports files and directories recursively. `-C` occurs at most once before QUERY;
`--` ends the options. N contains only digits ASCII without a sign and stands for 0–16. No
query/ścieżek, unknown option or conflict of options gives you an error of use. Paths are accepted
as OsString/PathBuf; incorrect UTF-8 in query/opcji is an error of use. The names of the paths in the report
are openly escapated to LF, CR, TAB, a colon and an oblique reverse did not break
records; do not pretend to be reversible for non-UTF8 paths if you used a lossy display.

The result of the file is a union of context windows around matching lines, without
duplicates and in order of numbers. Each record has `label:line:text\n`, without group separators; hit
and context have the same format. Many paths maintain the order of arguments,
directories are viewed steph-first with sorting entries according to PathBuf. The repeated
argument reprocesses the file; there is no hidden deduplication. No guarantee of
identical non-ASCII order between operating systems.

LF ends the line; individual CR before LF is removed from the text. The solitary CR
on EOF remains data. The final line without LF is processed; the final line LF does
not create an additional empty line. Invalid UTF-8 or NUL in content means file error binarnego/formatu;
an empty file is correct. Reading doesn't materialize the whole input. The error read
after an earlier hit is still a mistake, with the original io::Error in Error::source.

Open limits: query 1024 bytes, raw line 65536 bytes before LF (including CR), context
of 16 lines, final UTF-8 stdout 1048576 Bytes, visited entries 4096 (including roots and
catalogues), depth 32 (root depth 0). Borders are turned on, excess discarded. Limiting
the number of entries also protects a large directory sorting buffer. The rejection of
too long a line must take place without copying the entire line to its own buffer; when
rejected, it is allowed to view up to one additional byte. We do not promise the
allocation limit imposed by any foreign implementation BufRead.

The program limits the preserved content of selected lines to 1048576 bytes (text plus one
byte per line, also empty), passing the remaining budget to read another file. A
separate limit 1048576 bytes includes the entire redededed stdout, including labels and line
numbers. These are limits of logical content, not promise 1 MiB of the whole heatup:
additional memory occupies metadata Vec/ścieżek, raw line, context and rendering buffer. Stdout
is only published after correct processing of all inputs. Error wejścia/polityki/limitu leaves no partial
stdout. The failure of stdout itself may leave a part of the recording; this is not a
device transaction. Output codes: 0 at least one match, 1 no match without diagnosis, 2
errors użycia/IO/formatu/limitu. Stderr describes the stage and cause; we do not parse it to control the
library.

## Paths and Hazard Limits

`symlink_metadata` rejects the link on the final component encountered; the recursion does not fall
into the links. Special files are rejected. It is not a sandbox or protection against
race metadata→open, a link in the parent component or a directory substitution by
another process. We work on local paths chosen by the owner, without increased
privileges. The model's threeth document is to clearly describe these boundaries. A
change in data while reading can change the result; the program does not promise
snapshot, retains errors, limit and correct format of observed data.

## Architecture and didactics

Module `mini-grep` after `public-api-workspaces`. Lessons and concepts: `grep-context-selection`, `grep-bounded-input`, `grep-path-policy`, `grep-cli-contract`, in that order. The first
prerequisite is `api-compatible-surface`; the others form a chain. Each lesson has przewidywanie/wykonywany contrast, explanation,
primary gate `<id>-gate`, independent blank `<id>-blank` without starter and without recipe, and a fresh
code replay `review-<id>`. Blank provides public names and interop format in prose, not a
function signature, a step list, or a private algorithm.

The first two lessons teach pure selection and limited BufRead. Two more teach path and
contract policy decisions CLI using portable danych/adapterów; actual directories, links and
processes verify the package. We do not present a single-file runner as proof of file
system behaviour.

Project `mini-grep`, Package `mini-grep-workshop`, Rust 2024 and Standard Library. The library separates search/input,
traversal, render and arguments, the binary only maps the result to streams and the
output code. Starter formatting and compiling; independent tests stop on purpose `todo!`.
Reference includes tests unit/integration/doc/process, ADR, three model, instructions and sample fixtures. Reveal
means aid only for four primarygates; blanks and replays remain independent. Pobranie/lokalna The
command list does not raise the master.

## Evidence

Before the reference, tests and observed starter failure are created. Border tests
include small portions, EOF, CRLF, Unicode, pusty/duży pattern, binary input, error after
partial reading, loss of primary cause, imposing windows, output limit and configuration
CLI. Catalog tests have deterministic fixtures; Unix symlinks are tested openly. Access
error cannot be faked with a chmod test running as root.

The property test uses an independent simple Oracle to select context on generated small
inputs. Metamorphic application-invariance refers to C=0; at C>0 a new line can become
context. Fuzzer libFuzzer includes queers and content and checks the result against
independent Oracle. Fuzz is a separate developer tool for nightly; the application and
main package remain stable/std-only. Root adds a separate harness and a real limited run, as well as
a control mutant. We don't call it a test of deterministic fuzzing or complete
fussification of full evidence.

Checks are performed only by the reviewed proprietary repository files and deliberate
mutations, never szkice/importy A student. We don't send code to public Playground. The final stage
requires independent reviews, lint/typecheck/Vitest, Rust/Tokio/Cargo, sources, build, E2E, offline and commita/pusha with
accurate control SHA w CI.
