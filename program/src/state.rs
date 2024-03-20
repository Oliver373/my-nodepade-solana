use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct GreetingInfo {
    pub counter: u32,
}


// owner为授权者地址
#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct NotePadAccountInfo {
    pub title: String,
    pub msg: String,
    pub owner: String,

}
