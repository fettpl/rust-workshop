#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Reading {
    pub name: &'static str,
    pub value: i32,
}

impl Reading {
    pub const fn new(name: &'static str, value: i32) -> Self {
        Self { name, value }
    }
}

#[macro_export]
macro_rules! readings {
    ($( $name:literal => $value:expr ),* $(,)?) => {{
        let mut readings = ::std::vec::Vec::<$crate::Reading>::new();
        $(readings.push($crate::Reading::new($name, $value));)*
        readings
    }};
}
