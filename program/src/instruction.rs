use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize, PartialEq)]
pub enum NotePadInstruction {

    Greeting {
        counter: u32,
    },

    Create {
        title: String,
        msg: String,
        owner: String,
    },

    Modify {
        title: String,
        msg: String,
        owner: String,
    },
}