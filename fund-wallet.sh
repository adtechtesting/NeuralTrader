#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./fund-wallet.sh <wallet-address> [amount]"
  exit 1
fi

WALLET_ADDRESS=$1
AMOUNT=${2:-10}

echo "Funding wallet $WALLET_ADDRESS with $AMOUNT SOL..."
solana airdrop $AMOUNT $WALLET_ADDRESS --url http://localhost:8899


