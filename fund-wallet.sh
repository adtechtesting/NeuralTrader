#!/bin/bash
if [ -z "$1" ]; then
  echo "Usage: ./fund-wallet.sh 75RKxPxsXtL7KffGijaGAYWE86VGE8hBJWnraXULR39U 10"
  exit 1
fi

WALLET_ADDRESS=$1
AMOUNT=${2:-10}

echo "Funding wallet $WALLET_ADDRESS with $AMOUNT SOL..."
solana airdrop $AMOUNT $WALLET_ADDRESS --url https://api.devnet.solana.com



