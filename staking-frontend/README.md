# Brabo Staking Frontend

Professional staking interface for the BraboStaking.sol contract with NFT tier integration.

## 🎨 Features

- **Stake PICA Tokens**: Deposit tokens to earn rewards
- **Earn Rewards**: Base 20% APR + NFT tier bonuses (up to 30% APR)
- **NFT Tier System**:
  - Bronze: +2% APR boost (Fund $5+ USD)
  - Silver: +5% APR boost (Fund $50+ USD)
  - Gold: +10% APR boost (Fund $100+ USD)
- **Claim Anytime**: Claim rewards without unstaking
- **Flexible Unstaking**: Withdraw stake + rewards anytime
- **Emergency Withdraw**: Quick withdrawal (forfeits rewards)
- **Real-time Updates**: Live balance, rewards, and APR tracking

## 📁 Project Structure

```
staking-frontend/
├── staking.html          # Main staking interface
├── staking.css           # Professional styling
├── staking.js            # Web3 integration & contract interactions
├── config.example.js     # Configuration template
├── info/
│   ├── background.css    # Background styling (reused)
│   ├── index.html        # Funding page
│   ├── BraboStaking.sol  # Staking contract
│   ├── NftBrabo.sol      # NFT contract
│   ├── gold.svg          # Gold tier NFT image
│   ├── silver.svg        # Silver tier NFT image
│   ├── bronze.svg        # Bronze tier NFT image
│   └── tkimg.png         # Project logo
└── README.md
```

## 🚀 Quick Start

### 1. Update Contract Addresses

Open `staking.js` and update the contract addresses at the top:

```javascript
const STAKING_CONTRACT_ADDRESS = '0xYourActualStakingAddress';
const PICA_TOKEN_ADDRESS = '0xYourActualPicaTokenAddress';
const NFT_CONTRACT_ADDRESS = '0xYourActualNftBraboAddress';
```

### 2. Add ethers.js Library

Add this script tag in `staking.html` before the closing `</body>` tag:

```html
<script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
<script type="module" src="staking.js"></script>
```

**OR** use ethers v6 (recommended):

```html
<script type="module">
  import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6/dist/ethers.min.js";
  // Your code here
</script>
```

### 3. Deploy to Web Server

You can use any of these methods:

**Option A: Simple HTTP Server (Python)**
```bash
cd staking-frontend
python3 -m http.server 8000
# Visit http://localhost:8000/staking.html
```

**Option B: Node.js HTTP Server**
```bash
npx http-server -p 8000
# Visit http://localhost:8000/staking.html
```

**Option C: Deploy to Vercel/Netlify**
```bash
# Push to GitHub and connect to Vercel/Netlify
```

## 🔧 Configuration

### Contract Setup

Make sure your contracts are deployed to Base network:

1. **BraboStaking.sol** - Main staking contract
2. **PICA Token (ERC20)** - The token being staked
3. **NftBrabo.sol** - NFT contract for tier bonuses

### Required Contract Functions

The staking.js file expects these functions:

**BraboStaking.sol:**
- `stake(uint256 amount)`
- `unstake()`
- `claimRewards()`
- `emergencyWithdraw()`
- `getStakeInfo(address user)` → (stakedAmount, pendingRewards, effectiveAPR, nftTier)
- `getPendingRewards(address user)` → uint256
- `getEffectiveAPR(address user)` → uint256
- `totalStaked()` → uint256
- `totalStakers()` → uint256

**PICA Token (ERC20):**
- `balanceOf(address)`
- `allowance(address, address)`
- `approve(address, uint256)`

**NftBrabo.sol:**
- `getUserTier(address)` → uint256 (0=Bronze, 1=Silver, 2=Gold)

## 🎨 Design System

The frontend uses a professional dark theme with:
- **Primary Blue**: #3b82f6
- **Success Green**: #10b981
- **Warning Yellow**: #f59e0b
- **Background**: Dark gradients with subtle animations
- **Typography**: Modern system fonts
- **Components**: Glassmorphism effects with backdrop blur

## 📱 Responsive Design

Fully responsive and works on:
- Desktop (1920px+)
- Laptop (1024px - 1920px)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

## 🔐 Security Features

