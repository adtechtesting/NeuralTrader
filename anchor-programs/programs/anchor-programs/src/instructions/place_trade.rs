use anchor_lang::prelude::*;
use crate::{Agent, Market, Trade};

#[derive(Accounts)]
pub struct PlaceTrade<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(init, payer = agent, space = 8 + 32 + 32 + 1 + 8 + 8 + 1, seeds = [b"trade", agent.key().as_ref(), market.key().as_ref()], bump)]
    pub trade: Account<'info, Trade>,
    pub system_program: Program<'info, System>,
}

pub fn place_trade(
    ctx: Context<PlaceTrade>,
    trade_type: u8,
    amount: u64,
    price: u64,
) -> Result<()> {
    let trade = &mut ctx.accounts.trade;
    trade.agent = ctx.accounts.agent.key();
    trade.market = ctx.accounts.market.key();
    trade.trade_type = trade_type;
    trade.amount = amount;
    trade.price = price;
    // bump is automatically set by Anchor during account initialization
    Ok(())
}