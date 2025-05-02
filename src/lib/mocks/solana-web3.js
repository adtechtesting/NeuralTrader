/**
 * Mock implementation of @solana/web3.js for client-side usage
 * This prevents build errors with missing dependencies like rpc-websockets
 */

// Basic mock classes
class Connection {
  constructor() {
    this.rpcEndpoint = 'http://localhost:8899';
  }

  getBalance() {
    return Promise.resolve(1000000000);
  }

  getAccountInfo() {
    return Promise.resolve(null);
  }

  getRecentBlockhash() {
    return Promise.resolve({
      blockhash: 'mock-blockhash',
      lastValidBlockHeight: 1000,
    });
  }

  sendTransaction() {
    return Promise.resolve('mock-transaction-signature');
  }

  confirmTransaction() {
    return Promise.resolve({ value: { err: null } });
  }
}

class PublicKey {
  constructor(value) {
    this.value = value;
  }

  equals(other) {
    return this.value === other.value;
  }

  toString() {
    return this.value.toString();
  }

  toBase58() {
    return this.value.toString();
  }

  static fromString(address) {
    return new PublicKey(address);
  }
}

class Keypair {
  constructor() {
    this.publicKey = new PublicKey('mock-public-key');
    this.secretKey = new Uint8Array(32).fill(1);
  }

  static generate() {
    return new Keypair();
  }

  static fromSecretKey(secretKey) {
    return new Keypair();
  }
}

class Transaction {
  constructor() {
    this.instructions = [];
    this.recentBlockhash = null;
    this.feePayer = null;
  }

  add(...instructions) {
    this.instructions.push(...instructions);
    return this;
  }

  sign(keypair) {
    return this;
  }
}

class TransactionInstruction {
  constructor(options) {
    this.keys = options.keys || [];
    this.programId = options.programId;
    this.data = options.data || Buffer.from([]);
  }
}

class SystemProgram {
  static transfer(params) {
    return new TransactionInstruction({
      keys: [
        { pubkey: params.fromPubkey, isSigner: true, isWritable: true },
        { pubkey: params.toPubkey, isSigner: false, isWritable: true },
      ],
      programId: SystemProgram.programId,
      data: Buffer.from([]),
    });
  }
}
SystemProgram.programId = new PublicKey('11111111111111111111111111111111');

// Export all the mock classes
module.exports = {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  // Add more mocks for any other used classes
  clusterApiUrl: (cluster) => `https://api.${cluster}.solana.com`,
  LAMPORTS_PER_SOL: 1_000_000_000,
};