- **Input Validation**: All user inputs are validated
- **Amount Checks**: Prevents staking more than balance
- **Approval System**: Uses standard ERC20 approve/transferFrom
- **Error Handling**: Comprehensive error messages
- **Transaction Confirmation**: Shows loading states during transactions

## 🌐 Network Support

Currently configured for **Base Network** (Chain ID: 8453)

To change networks, update `BASE_CHAIN_ID` in `staking.js`:
```javascript
const BASE_CHAIN_ID = 8453; // Base mainnet
// Or use:
// const BASE_CHAIN_ID = 84532; // Base Sepolia testnet
// const BASE_CHAIN_ID = 1; // Ethereum mainnet
```

## 📊 Features Overview

### Staking Page Features

1. **Stats Dashboard**
   - Your staked amount
   - Pending rewards (real-time)
   - Current APR with NFT boost
   - Your NFT tier
   - Total stakers & total staked

2. **Stake Card**
   - Input amount to stake
   - MAX button for full balance
   - Shows estimated daily earnings
   - One-click staking

3. **Rewards Card**
   - Shows claimable rewards
   - Displays current APR and NFT boost
   - NFT tier indicator with icon
   - Claim without unstaking

4. **Unstake Card**
   - Unstake full amount + claim rewards
   - Shows total you'll receive
   - One-click unstaking

5. **NFT Tier Benefits**
   - Visual display of all tiers
   - Bronze, Silver, Gold cards
   - Shows APR and requirements

6. **Emergency Withdraw**
   - Quick withdrawal option
   - Warning about forfeiting rewards
   - For emergency situations only

## 🐛 Troubleshooting

### Wallet Won't Connect
- Make sure MetaMask or another Web3 wallet is installed
- Check that you're on Base Network
- Try refreshing the page

### Transactions Failing
- Ensure you have enough ETH for gas fees
- Check token approval (should auto-approve)
- Verify contract addresses are correct

### Rewards Not Updating
- Wait a few seconds for blockchain confirmation
- Click the refresh button
- Check that the staking contract is not paused

### Wrong Network
- The app will prompt you to switch to Base Network
- Click "Switch Network" in the popup
- Or manually switch in your wallet

## 🔄 Updates & Maintenance

The frontend auto-updates every 10 seconds:
- User staked amount
- Pending rewards
- Total staked
- APR calculations

To change update frequency, modify in `staking.js`:
```javascript
updateInterval = setInterval(updateAllData, 10000); // milliseconds
```

## 📝 Customization

### Change Colors
Edit CSS variables in `staking.css`:
```css
:root {
    --primary-blue: #3b82f6;
    --success-green: #10b981;
    /* etc... */
}
```

### Change Token Symbol
Update in `staking.js` and HTML to change "PICA" to your token symbol.

### Modify APR Rates
Update contract constants in `BraboStaking.sol` and redeploy:
```solidity
uint256 public constant BASE_APR = 20;
uint256 public constant BRONZE_BOOST = 2;
uint256 public constant SILVER_BOOST = 5;
uint256 public constant GOLD_BOOST = 10;
```

## 📄 License

MIT License - feel free to use and modify

## 🤝 Support

For issues or questions:
1. Check the contract addresses are correct
2. Verify you're on the right network
3. Check browser console for errors
4. Ensure contracts are deployed and verified

## 🚀 Going to Production

Before deploying to production:

1. ✅ Update all contract addresses
2. ✅ Test on testnet first (Base Sepolia)
3. ✅ Verify all contracts on block explorer
4. ✅ Test all functions (stake, unstake, claim, emergency)
5. ✅ Check responsive design on mobile
6. ✅ Verify NFT tier detection works
7. ✅ Test with different wallet amounts
8. ✅ Deploy to production server
9. ✅ Monitor for errors

## 📚 Integration with Existing Site

To add a link to the staking page from your existing `info/index.html`:

Add this to the page navigation:
```html
<a href="../staking.html" class="page-nav-tab">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <path d="M12 1v6m0 6v6M5.6 5.6l4.2 4.2m4.4 4.4l4.2 4.2M1 12h6m6 0h6M5.6 18.4l4.2-4.2m4.4-4.4l4.2-4.2"/>
    </svg>
    <span>Staking</span>
</a>
```

---

**Built with ❤️ for the Brabo ecosystem**
