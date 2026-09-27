use ava_api::AccessPrograms;
use ava_login::AvaAuth;
use ava_protocol::turn_input::CyberAccessProgram;

pub(crate) fn for_auth(
    auth: Option<&AvaAuth>,
    program: Option<CyberAccessProgram>,
) -> Option<AccessPrograms> {
    program
        .filter(|_| auth.is_some_and(AvaAuth::is_chatgpt_auth))
        .map(AccessPrograms::from)
}
