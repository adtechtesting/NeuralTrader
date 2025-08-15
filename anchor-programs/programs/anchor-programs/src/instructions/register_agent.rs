use anchor_lang::prelude::*;
use crate::Agent;

/// The context for the `register_agent` instruction.
#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    /// The new agent account to be initialized.
    ///
    /// `init`: Initializes a new account.
    /// `payer = user`: Specifies the `user` as the account that pays for the rent.
    /// `space = 8 + Agent::INIT_SPACE`: Allocates the required space for the account.
    ///   - `8`: Anchor's overhead for the account discriminator.
    ///   - `Agent::INIT_SPACE`: Automatically calculates the space for the `Agent` struct fields.
    /// `seeds`: Defines the PDA seeds, which must be unique. The PDA is derived from
    ///   `["agent", user_key]`.
    /// `bump`: Stores the bump seed used to find this specific PDA.
    #[account(
        init,
        payer = user,
        space = 8 + Agent::INIT_SPACE,
        seeds = [b"agent", user.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,

    /// The user's account, which must be a signer for this transaction.
    /// It is also the payer for the new `agent` account.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The Solana System Program, which is required to create new accounts.
    pub system_program: Program<'info, System>,
}

/// The instruction to register a new agent.
/// This function initializes and populates a new `Agent` account.
pub fn register_agent(ctx: Context<RegisterAgent>) -> Result<()> {
    let agent = &mut ctx.accounts.agent;

    // Set the owner of the agent to the key of the user who signed the transaction.
    agent.owner = ctx.accounts.user.key();

    // Store the PDA bump seed on the account. This is crucial as it allows
    // the program to later re-derive the account's address without a signature.
    agent.bump = ctx.bumps.agent;

    Ok(())
}
