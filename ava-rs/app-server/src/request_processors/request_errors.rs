use super::*;
use ava_protocol::error::AvaErrorDetails;

pub(super) fn environment_selection_error(err: AvaErr) -> JSONRPCErrorError {
    match err.details() {
        AvaErrorDetails::InvalidRequest(message) => invalid_request(message.clone()),
        _ => internal_error(format!("failed to validate environment selections: {err}")),
    }
}
