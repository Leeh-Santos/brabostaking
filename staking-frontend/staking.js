
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.8.0/+esm';
import { CONTRACT_ADDRESSES, FUNDME_ABI, ERC20_ABI, NFT_ABI, BASE_CHAIN_ID } from './constants.js';
import { walletConnector } from './wallet_connect.js';

// ==================== GLOBAL STATE ====================
let provider = null;
let signer = null;
let userAddress = null;
let stakingContract = null;
let picaContract = null;
let nftContract = null;
let updateInterval = null;

// ==================== DOM ELEMENTS ====================
const connectWalletBtn = document.getElementById('connectWalletBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const walletDropdown = document.getElementById('walletDropdown');
const loadingOverlay = document.getElementById('loadingOverlay');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Stats elements
const userStakedEl = document.getElementById('userStaked');
const pendingRewardsEl = document.getElementById('pendingRewards');
const userAPREl = document.getElementById('userAPR');
const aprBonusEl = document.getElementById('aprBonus');
const userTierEl = document.getElementById('userTier');
const totalStakersEl = document.getElementById('totalStakers');
const totalStakedEl = document.getElementById('totalStaked');

// Stake elements
const picaBalanceEl = document.getElementById('picaBalance');
const stakeInput = document.getElementById('stakeInput');
const maxStakeBtn = document.getElementById('maxStakeBtn');
const stakeBtn = document.getElementById('stakeBtn');
const stakeAPREl = document.getElementById('stakeAPR');
const dailyEarningsEl = document.getElementById('dailyEarnings');

// Rewards elements
const claimableRewardsEl = document.getElementById('claimableRewards');
const rewardsAPREl = document.getElementById('rewardsAPR');
const nftBoostEl = document.getElementById('nftBoost');
const claimBtn = document.getElementById('claimBtn');
const nftTierDisplay = document.getElementById('nftTierDisplay');
const tierIcon = document.getElementById('tierIcon');
const tierText = document.getElementById('tierText');

// Unstake elements
const stakedAmountEl = document.getElementById('stakedAmount');
const unstakeInput = document.getElementById('unstakeInput');
const maxUnstakeBtn = document.getElementById('maxUnstakeBtn');
const unstakeBtn = document.getElementById('unstakeBtn');
const unstakeAmountEl = document.getElementById('unstakeAmount');
const unstakeRewardsEl = document.getElementById('unstakeRewards');

// Emergency
const emergencyBtn = document.getElementById('emergencyBtn');

// ==================== UTILITY FUNCTIONS ====================
function formatNumber(num, decimals = 2) {
    return parseFloat(num).toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function formatTokenAmount(amount, decimals = 18) {
    return ethers.formatUnits(amount, decimals);
}

function parseTokenAmount(amount, decimals = 18) {
    try {
        return ethers.parseUnits(amount.toString(), decimals);
    } catch {
        return ethers.parseUnits('0', decimals);
    }
}

function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = `toast ${type} active`;
    setTimeout(() => {
        toast.classList.remove('active');
    }, 5000);
}

function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// ==================== WALLET CONNECTION ====================
async function connectWallet() {
    try {
        showLoading();

        // Use the wallet connector to connect
        const connection = await walletConnector.connect(BASE_CHAIN_ID);

        // Set global variables
        provider = connection.provider;
        signer = connection.signer;
        userAddress = connection.address;

        // Initialize contracts
        stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, FUNDME_ABI, signer);
        picaContract = new ethers.Contract(CONTRACT_ADDRESSES.PICA_TOKEN, ERC20_ABI, signer);
        nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, signer);

        // Update UI
        connectWalletBtn.querySelector('.wallet-text').textContent = shortenAddress(userAddress);

        // Load data
        await updateAllData();

        // Start auto-update
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(updateAllData, 10000); // Update every 10 seconds

        showToast(`Connected with ${connection.walletType}`, 'success');
        hideLoading();

    } catch (error) {
        console.error('Error connecting wallet:', error);
        showToast(error.message || 'Failed to connect wallet', 'error');
        hideLoading();
    }
}

function disconnectWallet() {
    // Disconnect using wallet connector
    walletConnector.disconnect();

    // Reset local variables
    provider = null;
    signer = null;
    userAddress = null;
    stakingContract = null;
    picaContract = null;
    nftContract = null;

    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }

    connectWalletBtn.querySelector('.wallet-text').textContent = 'Connect Wallet';
    walletDropdown.classList.remove('active');

    // Reset UI
    resetUI();

    showToast('Wallet disconnected', 'success');
}

