import type { NextConfig } from "next";
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@prisma/client"], // Updated from experimental.serverComponentsExternalPackages
  
  webpack: (config, { isServer }) => {
    // Add fallbacks for Node.js modules used by Solana web3.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      os: false,
      path: false,
      crypto: false,
      stream: false,
      http: false,
      https: false,
      zlib: false,
      url: false,
      'jayson/lib/client/browser': false,
      'rpc-websockets': false,
      'rpc-websockets/dist/lib/client': false,
      'rpc-websockets/dist/lib/client/websocket': false,
    };
    
    // Use mock files for browser environment
    if (!isServer) {
      // Create explicit mocks for required dependencies
      config.resolve.alias = {
        ...config.resolve.alias,
        // Mock all Solana web3.js imports to use our mock implementation
        '@solana/web3.js': path.resolve(__dirname, './src/lib/mocks/solana-web3.js'),
        'rpc-websockets': path.resolve(__dirname, './src/lib/mocks/rpc-websockets.js'),
        'rpc-websockets/dist/lib/client': path.resolve(__dirname, './src/lib/mocks/rpc-websockets.js'),
        'rpc-websockets/dist/lib/client/websocket': path.resolve(__dirname, './src/lib/mocks/websocket-mock.js'),
      };
    }
    
    // Ignore all warning messages
    config.ignoreWarnings = [
      { message: /.*/ }
    ];
    
    return config;
  },
};

export default nextConfig;
