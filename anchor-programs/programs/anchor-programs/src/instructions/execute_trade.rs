use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{Trade, Agent, Market, Vault};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    #[account(
        mut,
        has_one = agent @ ErrorCode::Unauthorized,
        close = user
    )]
    pub trade: Account<'info, Trade>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(
       mut
    )]
    pub agent: Account<'info, Agent>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_in_mint: Account<'info, Mint>,
    pub token_out_mint: Account<'info, Mint>,

    #[account(
        mut,
        token::mint = token_in_mint,
        token::authority = user
    )]
    pub user_token_account_in: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = token_out_mint,
        associated_token::authority = user
    )]
    pub user_token_account_out: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"vault",
            market.token_a.as_ref(),
            market.token_b.as_ref(),
            token_in_mint.key().as_ref()
        ],
        bump = vault_in.bump,
        has_one = market @ ErrorCode::InvalidVault,

    )]
    pub vault_in: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = token_in_mint,
        associated_token::authority = vault_in
    )]
    pub vault_token_account_in: Account<'info, TokenAccount>,

    #[account(
        seeds = [
            b"vault",
            market.token_a.as_ref(),
            market.token_b.as_ref(),
            token_out_mint.key().as_ref()
        ],
        bump = vault_out.bump,
        has_one = market @ ErrorCode::InvalidVault,
        
    )]
    pub vault_out: Account<'info, Vault>,

    #[account(
        mut,
        associated_token::mint = token_out_mint,
        associated_token::authority = vault_out
    )]
    pub vault_token_account_out: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn execute_trade(ctx: Context<ExecuteTrade>) -> Result<()> {
    let trade = &ctx.accounts.trade;
    let market = &ctx.accounts.market;

    // Determine token_in and token_out based on trade_type
    let (token_in_key, token_out_key) = if trade.trade_type == 0 {
        // Buy Token B with Token A
        (market.token_a, market.token_b)
    } else {
        // Sell Token B for Token A
        (market.token_b, market.token_a)
    };

    // Verify token mints match trade type
    if ctx.accounts.token_in_mint.key() != token_in_key
        || ctx.accounts.token_out_mint.key() != token_out_key
    {
        return err!(ErrorCode::InvalidTokenAccounts);
    }

    // Transfer tokens from user to vault_in
    let cpi_accounts_to_vault = Transfer {
        from: ctx.accounts.user_token_account_in.to_account_info(),
        to: ctx.accounts.vault_token_account_in.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx_to_vault = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts_to_vault,
    );
    token::transfer(cpi_ctx_to_vault, trade.amount_in)?;

    // Transfer tokens from vault_out to user
    let seeds = &[
        b"vault",
        market.token_a.as_ref(),
        market.token_b.as_ref(),
        token_out_key.as_ref(),
        &[ctx.accounts.vault_out.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts_from_vault = Transfer {
        from: ctx.accounts.vault_token_account_out.to_account_info(),
        to: ctx.accounts.user_token_account_out.to_account_info(),
        authority: ctx.accounts.vault_out.to_account_info(),
    };
    let cpi_ctx_from_vault = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts_from_vault,
        signer_seeds,
    );
    token::transfer(cpi_ctx_from_vault, trade.amount_out)?;

    Ok(())
}