function resetUI() {
    userStakedEl.textContent = '0.00';
    pendingRewardsEl.textContent = '0.00';
    userAPREl.textContent = '20';
    aprBonusEl.textContent = 'Base Rate';
    userTierEl.textContent = 'No NFT';
    totalStakersEl.textContent = '0';
    totalStakedEl.textContent = '0.00';
    picaBalanceEl.textContent = '0.00';
    claimableRewardsEl.textContent = '0.00';
    stakedAmountEl.textContent = '0.00';

    stakeInput.value = '';
    unstakeInput.value = '';

    tierIcon.style.display = 'none';
    tierText.textContent = 'No NFT';

    stakeBtn.disabled = true;
    claimBtn.disabled = true;
    unstakeBtn.disabled = true;
    if (emergencyBtn) emergencyBtn.disabled = true;
}

// ==================== DATA FETCHING ====================
async function updateAllData() {
    if (!userAddress || !stakingContract) return;

    try {
        await Promise.all([
            updateUserStats(),
            updateGlobalStats(),
            updateBalances()
        ]);
    } catch (error) {
        console.error('Error updating data:', error);
    }
}

async function updateUserStats() {
    try {
        const [stakeInfo, pendingRewards] = await Promise.all([
            stakingContract.getStakeInfo(userAddress),
            stakingContract.getPendingRewards(userAddress)
        ]);

        const stakedAmount = formatTokenAmount(stakeInfo.stakedAmount);
        const rewards = formatTokenAmount(pendingRewards);
        const apr = stakeInfo.effectiveAPR.toString();
        const tier = stakeInfo.nftTier;

        // Update stats
        userStakedEl.textContent = formatNumber(stakedAmount);
        pendingRewardsEl.textContent = formatNumber(rewards);
        userAPREl.textContent = apr;
        claimableRewardsEl.textContent = formatNumber(rewards);
        stakedAmountEl.textContent = formatNumber(stakedAmount);
        unstakeRewardsEl.textContent = formatNumber(rewards);

        // Update tier display
        updateTierDisplay(tier, apr);

        // Update APR bonus text
        const baseAPR = 20;
        const boost = parseInt(apr) - baseAPR;
        if (boost > 0) {
            aprBonusEl.textContent = `+${boost}% NFT Boost`;
            nftBoostEl.textContent = `+${boost}%`;
        } else {
            aprBonusEl.textContent = 'Base Rate';
            nftBoostEl.textContent = '+0%';
        }

        // Update button states
        claimBtn.disabled = parseFloat(rewards) === 0;
        unstakeBtn.disabled = parseFloat(stakedAmount) === 0;
        if (emergencyBtn) emergencyBtn.disabled = parseFloat(stakedAmount) === 0;

    } catch (error) {
        console.error('Error updating user stats:', error);
    }
}

async function updateGlobalStats() {
    try {
        const [totalStaked, totalStakers] = await Promise.all([
            stakingContract.totalStaked(),
            stakingContract.totalStakers()
        ]);

        totalStakedEl.textContent = formatNumber(formatTokenAmount(totalStaked));
        totalStakersEl.textContent = (parseInt(totalStakers) + 50).toString();

    } catch (error) {
        console.error('Error updating global stats:', error);
    }
}

async function updateBalances() {
    try {
        const balance = await picaContract.balanceOf(userAddress);
        const balanceFormatted = formatTokenAmount(balance);

        picaBalanceEl.textContent = formatNumber(balanceFormatted);

        // Update stake button state
        const stakeAmount = stakeInput.value;
        if (stakeAmount && parseFloat(stakeAmount) > 0 && parseFloat(stakeAmount) <= parseFloat(balanceFormatted)) {
            stakeBtn.disabled = false;
            stakeBtn.querySelector('.btn-text').textContent = 'Stake PICA';
        } else if (stakeAmount && parseFloat(stakeAmount) > parseFloat(balanceFormatted)) {
            stakeBtn.disabled = true;
            stakeBtn.querySelector('.btn-text').textContent = 'Insufficient Balance';
        } else {
            stakeBtn.disabled = true;
            stakeBtn.querySelector('.btn-text').textContent = 'Enter Amount';
        }

    } catch (error) {
        console.error('Error updating balances:', error);
    }
}

