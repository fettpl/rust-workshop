//! The small library published by the candidate release.

/// The trait and its re-export are the pre-release public contract.
pub trait PacketView {
    fn packet_id(&self) -> u32;
    fn payload(&self) -> &[u8];
}

/// The old external path must remain available in every feature configuration.
pub use PacketView as LegacyView;

pub struct Packet {
    id: u32,
    bytes: Vec<u8>,
}

impl Packet {
    pub fn new(id: u32, bytes: impl Into<Vec<u8>>) -> Self {
        Self {
            id,
            bytes: bytes.into(),
        }
    }
}

impl PacketView for Packet {
    fn packet_id(&self) -> u32 {
        self.id
    }

    fn payload(&self) -> &[u8] {
        &self.bytes
    }
}

/// The candidate capability is an extension trait, so old implementers keep
/// implementing only the two methods above.
#[cfg(feature = "metrics")]
pub trait PacketMetrics {
    fn payload_len(&self) -> usize;
}

#[cfg(feature = "metrics")]
impl<T: PacketView + ?Sized> PacketMetrics for T {
    fn payload_len(&self) -> usize {
        self.payload().len()
    }
}
