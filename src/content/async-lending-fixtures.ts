export interface AsyncLendingBoundaryFixture {
  id: string;
  mode: "pass" | "fail";
  source: string;
  diagnostic?: string;
}

export const asyncLendingBoundaryFixtures: AsyncLendingBoundaryFixture[] = [
  {
    id: "lifetime-pass",
    mode: "pass",
    source: `fn view<'a>(value: &'a str) -> &'a str { value }
fn main() { assert_eq!(view("lokalne"), "lokalne"); }`,
  },
  {
    id: "lifetime-fail",
    mode: "fail",
    diagnostic: "E0515",
    source: `fn invalid() -> &'static str {
    let local = String::from("lokalne");
    &local
}
fn main() { let _ = invalid(); }`,
  },
  {
    id: "second-borrow-pass",
    mode: "pass",
    source: `struct Receiver { value: u8 }
impl Receiver { fn take(&mut self) -> &mut u8 { &mut self.value } }
fn main() {
    let mut receiver = Receiver { value: 1 };
    { let first = receiver.take(); *first += 1; }
    let second = receiver.take(); *second += 1;
}`,
  },
  {
    id: "second-borrow-fail",
    mode: "fail",
    diagnostic: "E0499",
    source: `struct Receiver { value: u8 }
impl Receiver { fn take(&mut self) -> &mut u8 { &mut self.value } }
fn main() {
    let mut receiver = Receiver { value: 1 };
    let first = receiver.take();
    let second = receiver.take();
    *first += *second;
}`,
  },
  {
    id: "borrowed-future-static-pass",
    mode: "pass",
    source: `use std::future::Future;
fn require_spawnable<F: Future + Send + 'static>(_: F) {}
fn main() { require_spawnable(async move { String::from("owned").len() }); }`,
  },
  {
    id: "borrowed-future-static-fail",
    mode: "fail",
    diagnostic: "may outlive",
    source: `use std::future::Future;
fn require_spawnable<F: Future + Send + 'static>(_: F) {}
fn main() {
    let local = String::from("lokalne");
    require_spawnable(async { local.len() });
}`,
  },
  {
    id: "non-send-across-await-pass",
    mode: "pass",
    source: `fn assert_send<T: Send>(_: T) {}
fn main() { assert_send(async move { 7usize }); }`,
  },
  {
    id: "non-send-across-await-fail",
    mode: "fail",
    diagnostic: "future cannot be sent between threads safely",
    source: `use std::rc::Rc;
fn assert_send<T: Send>(_: T) {}
fn main() {
    let local = Rc::new(7usize);
    let future = async move {
        std::future::ready(()).await;
        *local
    };
    assert_send(future);
}`,
  },
  {
    id: "owned-send-future-pass",
    mode: "pass",
    source: `use std::future::Future;
fn make(bytes: Vec<u8>) -> impl Future<Output = usize> + Send + 'static {
    async move { std::future::ready(()).await; bytes.len() }
}
fn main() { fn require<T: Send + 'static>(_: T) {} require(make(vec![1, 2])); }`,
  },
  {
    id: "owned-send-future-fail",
    mode: "fail",
    diagnostic: "future cannot be sent between threads safely",
    source: `use std::future::Future;
use std::rc::Rc;
fn make(local: Rc<Vec<u8>>) -> impl Future<Output = usize> + Send + 'static {
    async move { std::future::ready(()).await; local.len() }
}
fn main() { let _ = make(Rc::new(vec![1, 2])); }`,
  },
  {
    id: "send-owner-nonsend-future-fail",
    mode: "fail",
    diagnostic: "future cannot be sent between threads safely",
    source: `use std::future::Future;
use std::rc::Rc;
fn make(bytes: Vec<u8>) -> impl Future<Output = usize> + Send + 'static {
    async move {
        let local = Rc::new(bytes);
        std::future::ready(()).await;
        local.len()
    }
}
fn main() { let _ = make(vec![1, 2]); }`,
  },
  {
    id: "send-owner-drop-before-await-pass",
    mode: "pass",
    source: `use std::future::Future;
use std::rc::Rc;
fn make(bytes: Vec<u8>) -> impl Future<Output = usize> + Send + 'static {
    async move {
        let length = { let local = Rc::new(bytes); local.len() };
        std::future::ready(()).await;
        length
    }
}
fn main() { fn require<T: Send + 'static>(_: T) {} require(make(vec![1, 2])); }`,
  },
  {
    id: "dyn-pass",
    mode: "pass",
    source: `trait Provider { fn next(&mut self) -> Option<&str>; }
fn accept(_: Box<dyn Provider>) {}
fn main() { let _ = accept; }`,
  },
  {
    id: "dyn-fail",
    mode: "fail",
    diagnostic: "E0038",
    source: `trait Lending {
    type Item<'a> where Self: 'a;
    fn next<'a>(&'a mut self) -> Self::Item<'a>;
}
fn accept(_: Box<dyn Lending>) {}
fn main() { let _ = accept; }`,
  },
];
