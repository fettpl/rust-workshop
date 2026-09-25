use release_probe::LegacyView;

struct OldPacket {
    id: u32,
    bytes: Vec<u8>,
}

impl LegacyView for OldPacket {
    fn packet_id(&self) -> u32 {
        self.id
    }

    fn payload(&self) -> &[u8] {
        &self.bytes
    }
}

fn inspect(view: &dyn LegacyView) -> (u32, usize) {
    (view.packet_id(), view.payload().len())
}

fn main() {
    let old = OldPacket {
        id: 7,
        bytes: vec![1, 2, 3],
    };
    assert_eq!(inspect(&old), (7, 3));
}

#[cfg(test)]
mod tests {
    use super::{inspect, OldPacket};
    use release_probe::LegacyView;

    #[test]
    fn old_dyn_consumer_and_implementer_still_work() {
        let old = OldPacket {
            id: 11,
            bytes: vec![9, 8],
        };
        let view: &dyn LegacyView = &old;
        assert_eq!(inspect(view), (11, 2));
    }

    #[cfg(feature = "metrics")]
    #[test]
    fn optional_metric_is_available_only_when_enabled() {
        use release_probe::{Packet, PacketMetrics};

        let packet = Packet::new(3, [4, 5, 6]);
        assert_eq!(packet.payload_len(), 3);
    }
}
