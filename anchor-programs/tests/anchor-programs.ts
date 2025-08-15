import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorPrograms } from "../target/types/anchor_programs";
import { PublicKey, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  transfer,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";

describe("agent_market_sim", () => {
  const provider=anchor.getProvider()
  const program = anchor.workspace.AnchorPrograms as Program<AnchorPrograms>;

 
});
