import type { ProjectPackage } from "../../../domain/types";

export const miniGrepFuzzOracle = String.raw`pub fn expected(query: &str, text: &str, context: u8) -> Vec<(usize, String, bool)> {
    assert!(!query.is_empty());
    let lines: Vec<&str> = text
        .split_inclusive('\n')
        .map(|piece| match piece.strip_suffix('\n') {
            Some(line) => line.strip_suffix('\r').unwrap_or(line),
            None => piece,
        })
        .collect();
    let hits: Vec<bool> = lines
        .iter()
        .map(|line| {
            line.as_bytes()
                .windows(query.len())
                .any(|bytes| bytes == query.as_bytes())
        })
        .collect();
    let mut output = Vec::new();
    for (index, line) in lines.iter().enumerate() {
        let from = index.saturating_sub(usize::from(context));
        let to = index
            .saturating_add(usize::from(context) + 1)
            .min(lines.len());
        if hits[from..to].iter().any(|hit| *hit) {
            output.push((index + 1, (*line).to_owned(), hits[index]));
        }
    }
    output
}

#[cfg(test)]
mod tests {
    use super::expected;

    #[test]
    fn overlapping_context_is_a_union_and_retains_match_flags() {
        assert_eq!(
            expected("x", "left\nx\nmiddle\nx\nright\n", 1),
            vec![
                (1, "left".into(), false),
                (2, "x".into(), true),
                (3, "middle".into(), false),
                (4, "x".into(), true),
                (5, "right".into(), false),
            ]
        );
    }

    #[test]
    fn crlf_and_unterminated_cr_are_distinct() {
        assert_eq!(
            expected("hit", "hit\r\nnext\r", 1),
            vec![(1, "hit".into(), true), (2, "next\r".into(), false),]
        );
        assert_eq!(expected("x", "x\n", 2), vec![(1, "x".into(), true)]);
    }

    #[test]
    fn unicode_empty_input_and_no_matches() {
        assert_eq!(
            expected("ół", "żółw\nół\n", 0),
            vec![(1, "żółw".into(), true), (2, "ół".into(), true),]
        );
        assert!(expected("x", "", 1).is_empty());
        assert!(expected("x", "alpha\nbeta", 16).is_empty());
    }
}
`;

export const miniGrepFuzzTarget = String.raw`#![no_main]
use libfuzzer_sys::fuzz_target;
use mini_grep::{Query, SelectedLine, scan_reader, select_context};
use std::io::{BufReader, Cursor};
#[path = "../oracle.rs"]
mod oracle;

fn values(lines: Vec<SelectedLine>) -> Vec<(usize, String, bool)> {
    lines
        .into_iter()
        .map(|line| (line.line_number, line.text, line.matched))
        .collect()
}

fuzz_target!(|data: &[u8]| {
    if data.len() < 3 || data.len() > 4096 {
        return;
    }
    let context = data[0] % 20;
    let size = usize::from(u16::from_be_bytes([data[1], data[2]])).min(data.len() - 3);
    let query_text = String::from_utf8_lossy(&data[3..3 + size]);
    let query_result = Query::parse(&query_text);
    if query_text.is_empty() || query_text.len() > 1024 {
        assert!(query_result.is_err(), "mini-grep invalid query accepted");
        return;
    }
    let query = query_result.expect("mini-grep valid query rejected");
    assert_eq!(query.as_str(), query_text);
    let input = &data[3 + size..];
    let reader = BufReader::with_capacity(1 + usize::from(data[0] % 7), Cursor::new(input));
    let scanned = scan_reader(&query, reader, context);
    if context > 16 {
        assert!(
            scanned.is_err(),
            "mini-grep invalid context accepted by reader"
        );
        assert!(
            select_context(&query, &[], context).is_err(),
            "mini-grep invalid context accepted by selection"
        );
        return;
    }
    let text = match std::str::from_utf8(input) {
        Ok(text) if !input.contains(&0) => text,
        _ => {
            assert!(scanned.is_err(), "mini-grep invalid input accepted");
            return;
        }
    };
    // The fuzzer's max_len is 4096: accepted text stays below the package's
    // line/output caps. Unit/process tests independently exercise those limits.
    let expected = oracle::expected(query.as_str(), text, context);
    let lines: Vec<String> = text
        .split_inclusive('\n')
        .map(|part| match part.strip_suffix('\n') {
            Some(line) => line.strip_suffix('\r').unwrap_or(line).to_owned(),
            None => part.to_owned(),
        })
        .collect();
    let selected =
        select_context(&query, &lines, context).expect("mini-grep valid selection rejected");
    assert_eq!(
        values(selected),
        expected,
        "mini-grep selection oracle mismatch"
    );
    assert_eq!(
        values(scanned.expect("mini-grep valid input rejected")),
        expected,
        "mini-grep reader oracle mismatch"
    );
});
`;

