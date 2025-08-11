use anchor_lang::prelude::*;
use crate::Agent;

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(init, payer = user, space = 8 + 32 + 1, seeds = [b"agent", user.key().as_ref()], bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn register_agent(ctx: Context<RegisterAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    agent.owner = ctx.accounts.user.key();
    // bump is automatically set by Anchor during account initialization
    Ok(())
}