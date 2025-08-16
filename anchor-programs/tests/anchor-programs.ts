import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { AgentMarketSim } from "../target/types/agent_market_sim";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";

describe("market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.AgentMarketSim as Program<AgentMarketSim>;
  const connection = provider.connection as any;

  
  const wallet = provider.wallet as anchor.Wallet & { payer: any };

  
  let tokenAMint: PublicKey;
  let tokenBMint: PublicKey;
  let marketPda: PublicKey;
  let marketBump: number;
  let vaultAPda: PublicKey;
  let vaultABump: number;
  let vaultBPda: PublicKey;
  let vaultBBump: number;
  let agentPda: PublicKey;
  let agentBump: number;
  let tradePda: PublicKey;
  let tradeBump: number;

  let userTokenAAccount: PublicKey;
  let userTokenBAccount: PublicKey;
  let vaultATokenAccount: PublicKey;
  let vaultBTokenAccount: PublicKey;

  const user = wallet;
  const depositAmount = new BN(1000);
  const withdrawAmount = new BN(500);
  const tradeAmount = new BN(200);
  const tradePrice = new BN(10);
  const amountIn = tradeAmount.mul(tradePrice);
  const amountOut = tradeAmount;

  before(async () => {
   
    tokenAMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);
    tokenBMint = await createMint(connection, wallet.payer, wallet.publicKey, null, 9);

   
    [marketPda, marketBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), tokenAMint.toBuffer(), tokenBMint.toBuffer()],
      program.programId
    );
    [vaultAPda, vaultABump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), tokenAMint.toBuffer(), tokenBMint.toBuffer(), tokenAMint.toBuffer()],
      program.programId
    );
    [vaultBPda, vaultBBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), tokenAMint.toBuffer(), tokenBMint.toBuffer(), tokenBMint.toBuffer()],
      program.programId
    );
    [agentPda, agentBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), user.publicKey.toBuffer()],
      program.programId
    );

    // Create user token accounts and mint tokens
    userTokenAAccount = await createAssociatedTokenAccount(connection, wallet.payer, tokenAMint, user.publicKey);
    userTokenBAccount = await createAssociatedTokenAccount(connection, wallet.payer, tokenBMint, user.publicKey);
    await mintTo(connection, wallet.payer, tokenAMint, userTokenAAccount, wallet.payer, 10000);
    await mintTo(connection, wallet.payer, tokenBMint, userTokenBAccount, wallet.payer, 10000);

    // Derive vault token accounts
    vaultATokenAccount = await getAssociatedTokenAddress(tokenAMint, vaultAPda, true);
    vaultBTokenAccount = await getAssociatedTokenAddress(tokenBMint, vaultBPda, true);
  });

  it("Initializes a market", async () => {
    await program.methods
      .initializeMarket()
      .accounts({
        market: marketPda,
        vaultA: vaultAPda,
        vaultB: vaultBPda,
        vaultATokenAccount: vaultATokenAccount,
        vaultBTokenAccount: vaultBTokenAccount,
        tokenAMint: tokenAMint,
        tokenBMint: tokenBMint,
        signer: user.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const marketAccount = await program.account.market.fetch(marketPda);
    expect(marketAccount.tokenA.toBase58()).to.equal(tokenAMint.toBase58());
    expect(marketAccount.tokenB.toBase58()).to.equal(tokenBMint.toBase58());
    expect(marketAccount.bump).to.equal(marketBump);
  });

  it("Registers an agent", async () => {
    await program.methods
      .registerAgent()
      .accounts({
        agent: agentPda,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agentAccount = await program.account.agent.fetch(agentPda);
    expect(agentAccount.owner.toBase58()).to.equal(user.publicKey.toBase58());
    expect(agentAccount.bump).to.equal(agentBump);
  });

  it("Deposits tokens (Token A)", async () => {
    const initialUserBalance = (await getAccount(connection, userTokenAAccount)).amount;

    
    await program.methods
      .depositTokens(depositAmount)
      .accounts({
        agent: agentPda,
        market: marketPda,
        user: user.publicKey,
        tokenMint: tokenAMint,
        userTokenAccount: userTokenAAccount,
        vault: vaultAPda,
        vaultTokenAccount: vaultATokenAccount,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
      
    const vaultTokenAccountInfo = await getAccount(connection, vaultATokenAccount);
    expect(vaultTokenAccountInfo.amount.toString()).to.equal(depositAmount.toString());

    const finalUserBalance = (await getAccount(connection, userTokenAAccount)).amount;
    expect(
      new BN(finalUserBalance.toString()).eq(
        new BN(initialUserBalance.toString()).sub(depositAmount)
      )
    ).to.be.true;
  });

  it("Withdraws tokens (Token A)", async () => {
    const initialVaultBalance = (await getAccount(connection, vaultATokenAccount)).amount;
    const initialUserBalance = (await getAccount(connection, userTokenAAccount)).amount;

   
    await program.methods
      .withdrawTokens(withdrawAmount)
      .accounts({
        agent: agentPda,
        market: marketPda,
        user: user.publicKey,
        tokenMint: tokenAMint,
        userTokenAccount: userTokenAAccount,
        vault: vaultAPda,
        vaultTokenAccount: vaultATokenAccount,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const vaultTokenAccountInfo = await getAccount(connection, vaultATokenAccount);
    expect(
      new BN(vaultTokenAccountInfo.amount.toString()).eq(
        new BN(initialVaultBalance.toString()).sub(withdrawAmount)
      )
    ).to.be.true;

    const finalUserBalance = (await getAccount(connection, userTokenAAccount)).amount;
    expect(
      new BN(finalUserBalance.toString()).eq(
        new BN(initialUserBalance.toString()).add(withdrawAmount)
      )
    ).to.be.true;
  });

  it("Places a trade (Buy Token B with Token A)", async () => {
    [tradePda, tradeBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("trade"), agentPda.toBuffer(), marketPda.toBuffer()],
      program.programId
    );

    await program.methods
      .placeTrade(0, amountIn, amountOut)
      .accounts({
        agent: agentPda,
        market: marketPda,
        trade: tradePda,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const tradeAccount = await program.account.trade.fetch(tradePda);
    expect(tradeAccount.agent.toBase58()).to.equal(agentPda.toBase58());
    expect(tradeAccount.market.toBase58()).to.equal(marketPda.toBase58());
    expect(tradeAccount.tradeType).to.equal(0);
    expect(tradeAccount.amountIn.toString()).to.equal(amountIn.toString());
    expect(tradeAccount.amountOut.toString()).to.equal(amountOut.toString());
    expect(tradeAccount.bump).to.equal(tradeBump);
  });

  it("Executes the trade", async () => {
    await mintTo(
      connection,
      wallet.payer,
      tokenBMint,
      vaultBTokenAccount,
      wallet.payer,
      BigInt(amountOut.toString())
    );

    await program.methods
      .executeTrade()
      .accounts({
        trade: tradePda,
        market: marketPda,
        agent: agentPda,
        user: user.publicKey,
        tokenInMint: tokenAMint,
        tokenOutMint: tokenBMint,
        userTokenAccountIn: userTokenAAccount,
        userTokenAccountOut: userTokenBAccount,
        vaultIn: vaultAPda,
        vaultTokenAccountIn: vaultATokenAccount,
        vaultOut: vaultBPda,
        vaultTokenAccountOut: vaultBTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    
    const tradeAccountInfo = await provider.connection.getAccountInfo(tradePda);
    expect(tradeAccountInfo).to.be.null;
  });
});
