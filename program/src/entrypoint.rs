use solana_program::{
    account_info::AccountInfo,
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    pubkey::Pubkey,
    program_error::PrintProgramError,
};

use crate::processor::Processor;
use crate::error::NotePadError;

// Declare and export the program's entrypoint
entrypoint!(main);

// Program entrypoint's implementation
pub fn main(
    program_id: &Pubkey, // Public key of the account the hello world program was loaded into
    accounts: &[AccountInfo], // The account to say hello to
    instruction_data: &[u8], // Ignored, all NotePad instructions are hellos
) -> ProgramResult {
    msg!("Entrypoint");
    if let Err(error) = Processor::process_instruction(program_id, accounts, instruction_data) {
        // catch the error so we can print it
        error.print::<NotePadError>();
        return Err(error);
    }
    Ok(())
}