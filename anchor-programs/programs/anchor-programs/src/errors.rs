use anchor_lang::prelude::*;
#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid vault")]
    InvalidVault,
    #[msg("Invalid token mint")]
    InvalidTokenMint,
}
