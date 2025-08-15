use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};
use crate::{Agent, Market, Vault};
use crate::errors::ErrorCode;
#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    /// The agent account associated with the user.
    #[account(mut, has_one = owner)]
    pub agent: Account<'info, Agent>,

    /// The market account where the tokens are being withdrawn from.
    pub market: Account<'info, Market>,

    /// The user who owns the agent and is initiating the transaction.
    #[account(mut)]
    pub user: Signer<'info>,

    /// The mint of the token being withdrawn.
    pub token_mint: Account<'info, Mint>,

    /// The user's token account, where the tokens will be received.
    #[account(
        mut,
        token::mint = token_mint,
        token::authority = user,
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// The vault account for the specific token.
    /// It is a PDA that is a key part of the signing logic.
    #[account(
        mut,
        seeds = [b"vault", market.token_a.as_ref(), market.token_b.as_ref(), token_mint.key().as_ref()],
        bump = vault.bump,
        has_one = market,
        
    )]
    pub vault: Account<'info, Vault>,
    
    /// The vault's token account, from which the tokens will be transferred.
    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = vault,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// The Solana Token Program.
    pub token_program: Program<'info, Token>,

    /// The Solana Associated Token Program.
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// The Solana System Program.
    pub system_program: Program<'info, System>,
}

pub fn withdraw_tokens(
    ctx: Context<WithdrawTokens>,
    amount: u64,
) -> Result<()> {
    // Determine which token mint corresponds to the vault.
    let token_mint_key = ctx.accounts.token_mint.key();

    // Prepare the PDA seeds for signing the transfer.
    let seeds = &[
        b"vault",
        ctx.accounts.market.token_a.as_ref(),
        ctx.accounts.market.token_b.as_ref(),
        token_mint_key.as_ref(),
        &ctx.accounts.vault.bump.to_le_bytes(),
    ];
    let signer_seeds = &[&seeds[..]];

    // Prepare the CPI (Cross-Program Invocation) to transfer the tokens.
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_token_account.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );
    
    // Perform the token transfer from the market's vault to the user's account.
    token::transfer(cpi_ctx, amount)?;
    
    Ok(())
}
