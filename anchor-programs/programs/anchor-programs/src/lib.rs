

mod instructions;
use instructions::*;
mod state;
mod errors;
pub use state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount};

// Replace with your real program ID after deployment
declare_id!("HsASKa2TVc2S8FX3hpFHZ2Yy39jQeXou1bnmiEBL1VJ1");

#[program]
pub mod agent_market_sim {
    use super::*;
  

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
    ) -> Result<()> {
        instructions::initialize_market(ctx)
    }

    pub fn register_agent(ctx: Context<RegisterAgent>) -> Result<()> {
        instructions::register_agent(ctx)
    }

    pub fn deposit_tokens(
        ctx: Context<DepositTokens>,
        amount: u64,
    ) -> Result<()> {
        instructions::deposit_tokens(ctx, amount)
    }

    pub fn withdraw_tokens(
        ctx: Context<WithdrawTokens>,
        amount: u64,
    ) -> Result<()> {
        instructions::withdraw_tokens(ctx, amount)
    }

    pub fn place_trade(
        ctx: Context<PlaceTrade>,
        trade_type: u8, // 0 = buy, 1 = sell, 2 = swap
        amount: u64,
        price: u64,
    ) -> Result<()> {
        instructions::place_trade(ctx, trade_type, amount, price)
    }

    pub fn execute_trade(ctx: Context<ExecuteTrade>) -> Result<()> {
        instructions::execute_trade(ctx)
    }
}








