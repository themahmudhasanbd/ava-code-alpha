# ava-protocol

This crate defines the "types" for the protocol used by Ava CLI, which includes both "internal types" for communication between `ava-core` and `ava-tui`, as well as "external types" used with `ava app-server`.

This crate should have minimal dependencies.

Ideally, we should avoid "material business logic" in this crate, as we can always introduce `Ext`-style traits to add functionality to types in other crates.
