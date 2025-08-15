use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{Agent, Market, Vault};
use crate::errors::ErrorCode;
#[derive(Accounts)]
pub struct DepositTokens<'info> {
    /// The agent account associated with the user.
    /// The `has_one = owner` constraint ensures that the `user` signing the transaction
    /// is the correct owner of this agent account.
    #[account(
        has_one = owner
    )]
    pub agent: Account<'info, Agent>,
    pub market: Account<'info, Market>,
    /// The user's account, which must be a signer for this transaction.
    #[account(mut)]
    pub user: Signer<'info>,
    /// The mint of the token being deposited.
    pub token_mint: Account<'info, Mint>,
    /// The user's token account, from which the tokens will be transferred.
    /// It must be a token account for the `token_mint` and be owned by the `user`.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    /// The vault account for the specific token being deposited.
    /// The seeds derive the vault's PDA based on the market and token mint.
    #[account(
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_mint.key().as_ref()],
        bump = vault.bump,
        has_one = market,
        
    )]
    pub vault: Account<'info, Vault>,
    /// The Associated Token Account for the vault, where the tokens will be stored.
    /// The authority for this account is the vault PDA itself.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_tokens(
    ctx: Context<DepositTokens>,
    amount: u64,
) -> Result<()> {
    let token_mint_key = ctx.accounts.token_mint.key();

    // Ensure the token being deposited is one of the two valid tokens for the market.
    if token_mint_key != ctx.accounts.market.token_a && token_mint_key != ctx.accounts.market.token_b {
        return err!(ErrorCode::InvalidTokenMint);
    }

    // Prepare the CPI (Cross-Program Invocation) to transfer the tokens.
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    
    // Perform the token transfer from the user's account to the market's vault.
    token::transfer(cpi_ctx, amount)?;
    
    Ok(())
}
