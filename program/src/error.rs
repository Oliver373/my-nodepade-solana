use {
    num_derive::FromPrimitive,
    num_traits::FromPrimitive,
    solana_program::{decode_error::DecodeError, program_error::ProgramError,program_error::PrintProgramError,msg},
    thiserror::Error,
};

#[derive(Clone, Debug, Eq, Error, FromPrimitive, PartialEq)]
pub enum NotePadError {
    #[error("Not owned by HelloWolrd Program")]
    NotOwnedByHelloWrold,
    #[error("Out of space size")]
    OutOfLimitedLength,
}

pub type NotePadResult = Result<(), NotePadError>;

impl From<NotePadError> for ProgramError {
    fn from(e: NotePadError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for NotePadError {
    fn type_of() -> &'static str {
        "NotePadError"
    }
}


impl PrintProgramError for NotePadError {
    fn print<E>(&self)
    where
        E: 'static + std::error::Error + DecodeError<E> + PrintProgramError + FromPrimitive,
    {
        match self {
            NotePadError::NotOwnedByHelloWrold => msg!("Error: Not authorized to modify note!"),
            NotePadError::OutOfLimitedLength => msg!("Error: Input bytes length is out of node account space limited!"),
        }
    }
}