export const miniGrepFuzzManifest = `[package]
name = "mini-grep-fuzz"
version = "0.0.0"
publish = false
edition = "2024"

[package.metadata]
cargo-fuzz = true

[dependencies]
libfuzzer-sys = "=0.4.13"
mini-grep = { path = ".." }

[workspace]
members = ["."]

[[bin]]
name = "selection"
path = "fuzz_targets/selection.rs"
test = false
doc = false
bench = false
`;

const fuzzLock = String.raw`# This file is automatically @generated by Cargo.
# It is not intended for manual editing.
version = 4

[[package]]
name = "arbitrary"
version = "1.4.2"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "c3d036a3c4ab069c7b410a2ce876bd74808d2d0888a82667669f8e783a898bf1"

[[package]]
name = "cc"
version = "1.4.5"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "005ec2760ca554fae18df7a11195552ec576cd665632a881bc011d5bb2fd4d80"
dependencies = [
 "find-msvc-tools",
 "jobserver",
 "libc",
 "shlex",
]

[[package]]
name = "cfg-if"
version = "1.0.4"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "9330f8b2ff13f34540b44e946ef35111825727b38d33286ef986142615121801"

[[package]]
name = "find-msvc-tools"
version = "0.1.12"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3e0f1c7c3a72c66fd80abe965175f7523475c0489a87d3ff9d6e8c87d87a9d2d"

[[package]]
name = "getrandom"
version = "0.4.3"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "300e883d756b2e4ec94e02791f39b04b522276138852cfc41d9fb7e904106099"
dependencies = [
 "cfg-if",
 "libc",
 "r-efi",
]

[[package]]
name = "jobserver"
version = "0.1.35"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "1c00acbd29eabad4a2392fa0e921c874934dbbf4194312ad20f04a0ed67a3cb3"
dependencies = [
 "getrandom",
 "libc",
]

[[package]]
name = "libc"
version = "0.2.189"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "3eaf3ede3fee6db1a4c2ee091bf8a8b4dccdc6d17f656fb07896ee72867612f2"

[[package]]
name = "libfuzzer-sys"
version = "0.4.13"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "a9fd2f41a1cba099f79a0b6b6c35656cf7c03351a7bae8ff0f28f25270f929d2"
dependencies = [
 "arbitrary",
 "cc",
]

[[package]]
name = "mini-grep"
version = "1.0.0"

[[package]]
name = "mini-grep-fuzz"
version = "0.0.0"
dependencies = [
 "libfuzzer-sys",
 "mini-grep",
]

[[package]]
name = "r-efi"
version = "6.0.0"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8dcc9c7d52a811697d2151c701e0d08956f92b0e24136cf4cf27b57a6a0d9bf"

[[package]]
name = "shlex"
version = "2.0.1"
source = "registry+https://github.com/rust-lang/crates.io-index"
checksum = "f8fadd59c855ef2080decdef8ff161eb6661b86933c9d82e5ba29dc602a55aba"
`;

