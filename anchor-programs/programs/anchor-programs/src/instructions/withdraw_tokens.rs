use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, TokenAccount, Token};
use crate::{Agent, Market, Vault};

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn withdraw_tokens(
    ctx: Context<WithdrawTokens>,
    amount: u64,
) -> Result<()> {
    let bump = ctx.accounts.vault.bump;
    let market_key = ctx.accounts.market.key();
    let seeds = &[b"vault", market_key.as_ref(), &[bump]];
    let signer = &[&seeds[..]];
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}