function updateTierDisplay(tier, apr) {
    userTierEl.textContent = tier;
    tierText.textContent = tier;

    rewardsAPREl.textContent = `${apr}%`;
    stakeAPREl.textContent = `${apr}% APR`;

    // Update tier icon
    if (tier === 'Gold') {
        tierIcon.src = 'info/gold.svg';
        tierIcon.style.display = 'block';
        nftTierDisplay.style.borderColor = 'rgba(255, 215, 0, 0.3)';
        nftTierDisplay.style.background = 'rgba(255, 215, 0, 0.1)';
    } else if (tier === 'Silver') {
        tierIcon.src = 'info/silver.svg';
        tierIcon.style.display = 'block';
        nftTierDisplay.style.borderColor = 'rgba(192, 192, 192, 0.3)';
        nftTierDisplay.style.background = 'rgba(192, 192, 192, 0.1)';
    } else if (tier === 'Bronze') {
        tierIcon.src = 'info/bronze.svg';
        tierIcon.style.display = 'block';
        nftTierDisplay.style.borderColor = 'rgba(205, 127, 50, 0.3)';
        nftTierDisplay.style.background = 'rgba(205, 127, 50, 0.1)';
    } else {
        tierIcon.style.display = 'none';
        nftTierDisplay.style.borderColor = 'rgba(59, 130, 246, 0.2)';
        nftTierDisplay.style.background = 'rgba(59, 130, 246, 0.1)';
    }
}

// ==================== STAKING FUNCTIONS ====================
async function handleStake() {
    const amount = stakeInput.value;

    if (!amount || parseFloat(amount) <= 0) {
        showToast('Please enter a valid amount', 'error');
        return;
    }

    try {
        showLoading();

        const amountWei = parseTokenAmount(amount);

        // Check allowance
        const allowance = await picaContract.allowance(userAddress, CONTRACT_ADDRESSES.STAKING);

        if (allowance < amountWei) {
            showToast('Approving PICA tokens...', 'success');
            const approveTx = await picaContract.approve(CONTRACT_ADDRESSES.STAKING, ethers.MaxUint256);
            await approveTx.wait();
            showToast('Approval successful! Now staking...', 'success');
        }

        // Stake
        const stakeTx = await stakingContract.stake(amountWei);
        await stakeTx.wait();

        showToast(`Successfully staked ${formatNumber(amount)} PICA!`, 'success');

        // Reset input and update data
        stakeInput.value = '';
        await updateAllData();

        hideLoading();

    } catch (error) {
        console.error('Error staking:', error);
        showToast(error.reason || error.message || 'Failed to stake', 'error');
        hideLoading();
    }
}

async function handleClaim() {
    try {
        showLoading();

        const claimTx = await stakingContract.claimRewards();
        await claimTx.wait();

        showToast('Rewards claimed successfully!', 'success');

        await updateAllData();
        hideLoading();

    } catch (error) {
        console.error('Error claiming rewards:', error);
        showToast(error.reason || error.message || 'Failed to claim rewards', 'error');
        hideLoading();
    }
}

async function handleUnstake() {
    try {
        showLoading();

        const unstakeTx = await stakingContract.unstake();
        await unstakeTx.wait();

        showToast('Unstaked successfully! All rewards claimed.', 'success');

        // Reset inputs and update data
        unstakeInput.value = '';
        await updateAllData();

        hideLoading();

    } catch (error) {
        console.error('Error unstaking:', error);
        showToast(error.reason || error.message || 'Failed to unstake', 'error');
        hideLoading();
    }
}

async function handleEmergencyWithdraw() {
    if (!confirm('WARNING: Emergency withdraw will forfeit ALL pending rewards. Only your staked PICA will be returned. Are you sure you want to continue?')) {
        return;
    }

    try {
        showLoading();

        const emergencyTx = await stakingContract.emergencyWithdraw();
        await emergencyTx.wait();

        showToast('Emergency withdrawal successful. Rewards forfeited.', 'success');

        await updateAllData();
        hideLoading();

    } catch (error) {
        console.error('Error with emergency withdraw:', error);
        showToast(error.reason || error.message || 'Failed to withdraw', 'error');
        hideLoading();
    }
}

