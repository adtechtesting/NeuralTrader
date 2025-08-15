use anchor_lang::prelude::*;
use anchor_spl::token::Token; 
use crate::{Agent, Market, Trade};

/// The context for the `place_trade` instruction.
#[derive(Accounts)]
pub struct PlaceTrade<'info> {
    /// The agent account associated with the user.
    #[account(mut)]
    pub agent: Account<'info, Agent>,

    /// The market account where the trade is being placed.
    #[account(mut)]
    pub market: Account<'info, Market>,

    /// The trade account to be initialized. This will be a new PDA.
    ///
    /// `init`: Initializes a new account.
    /// `payer = agent`: The `agent` account will pay for the account's rent.
    /// `space = 8 + Trade::INIT_SPACE`: Allocates the required space.
    /// `seeds`: Defines the PDA seeds, which must be unique. The PDA is derived from
    ///   `["trade", agent_key, market_key]`.
    /// `bump`: Stores the bump seed used to find this specific PDA.
    #[account(
        init,
        payer = agent,
        space = 8 + Trade::INIT_SPACE, // Anchor overhead + account size
        seeds = [b"trade", agent.key().as_ref(), market.key().as_ref()],
        bump
    )]
    pub trade: Account<'info, Trade>,

    /// The Solana System Program, required for account creation.
    pub system_program: Program<'info, System>,
}

/// The instruction to place a new trade.
/// This function initializes a new `Trade` account on-chain.
pub fn place_trade(
    ctx: Context<PlaceTrade>,
    trade_type: u8,
    amount: u64,
    price: u64,
) -> Result<()> {
    let trade = &mut ctx.accounts.trade;

    // Set the fields of the newly created `Trade` account.
    trade.agent = ctx.accounts.agent.key();
    trade.market = ctx.accounts.market.key();
    trade.trade_type = trade_type;
    trade.amount = amount;
    trade.price = price;
    
    // Set the bump seed from the context. This is crucial for later
    // on-chain verification of the PDA.
    trade.bump = ctx.bumps.trade;

    Ok(())
}
