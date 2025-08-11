use anchor_lang::prelude::*;
use anchor_spl::token::{self, Transfer, TokenAccount, Token};
use crate::{Agent, Market};

#[derive(Accounts)]
pub struct DepositTokens<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn deposit_tokens(
    ctx: Context<DepositTokens>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}