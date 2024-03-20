use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    program::{invoke_signed},
    system_instruction,
    borsh0_10::try_from_slice_unchecked,
    sysvar::{rent::Rent, Sysvar},
};

use crate::state::*;
use crate::instruction::NotePadInstruction;
use crate::error::NotePadError;
use borsh:: {BorshSerialize, BorshDeserialize};

use std::str::FromStr;


pub struct Processor {}

impl Processor {

    // greeting指令为测试使用，与作业功能无关
    pub fn process_greeting(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        counter: u32,
    ) -> ProgramResult {
        let accounts_iter = &mut accounts.iter();

        let greeting_account = next_account_info(accounts_iter)?;

        // msg!("greeting_account: {}", greeting_account);
        msg!("greeting_account: {}", greeting_account.key);
        msg!("program_id: {}", program_id);
        // The account must be owned by the program in order to modify its data
        if greeting_account.owner != program_id {
            
            msg!("Greeted account does not have the correct program id");
            return Err(NotePadError::NotOwnedByHelloWrold.into());
        }

        // Increment and store the number of times the account has been greeted
        let mut greeting_info = GreetingInfo::try_from_slice(&greeting_account.data.borrow())?;
        msg!("recevie account's counter is  {} !", greeting_info.counter);
        msg!("need add counter is  {} !", counter);

        greeting_info.counter = greeting_info.counter + counter;
        greeting_info.serialize(&mut *greeting_account.data.borrow_mut())?;

        msg!("set counter to  {} !", greeting_info.counter);
        Ok(())
    }

    pub fn process_create(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        title: String,
        msg: String,
        owner: String,
    ) -> ProgramResult {

        msg!("Adding Note ...");
        msg!("Message: {}", msg);
        msg!("Title: {}", title);

        // Get Account iterator
        let account_info_iter = &mut accounts.iter();

        // Get accounts
        let initializer = next_account_info(account_info_iter)?;
        let note_account = next_account_info(account_info_iter)?;
        let system_program = next_account_info(account_info_iter)?;
        
        // Derive PDA and check that it matches client
        let (pda, bump_seed) = Pubkey::find_program_address(&[initializer.key.as_ref(),title.as_bytes().as_ref(),], program_id);

        // Calculate account size required
        let account_len: usize = (4 + title.len()) + (4 + msg.len()) + (4 + owner.len());

        // 这里是长度限制
        if account_len > 1000 {
            return Err(NotePadError::OutOfLimitedLength.into());
        }

        // Calculate rent required
        let rent = Rent::get()?;
        let rent_lamports = rent.minimum_balance(account_len);

        // Create the account
        invoke_signed(
                &system_instruction::create_account(
                initializer.key,
                note_account.key,
                rent_lamports,
                account_len.try_into().unwrap(),
                program_id,
            ),
            &[initializer.clone(), note_account.clone(), system_program.clone()],
            &[&[initializer.key.as_ref(), title.as_bytes().as_ref(), &[bump_seed]]],
        )?;

        msg!("PDA created: {}", pda);

        msg!("unpacking state account");
        let account_data = NotePadAccountInfo {
            title,
            msg,
            owner,
        };
        msg!("account data: {:?}", account_data);
        msg!("serializing account");
        account_data.serialize(&mut &mut note_account.data.borrow_mut()[..])?;
        msg!("state account serialized:{:?}", note_account.data);

        Ok(())
    }

    pub fn process_modify(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        title: String,
        msg: String,
        owner: String,
    ) -> ProgramResult {

        msg!("Modifying Note ...");
        msg!("Message: {}", msg);
        msg!("Title: {}", title);

        // Get Account iterator
        let account_info_iter = &mut accounts.iter();

        // Get accounts
        let initializer = next_account_info(account_info_iter)?;
        let note_account = next_account_info(account_info_iter)?;
        
        // Derive PDA and check that it matches client
        let (pda, _bump_seed) = Pubkey::find_program_address(&[initializer.key.as_ref(),title.as_bytes().as_ref(),], program_id);
        msg!("PDA created: {}", pda);
        

        msg!("unpacking state account");
        let mut account_data = try_from_slice_unchecked::<NotePadAccountInfo>(&note_account.data.borrow()).unwrap();
        msg!("borrowed account data: {:?}", account_data);

        // 授权检查，只有创建者和被授权者才能修改note
        if &pda != note_account.key && &Pubkey::from_str(account_data.owner.as_str()).unwrap() != initializer.key {
            return Err(NotePadError::NotOwnedByHelloWrold.into());
        }

        account_data.msg = msg;
        account_data.owner = owner;      
        msg!("serializing account");
        if let Err(error) = account_data.serialize(&mut &mut note_account.data.borrow_mut()[..]) {
            msg!("{}", error);
            return Err(NotePadError::OutOfLimitedLength.into());
        };
        msg!("state account serialized:{:?}", note_account.data);

        Ok(())
    }

    

    pub fn process_instruction(
        program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        msg!("Beginning processing");
        let instruction = NotePadInstruction::try_from_slice(instruction_data)
            .map_err(|_| ProgramError::InvalidInstructionData)?;
        msg!("Instruction unpacked");

        match instruction {
            NotePadInstruction::Create{title, msg, owner} => {
                Processor::process_create(program_id, accounts, title, msg, owner)?;
            }
            NotePadInstruction::Modify{title, msg, owner} => {
                Processor::process_modify(program_id, accounts, title, msg, owner)?;
            }
            NotePadInstruction::Greeting{counter} => {
                Processor::process_greeting(program_id, accounts, counter)?;
            }
        }
        Ok(())
    }
}