const fuzzReadme = `# Fuzz: selekcja i ograniczony odczyt

Ten osobny workspace testuje rzeczywistą bibliotekę mini-grep z pakietu nadrzędnego. Główny program nadal używa stable Rust i samej biblioteki standardowej. Fuzzer wymaga cargo-fuzz 0.13.2, libfuzzer-sys 0.4.13, nightly-2026-08-08 oraz kompilatora C++.

Z katalogu głównego rozpakowanego pakietu:

~~~sh
cargo install cargo-fuzz --version 0.13.2 --locked
rustup toolchain install nightly-2026-08-08 --profile minimal
cargo +nightly-2026-08-08 fetch --manifest-path fuzz/Cargo.toml --locked
cargo +nightly-2026-08-08 fuzz run selection -- -seed=20260913 -runs=20000 -max_len=4096 -max_total_time=30 -timeout=3 -rss_limit_mb=1024
~~~

Nie trzeba zmieniać domyślnego toolchainu. Korpus w fuzz/corpus/selection ma binarne nagłówki: bajt kontekstu modulo 20, dwa bajty big-endian długości query, następnie query i treść. Długość query jest ograniczona do dostępnych bajtów, a niepoprawne UTF-8 query zastępuje from_utf8_lossy. Treść jest przekazywana jako surowe bajty. Każdy przebieg może rozszerzyć korpus; zapisuj wartościowe nowe przypadki jako regresje.

oracle.rs używa prostego modelu pełnego tekstu i maski dopasowań. Porównujemy wybrane linie, ich numery, tekst oraz flagi trafień z select_context i scan_reader. Reader otrzymuje BufReader o małej pojemności. Niepoprawne query, kontekst i dane muszą dać błąd. Zwykłe testy biblioteki i procesu osobno sprawdzają duże limity, I/O i ścieżki.

To ograniczona próba z maksymalnym wejściem 4096 bajtów, 20000 wywołań lub 30 sekundami, a nie dowód dla każdego możliwego pliku. oracle.rs nie jest implementacją do produkcyjnego odczytu dużych danych. Sam brak paniki nie wystarcza: niezgodność wyniku też przerywa próbę. Testy oracle można uruchomić przez rustc --edition 2024 --test fuzz/oracle.rs, a potem powstały program.

Po błędzie libFuzzer zapisuje przypadek w fuzz/artifacts/selection. Odtwórz go przez cargo +nightly-2026-08-08 fuzz run selection ŚCIEŻKA_DO_PRZYPADKU. Pojedynczy plik odtwarza regresję; dopiero praca z katalogiem korpusu generuje nowe mutacje. Sprawdź przyczynę i dodaj test przed poprawką.

Źródła przejrzane 2026-09-13; ponów przegląd przy zmianie narzędzia lub co 90 dni:
- https://rust-fuzz.github.io/book/cargo-fuzz/setup.html
- https://rust-fuzz.github.io/book/cargo-fuzz/tutorial.html
- https://rust-fuzz.github.io/book/cargo-fuzz/guide.html
- https://llvm.org/docs/LibFuzzer.html
`;

function corpusSeed(context: number, query: string, text: string): string {
  const size = new TextEncoder().encode(query).length;
  const high = size >> 8;
  const low = size & 255;
  // ProjectPackage stores UTF-8 files. These authored seed headers deliberately
  // use ASCII-range bytes, so UTF-8 encoding preserves the exact binary header.
  if ([context, high, low].some((byte) => byte > 127))
    throw new Error("Authored fuzz seed header must survive UTF-8 encoding");
  return String.fromCharCode(context, high, low) + query + text;
}

export const miniGrepFuzzFiles: ProjectPackage["files"] = [
  { path: "fuzz/Cargo.toml", starter: miniGrepFuzzManifest },
  { path: "fuzz/Cargo.lock", starter: fuzzLock },
  { path: "fuzz/README.md", starter: fuzzReadme },
  { path: "fuzz/oracle.rs", starter: miniGrepFuzzOracle },
  { path: "fuzz/fuzz_targets/selection.rs", starter: miniGrepFuzzTarget },
  ...[
    ["substring", corpusSeed(0, "beta", "alphabetagamma\n")],
    ["overlap", corpusSeed(1, "x", "left\nx\nmiddle\nx\nright\n")],
    ["unicode-crlf", corpusSeed(1, "ż", "żółw\r\nkoniec\r")],
    ["empty-query", corpusSeed(0, "", "hello")],
    ["long-query", corpusSeed(0, "a".repeat(1025), "alpha")],
    ["invalid-context", corpusSeed(19, "x", "x\n")],
    ["nul-input", corpusSeed(0, "x", "x\0data")],
    ["empty-input", corpusSeed(16, "x", "")],
  ].map(([name, starter]) => ({
    path: `fuzz/corpus/selection/${name}.seed`,
    starter,
  })),
];
