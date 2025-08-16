use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use crate::{Agent, Market, Vault, errors::ErrorCode};

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(
        
        constraint = agent.owner == user.key() @ ErrorCode::InvalidAgentOwner
    )]
    pub agent: Account<'info, Agent>,
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_mint.key().as_ref()],
        bump = vault.bump,
        has_one = market @ ErrorCode::InvalidVault
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_tokens(ctx: Context<WithdrawTokens>, amount: u64) -> Result<()> {
    let token_mint_key = ctx.accounts.token_mint.key();
    if token_mint_key != ctx.accounts.market.token_a && token_mint_key != ctx.accounts.market.token_b {
        return err!(ErrorCode::InvalidTokenMint);
    }
    if ctx.accounts.vault.token != token_mint_key {
        return err!(ErrorCode::InvalidVault);
    }

    let seeds = &[
        b"vault",
        ctx.accounts.market.token_a.as_ref(),
        ctx.accounts.market.token_b.as_ref(),
        token_mint_key.as_ref(),
        &[ctx.accounts.vault.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;
    Ok(())
}
