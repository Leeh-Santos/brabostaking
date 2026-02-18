// ==================== BRABO STAKING CONFIGURATION ====================
// Copy this file to config.js and update with your actual contract addresses

export const CONFIG = {
    // Contract Addresses (UPDATE THESE)
    STAKING_CONTRACT: '0xYourStakingContractAddress',
    PICA_TOKEN: '0xYourPicaTokenAddress',
    NFT_CONTRACT: '0xYourNftBraboAddress',

    // Network Configuration
    CHAIN_ID: 8453, // Base mainnet
    CHAIN_NAME: 'Base',
    RPC_URL: 'https://mainnet.base.org',
    BLOCK_EXPLORER: 'https://basescan.org',

    // Update Intervals (in milliseconds)
    DATA_UPDATE_INTERVAL: 10000, // 10 seconds
    BALANCE_UPDATE_INTERVAL: 5000, // 5 seconds

    // Token Configuration
    TOKEN_DECIMALS: 18,
    TOKEN_SYMBOL: 'PICA',

    // APR Configuration
    BASE_APR: 20,
    BRONZE_BOOST: 2,
    SILVER_BOOST: 5,
    GOLD_BOOST: 10,

    // Tier Requirements (in USD)
    BRONZE_REQUIREMENT: 5,
    SILVER_REQUIREMENT: 50,
    GOLD_REQUIREMENT: 100
};
