use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{Trade, Agent, Market, Vault};

#[derive(Accounts)]
pub struct ExecuteTrade<'info> {
    /// The trade account to be executed.
    /// It is marked as `mut` because its state will be updated (and then it will be closed).
    #[account(mut, has_one = agent, close = user)]
    pub trade: Account<'info, Trade>,
    /// The market account where the trade is taking place.
    #[account(mut)]
    pub market: Account<'info, Market>,
    /// The agent executing the trade. The `has_one = agent` constraint on the trade account
    /// ensures this is the correct agent.
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    /// The user who owns the agent and is initiating the transaction.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The token mint that the user is giving.
    pub token_in_mint: Account<'info, Mint>,
    /// The token mint that the user is receiving.
    pub token_out_mint: Account<'info, Mint>,

    /// The agent's token account for the tokens they are giving.
    #[account(
        mut,
        token::mint = token_in_mint,
        token::authority = user,
    )]
    pub user_token_account_in: Account<'info, TokenAccount>,
    
    /// The agent's token account for the tokens they are receiving.
    #[account(
        mut,
        associated_token::mint = token_out_mint,
        associated_token::authority = user,
    )]
    pub user_token_account_out: Account<'info, TokenAccount>,
    
    /// The vault for the tokens being given by the user.
    #[account(
        mut,
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_in_mint.key().as_ref()],
        bump = vault_in.bump,
        has_one = market,
        has_one = token_in_mint
    )]
    pub vault_in: Account<'info, Vault>,

    /// The vault's token account for the tokens being given by the user.
    #[account(
        mut,
        associated_token::mint = token_in_mint,
        associated_token::authority = vault_in,
    )]
    pub vault_token_account_in: Account<'info, TokenAccount>,

    /// The vault for the tokens being received by the user.
    #[account(
        mut,
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_out_mint.key().as_ref()],
        bump = vault_out.bump,
        has_one = market,
        has_one = token_out_mint
    )]
    pub vault_out: Account<'info, Vault>,

    /// The vault's token account for the tokens being received by the user.
    #[account(
        mut,
        associated_token::mint = token_out_mint,
        associated_token::authority = vault_out,
    )]
    pub vault_token_account_out: Account<'info, TokenAccount>,
    
    /// The Solana Token Program.
    pub token_program: Program<'info, Token>,
    /// The Solana Associated Token Program.
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// The Solana System Program.
    pub system_program: Program<'info, System>,
}

pub fn execute_trade(ctx: Context<ExecuteTrade>) -> Result<()> {
    let trade = &mut ctx.accounts.trade;
    let market = &mut ctx.accounts.market;

    // Based on the trade type, determine which token is being traded for which.
    let (token_in_key, token_out_key) = if trade.trade_type == 0 { // Buy Token B with Token A
        (market.token_a, market.token_b)
    } else { // Sell Token B for Token A
        (market.token_b, market.token_a)
    };

    // Verify that the mints provided in the context match the trade type.
    if ctx.accounts.token_in_mint.key() != token_in_key ||
       ctx.accounts.token_out_mint.key() != token_out_key {
           return Err(ErrorCode::InvalidTokenAccounts.into());
    }

    // Prepare the first CPI: transfer tokens from the user to the vault.
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

    // Prepare the second CPI: transfer tokens from the vault to the user.
    // This requires the vault PDA to sign.
    let seeds = &[
        b"vault",
        market.token_a.as_ref(),
        market.token_b.as_ref(),
        token_out_key.as_ref(),
        &ctx.accounts.vault_out.bump.to_le_bytes(),
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

    // Update the agent's balance in the Agent account (if needed).
    // This is a placeholder for your custom logic.
    // ctx.accounts.agent.balance = ...;

    // After a successful trade, the trade account can be closed to return rent to the user.
    // The `close` constraint handles this automatically.

    msg!("Trade executed on-chain");
    Ok(())
}
