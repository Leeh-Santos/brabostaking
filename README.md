# BraboStaking

A staking protocol deployed on **Base mainnet** that lets holders earn yield on the **$BRB token**, with APR boosts unlocked by holding a **BraboNFT**.

---

## Contracts (Base Mainnet)

| Contract | Address |
|---|---|
| BraboStaking | `0x92066e5319D1CCd0E039a19693e04c1ec01f2BE3` |
| $BRB Token | `0x07f6A4932e8be5Be7a0aC1bfCAB5EF6b95B0b1a2` |
| BraboNFT (BNFT) | `0x680cc2149bc0E7A4Aa83f462F28aee1639C1355a` |

---

## The $BRB Token

$BRB is the native ERC-20 token of the Brabo ecosystem. It is the staking asset — users deposit $BRB into the protocol to earn yield, and rewards are also paid out in $BRB.

---

## Staking Mechanics

### APR

| Tier | Rate |
|---|---|
| Base (no NFT) | 20% |
| Bronze NFT | 22% |
| Silver NFT | 25% |
| Gold NFT | 30% |

Rewards accrue continuously based on elapsed time since the last stake or claim. The formula is:

```
reward = stakedAmount × effectiveAPR × timeElapsed / (365 days × 100)
```

Rewards are paid from a dedicated reward pool funded by the protocol owner. If the pool runs dry, payouts are capped to whatever is available — staked principal is always protected.

### Core Actions

| Action | Description |
|---|---|
| `stake(amount)` | Deposit $BRB. If already staking, pending rewards are snapshotted first. |
| `unstake()` | Withdraw full stake + all accrued rewards in one transaction. |
| `claimRewards()` | Claim accrued rewards without touching the staked principal. |
| `emergencyWithdraw()` | Withdraw principal immediately, forfeiting all pending rewards. |

### Reward Pool

The reward pool is the contract's $BRB balance minus the total staked principal. The owner can top it up via `depositRewards()` and recover excess via `withdrawExcessRewards()`.

---

## BraboNFT

BraboNFT (ticker: `BNFT`) is an on-chain ERC-721 with fully on-chain SVG artwork. Each wallet can hold at most one NFT. Tiers are upgraded based on cumulative funding activity:

| Tier | Threshold | APR Boost |
|---|---|---|
| Bronze | Default | +2% |
| Silver | $50+ funded | +5% |
| Gold | $100+ funded | +10% |

Tiers only go up — a Gold NFT can never be downgraded. The artwork updates on-chain to reflect the current tier.

---

## Tech Stack

- **Smart Contracts**: Solidity `^0.8.18`, [Foundry](https://getfoundry.sh/), OpenZeppelin
- **Security**: `ReentrancyGuard` on all state-changing functions; custom typed errors
- **Frontend**: Vanilla JS + HTML/CSS with MetaMask / injected wallet support
- **Network**: Base (chain ID `8453`)

---

## Local Development

**Prerequisites**: [Foundry](https://getfoundry.sh/) installed.

```bash
# Install dependencies
forge install

# Build
forge build

# Test
forge test

# Deploy (requires .env with PRIVATE_KEY and RPC_URL)
forge script script/DeployStaking.s.sol --rpc-url $RPC_URL --broadcast
```

### Frontend

```bash
cd staking-frontend
npm install
./start_server.sh
```

Copy `config.example.js` to `config.js` and fill in your RPC endpoint before running.

---

## Security Considerations

- All user-facing functions (`stake`, `unstake`, `claimRewards`, `emergencyWithdraw`) are protected against reentrancy.
- The owner can pause `stake` and `claimRewards` via `setPaused()`. `unstake` and `emergencyWithdraw` are always available so users can always exit.
- The reward pool and staked principal are accounted for separately — the owner can never withdraw staked user funds through `withdrawExcessRewards`.

---

## License

MIT
