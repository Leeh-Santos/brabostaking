# Wallet Connection Integration

This document explains how the wallet connection system works in the Brabo Staking application.

## Overview

The `wallet_connect.js` module provides a unified interface for connecting to multiple Web3 wallets:
- **MetaMask** - Browser extension wallet
- **Base Wallet** (Coinbase Wallet) - Browser extension wallet
- **Phantom Wallet** - Browser extension wallet with EVM support

## Features

### Multi-Wallet Detection
The system automatically detects which wallets are installed in the user's browser and presents them in a modal for selection.

### Automatic Network Switching
The wallet connector automatically:
- Detects the current network
- Switches to Base network (Chain ID: 8453) if needed
- Adds the Base network to the wallet if it doesn't exist

### User-Friendly Modal
When multiple wallets are detected, users see a clean modal interface to choose their preferred wallet.

## Usage

### Basic Connection

```javascript
import { walletConnector } from './wallet_connect.js';

// Connect to wallet (defaults to Base mainnet)
const connection = await walletConnector.connect();

// Access wallet details
console.log(connection.address);      // User's wallet address
console.log(connection.walletType);   // Type of wallet (metamask, phantom, base)
console.log(connection.provider);     // Ethers provider
console.log(connection.signer);       // Ethers signer
```

### Connect to Different Network

```javascript
// Connect to Base Sepolia testnet
const connection = await walletConnector.connect(84532);
```

### Check Connection Status

```javascript
if (walletConnector.isConnected()) {
    console.log('Wallet is connected');
}
```

### Disconnect

```javascript
walletConnector.disconnect();
```

## Integration in staking.js

The `staking.js` file has been updated to use the wallet connector:

1. Import the wallet connector
2. Use `walletConnector.connect()` instead of direct `window.ethereum` calls
3. The connector handles all wallet detection and network switching

## Supported Networks

- **Base Mainnet** (Chain ID: 8453)
- **Base Sepolia Testnet** (Chain ID: 84532)

## Error Handling

The wallet connector throws descriptive errors:
- No wallet detected
- User cancelled connection
- Network switch failed
- Connection rejected

All errors are caught and displayed via toast notifications in the UI.

## Styling

The wallet selection modal is fully styled with:
- Glassmorphism effects
- Smooth animations
- Hover states
- Responsive design
- Dark theme matching the app

## Browser Compatibility

Works in all modern browsers that support:
- ES6 modules
- Web3 wallet extensions
- Async/await

## Security

- No private keys are stored or transmitted
- All wallet interactions use standard EIP-1193 provider API
- Network configurations are hardcoded and verified
