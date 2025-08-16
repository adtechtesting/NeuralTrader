use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
    #[msg("Invalid trade type")]
    InvalidTradeType,
    #[msg("Invalid token accounts")]
    InvalidTokenAccounts,

    #[msg("Invlaid agent owner")]
    InvalidAgentOwner
}