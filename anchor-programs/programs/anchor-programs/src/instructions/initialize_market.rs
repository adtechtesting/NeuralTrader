use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use crate::Market;

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 32 + 1,
        seeds = [b"market", token_a_mint.key().as_ref(), token_b_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    
    /// CHECK: This is the token A mint account
    pub token_a_mint: AccountInfo<'info>,
    
    /// CHECK: This is the token B mint account  
    pub token_b_mint: AccountInfo<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.token_a = ctx.accounts.token_a_mint.key();
    market.token_b = ctx.accounts.token_b_mint.key();
    // bump is automatically set by Anchor during account initialization
    Ok(())
}