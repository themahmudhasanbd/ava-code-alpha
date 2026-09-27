#[cfg(ava_bazel)]
pub use code_mode_proto::ava::code_mode::v1::*;

#[cfg(not(ava_bazel))]
tonic::include_proto!("ava.code_mode.v1");

pub const MAX_IDENTIFIER_BYTES: usize = 256;
