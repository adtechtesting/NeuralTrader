use anchor_lang::prelude::*;

#[account]
pub struct Market {
    pub token_a: Pubkey,
    pub token_b: Pubkey,
    pub bump: u8,
}

#[account]
pub struct Agent {
    pub owner: Pubkey,
    pub bump: u8,
}

#[account]
pub struct Trade {
    pub agent: Pubkey,
    pub market: Pubkey,
    pub trade_type: u8,
    pub amount: u64,
    pub price: u64,
    pub bump: u8,
}

#[account]
pub struct Vault {
    pub market: Pubkey,
    pub bump: u8,
}
