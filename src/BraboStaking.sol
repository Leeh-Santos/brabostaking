// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {NftBrabo} from "./NftBrabo.sol";

error Staking__NotOwner();
error Staking__ZeroAmount();
error Staking__InsufficientBalance();
error Staking__NoStake();
error Staking__TransferFailed();
error Staking__Paused();
error Staking__InsufficientRewardPool();


contract BraboStaking is ReentrancyGuard {


    IERC20 public immutable picaToken;
    NftBrabo public immutable braboNft;
    address private immutable i_owner;

    bool public paused;

    uint256 public constant BASE_APR = 20;          // 20% base annual rate
    uint256 public constant BRONZE_BOOST = 2;       // +2%
    uint256 public constant SILVER_BOOST = 5;       // +5%
    uint256 public constant GOLD_BOOST = 10;        // +10%
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant PRECISION = 1e18;

    struct StakeInfo {
        uint256 amount;          // staked PICA (18 decimals)
        uint256 startTime;       // when current stake was last updated
        uint256 accruedRewards;  // rewards already calculated but not yet claimed
    }

    mapping(address => StakeInfo) public stakes;
    address[] public stakers;
    mapping(address => bool) private isStaker;

    uint256 public totalStaked;
    uint256 public totalRewardsPaid;
    uint256 public totalStakers;

    // ─── Events ───────────────────────────────────────────────────────

    event Staked(address indexed user, uint256 amount, uint256 effectiveAPR);
    event Unstaked(address indexed user, uint256 amount, uint256 rewardsPaid);
    event RewardsClaimed(address indexed user, uint256 rewardsPaid);
    event RewardsDeposited(uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    // ─── Modifiers ────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != i_owner) revert Staking__NotOwner();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert Staking__Paused();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────

    constructor(address _picaToken, address _braboNft) {
        i_owner = msg.sender;
        picaToken = IERC20(_picaToken);
        braboNft = NftBrabo(_braboNft);
    }

    // ─── Core Functions ───────────────────────────────────────────────

    /**
     * @notice Stake PICA tokens. If already staking, accrued rewards are
     *         snapshotted and the new total begins earning at current rate.
     * @param amount Amount of PICA to stake (18 decimals)
     */
    function stake(uint256 amount) external whenNotPaused nonReentrant {
        if (amount == 0) revert Staking__ZeroAmount();

        StakeInfo storage info = stakes[msg.sender];



        if (info.amount > 0) {
            info.accruedRewards += _calculatePendingRewards(msg.sender);
        }

        // Transfer PICA from user
        bool success = picaToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert Staking__TransferFailed();

        info.amount += amount;
        info.startTime = block.timestamp;

        totalStaked += amount;

        // Track unique stakers
        if (!isStaker[msg.sender]) {
            stakers.push(msg.sender);
            isStaker[msg.sender] = true;
            totalStakers++;
        }

        emit Staked(msg.sender, amount, getEffectiveAPR(msg.sender));
    }

    /**
     * @notice Unstake all PICA and claim accumulated rewards.
     */
    function unstake() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert Staking__NoStake();

        uint256 rewards = info.accruedRewards + _calculatePendingRewards(msg.sender);
        uint256 stakedAmount = info.amount;

        // Reset user state BEFORE reward pool check
        totalStaked -= stakedAmount;
        info.amount = 0;
        info.startTime = 0;
        info.accruedRewards = 0;

        // Check reward pool can cover rewards (user's stake already excluded from totalStaked)
        uint256 rewardPool = _rewardPoolBalance();
        if (rewardPool < rewards) {
            rewards = rewardPool; // cap to available rewards
        }

        // Transfer staked + rewards
        uint256 totalPayout = stakedAmount + rewards;
        bool success = picaToken.transfer(msg.sender, totalPayout);
        if (!success) revert Staking__TransferFailed();

        totalRewardsPaid += rewards;

        emit Unstaked(msg.sender, stakedAmount, rewards);
    }

    /**
     * @notice Claim accrued rewards without unstaking.
     */
    function claimRewards() external whenNotPaused nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert Staking__NoStake();

        uint256 rewards = info.accruedRewards + _calculatePendingRewards(msg.sender);
        if (rewards == 0) revert Staking__ZeroAmount();

        uint256 rewardPool = _rewardPoolBalance();
        if (rewardPool < rewards) {
            rewards = rewardPool;
        }

        // Reset accrual, restart timer
        info.accruedRewards = 0;
        info.startTime = block.timestamp;

        bool success = picaToken.transfer(msg.sender, rewards);
        if (!success) revert Staking__TransferFailed();

        totalRewardsPaid += rewards;

        emit RewardsClaimed(msg.sender, rewards);
    }

    /**
     * @notice Emergency unstake — forfeits all rewards, ignores lock period.
     */
    function emergencyWithdraw() external nonReentrant {
        StakeInfo storage info = stakes[msg.sender];
        if (info.amount == 0) revert Staking__NoStake();

        uint256 stakedAmount = info.amount;

        totalStaked -= stakedAmount;
        info.amount = 0;
        info.startTime = 0;
        info.accruedRewards = 0;

        bool success = picaToken.transfer(msg.sender, stakedAmount);
        if (!success) revert Staking__TransferFailed();

        emit EmergencyWithdraw(msg.sender, stakedAmount);
    }

    // ─── Internal ─────────────────────────────────────────────────────

    /**
     * @dev Calculate pending rewards since last startTime for a user.
     *      reward = stakedAmount * effectiveAPR * timeElapsed / (SECONDS_PER_YEAR * 100)
     */
    function _calculatePendingRewards(address user) internal view returns (uint256) {
        StakeInfo storage info = stakes[user];
        if (info.amount == 0 || info.startTime == 0) return 0;

        uint256 elapsed = block.timestamp - info.startTime;
        uint256 apr = getEffectiveAPR(user);

        // (amount * apr * elapsed) / (365 days * 100)
        return (info.amount * apr * elapsed) / (SECONDS_PER_YEAR * 100);
    }

    /**
     * @dev Returns the reward pool balance (contract PICA minus all staked PICA).
     */
    function _rewardPoolBalance() internal view returns (uint256) {
        uint256 contractBalance = picaToken.balanceOf(address(this));
        if (contractBalance <= totalStaked) return 0;
        return contractBalance - totalStaked;
    }

    /**
     * @dev Get NFT tier boost for a user (mirrors FundMe logic).
     */
    function _getNftBoost(address user) internal view returns (uint256) {
        try braboNft.getUserTier(user) returns (uint256 tier) {
            if (tier == 0) return BRONZE_BOOST;
            if (tier == 1) return SILVER_BOOST;
            if (tier == 2) return GOLD_BOOST;
            return 0;
        } catch {
            return 0;
        }
    }

    // ─── View Functions ───────────────────────────────────────────────

    /**
     * @notice Effective APR for a user (base + NFT boost).
     */
    function getEffectiveAPR(address user) public view returns (uint256) {
        return BASE_APR + _getNftBoost(user);
    }

    /**
     * @notice Total pending rewards for a user (accrued + pending since last update).
     */
    function getPendingRewards(address user) external view returns (uint256) {
        StakeInfo storage info = stakes[user];
        return info.accruedRewards + _calculatePendingRewards(user);
    }

    /**
     * @notice How much PICA is available for reward payouts.
     */
    function getRewardPoolBalance() external view returns (uint256) {
        uint256 contractBalance = picaToken.balanceOf(address(this));
        if (contractBalance <= totalStaked) return 0;
        return contractBalance - totalStaked;
    }

    /**
     * @notice Get full stake info for a user.
     */
    function getStakeInfo(address user) external view returns (
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 effectiveAPR,
        string memory nftTier
    ) {
        StakeInfo storage info = stakes[user];
        stakedAmount = info.amount;
        pendingRewards = info.accruedRewards + _calculatePendingRewards(user);
        effectiveAPR = getEffectiveAPR(user);

        uint256 boost = _getNftBoost(user);
        if (boost == GOLD_BOOST) nftTier = "Gold";
        else if (boost == SILVER_BOOST) nftTier = "Silver";
        else if (boost == BRONZE_BOOST) nftTier = "Bronze";
        else nftTier = "No NFT";
    }

    function getStaker(uint256 index) external view returns (address) {
        return stakers[index];
    }

    function getOwner() external view returns (address) {
        return i_owner;
    }

    // ─── Admin ────────────────────────────────────────────────────────

    /**
     * @notice Owner deposits PICA into the reward pool.
     */
    function depositRewards(uint256 amount) external onlyOwner {
        bool success = picaToken.transferFrom(msg.sender, address(this), amount);
        if (!success) revert Staking__TransferFailed();
        emit RewardsDeposited(amount);
    }

    /**
     * @notice Owner withdraws excess reward tokens (cannot touch staked tokens).
     */
    function withdrawExcessRewards(uint256 amount) external onlyOwner {
        uint256 contractBalance = picaToken.balanceOf(address(this));
        uint256 available = contractBalance > totalStaked ? contractBalance - totalStaked : 0;
        require(amount <= available, "Cannot withdraw staked tokens");

        bool success = picaToken.transfer(i_owner, amount);
        if (!success) revert Staking__TransferFailed();
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function withdrawPicaTokens() public onlyOwner {
        uint256 balance = picaToken.balanceOf(address(this));
        bool success = picaToken.transfer(i_owner, balance);
        require(success, "Token withdrawal failed");
    }
}
