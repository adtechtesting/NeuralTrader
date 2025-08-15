use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{Agent, Market, Vault};
use crate::errors::ErrorCode;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct DepositTokens<'info> {
    #[account(
        mut,
      
    )]
    pub agent: Account<'info, Agent>,
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        
        init_if_needed,
        payer = user,
        token::mint = token_mint,
        token::authority = user
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_mint.key().as_ref()],
        bump = vault.bump,
        has_one = market @ ErrorCode::InvalidVault
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        
        init_if_needed,
        payer = user,
        associated_token::mint = token_mint,
        associated_token::authority = vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn deposit_tokens(ctx: Context<DepositTokens>, amount: u64) -> Result<()> {
    let token_mint_key = ctx.accounts.token_mint.key();
    if token_mint_key != ctx.accounts.market.token_a && token_mint_key != ctx.accounts.market.token_b {
        return err!(ErrorCode::InvalidTokenMint);
    }
    if ctx.accounts.vault.token != token_mint_key {
        return err!(ErrorCode::InvalidVault);
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}