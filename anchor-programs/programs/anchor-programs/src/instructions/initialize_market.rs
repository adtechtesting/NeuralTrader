use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{Market, Vault};

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + Market::INIT_SPACE,
        seeds = [b"market", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,

    #[account(
        init,
        payer = signer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", token_a_mint.key().as_ref(), token_b_mint.key().as_ref(), token_a_mint.key().as_ref()],
        bump
    )]
    pub vault_a: Account<'info, Vault>,

    #[account(
        init,
        payer = signer,
        space = 8 + Vault::INIT_SPACE,
        seeds = [b"vault", token_a_mint.key().as_ref(), token_b_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub vault_b: Account<'info, Vault>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token_a_mint,
        associated_token::authority = vault_a
    )]
    pub vault_a_token_account: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = token_b_mint,
        associated_token::authority = vault_b
    )]
    pub vault_b_token_account: Account<'info, TokenAccount>,

    pub token_a_mint: Account<'info, Mint>,
    pub token_b_mint: Account<'info, Mint>,
    #[account(mut)]
    pub signer: Signer<'info>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.token_a = ctx.accounts.token_a_mint.key();
    market.token_b = ctx.accounts.token_b_mint.key();
    market.bump = ctx.bumps.market;

    let market_key = market.key();
    let vault_a = &mut ctx.accounts.vault_a;
    vault_a.market = market_key;
    vault_a.token = ctx.accounts.token_a_mint.key();
    vault_a.bump = ctx.bumps.vault_a;

    let vault_b = &mut ctx.accounts.vault_b;
    vault_b.market = market_key;
    vault_b.token = ctx.accounts.token_b_mint.key();
    vault_b.bump = ctx.bumps.vault_b;

    Ok(())
}