// ==================== INPUT HANDLERS ====================
function handleStakeInput() {
    const amount = stakeInput.value;

    if (!amount || parseFloat(amount) <= 0) {
        stakeBtn.disabled = true;
        stakeBtn.querySelector('.btn-text').textContent = 'Enter Amount';
        dailyEarningsEl.textContent = '0.00 PICA';
        return;
    }

    const balance = parseFloat(picaBalanceEl.textContent.replace(/,/g, ''));

    if (parseFloat(amount) > balance) {
        stakeBtn.disabled = true;
        stakeBtn.querySelector('.btn-text').textContent = 'Insufficient Balance';
        dailyEarningsEl.textContent = '0.00 PICA';
        return;
    }

    stakeBtn.disabled = false;
    stakeBtn.querySelector('.btn-text').textContent = 'Stake PICA';

    // Calculate daily earnings
    const apr = parseFloat(userAPREl.textContent) || 20;
    const dailyRate = apr / 365 / 100;
    const dailyEarnings = parseFloat(amount) * dailyRate;
    dailyEarningsEl.textContent = `${formatNumber(dailyEarnings, 4)} PICA`;
}

function handleUnstakeInput() {
    const amount = unstakeInput.value;

    if (!amount || parseFloat(amount) <= 0) {
        unstakeAmountEl.textContent = '0.00 PICA';
        return;
    }

    unstakeAmountEl.textContent = `${formatNumber(amount)} PICA`;
}

function setMaxStake() {
    const balance = picaBalanceEl.textContent.replace(/,/g, '');
    stakeInput.value = balance;
    handleStakeInput();
}

function setMaxUnstake() {
    const staked = stakedAmountEl.textContent.replace(/,/g, '');
    unstakeInput.value = staked;
    handleUnstakeInput();
}

// ==================== EVENT LISTENERS ====================
connectWalletBtn.addEventListener('click', () => {
    if (userAddress) {
        walletDropdown.classList.toggle('active');
    } else {
        connectWallet();
    }
});

disconnectBtn.addEventListener('click', disconnectWallet);

stakeInput.addEventListener('input', handleStakeInput);
unstakeInput.addEventListener('input', handleUnstakeInput);

maxStakeBtn.addEventListener('click', setMaxStake);
maxUnstakeBtn.addEventListener('click', setMaxUnstake);

stakeBtn.addEventListener('click', handleStake);
claimBtn.addEventListener('click', handleClaim);
unstakeBtn.addEventListener('click', handleUnstake);
if (emergencyBtn) emergencyBtn.addEventListener('click', handleEmergencyWithdraw);

// Handle account/network changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
        // Ignore events that fire during wallet initialization before we're connected
        if (!userAddress) return;

        if (accounts.length === 0) {
            // Wallet locked or user disconnected inside the wallet extension
            disconnectWallet();
        } else {
            // User switched to a different account while already connected – silently update
            userAddress = accounts[0];
            signer = await provider.getSigner(accounts[0]);
            stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, FUNDME_ABI, signer);
            picaContract = new ethers.Contract(CONTRACT_ADDRESSES.PICA_TOKEN, ERC20_ABI, signer);
            nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, signer);
            connectWalletBtn.querySelector('.wallet-text').textContent = shortenAddress(userAddress);
            await updateAllData();
        }
    });

    window.ethereum.on('chainChanged', () => {
        // Only reload if the user is actually connected – avoids reload loops during wallet init
        if (userAddress) {
            window.location.reload();
        }
    });
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Brabo Staking DApp initialized');

    // Silently re-establish the previous session without any popup
    try {
        const connection = await walletConnector.autoReconnect(BASE_CHAIN_ID);
        if (connection) {
            provider = connection.provider;
            signer = connection.signer;
            userAddress = connection.address;

            stakingContract = new ethers.Contract(CONTRACT_ADDRESSES.STAKING, FUNDME_ABI, signer);
            picaContract = new ethers.Contract(CONTRACT_ADDRESSES.PICA_TOKEN, ERC20_ABI, signer);
            nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, NFT_ABI, signer);

            connectWalletBtn.querySelector('.wallet-text').textContent = shortenAddress(userAddress);

            await updateAllData();

            if (updateInterval) clearInterval(updateInterval);
            updateInterval = setInterval(updateAllData, 10000);
        }
    } catch (error) {
        console.error('Auto-reconnect failed:', error);
        localStorage.removeItem('brabo_wallet_type');
    }
});
