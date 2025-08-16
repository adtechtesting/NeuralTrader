use anchor_lang::prelude::*;
use crate::{Agent, Market, Trade};
use crate::errors::ErrorCode;

#[derive(Accounts)]
pub struct PlaceTrade<'info> {
    #[account(
      mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = user,
        space = 8 + Trade::INIT_SPACE,
        seeds = [b"trade", agent.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub trade: Account<'info, Trade>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn place_trade(
    ctx: Context<PlaceTrade>,
    trade_type: u8,
    amount_in: u64,
    amount_out: u64,
) -> Result<()> {
    if trade_type > 1 {
        return err!(ErrorCode::InvalidTradeType);
    }
    let trade = &mut ctx.accounts.trade;
    trade.agent = ctx.accounts.agent.key();
    trade.market = ctx.accounts.market.key();
    trade.trade_type = trade_type;
    trade.amount_in = amount_in;
    trade.amount_out = amount_out;
    trade.bump = ctx.bumps.trade;
    Ok(())
}