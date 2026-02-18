import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.8.0/+esm';

// ==================== WALLET PROVIDERS ====================
export class WalletConnector {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.walletType = null;
        this.modalElement = null;
    }

    // Detect available wallets
    detectWallets() {
        const wallets = [];

        // Check for multiple providers first (EIP-6963 and providers array)
        const providers = this.getAllProviders();
        console.log('Detected providers:', providers.length, providers.map(p => ({
            isMetaMask: p.isMetaMask,
            isPhantom: p.isPhantom,
            isCoinbaseWallet: p.isCoinbaseWallet,
            isCoinbaseBrowser: p.isCoinbaseBrowser,
            isRabby: p.isRabby
        })));

        // Coinbase Wallet / Base Wallet detection (check FIRST to avoid conflicts)
        const coinbaseProvider = this.findProvider(providers, (p) =>
            p.isCoinbaseWallet || p.isCoinbaseBrowser || (p.isMetaMask && p.overrideIsMetaMask)
        );
        if (coinbaseProvider) {
            console.log('Coinbase/Base Wallet provider found:', coinbaseProvider);
            wallets.push({
                name: 'Base Wallet',
                type: 'base',
                icon: this.getBaseWalletIcon(),
                provider: coinbaseProvider
            });
        }

        // MetaMask detection - must NOT be Coinbase or Phantom
        const metaMaskProvider = this.findProvider(providers, (p) =>
            p.isMetaMask &&
            !p.isPhantom &&
            !p.isCoinbaseWallet &&
            !p.isCoinbaseBrowser &&
            !p.overrideIsMetaMask
        );
        if (metaMaskProvider) {
            console.log('MetaMask provider found:', metaMaskProvider);
            wallets.push({
                name: 'MetaMask',
                type: 'metamask',
                icon: this.getMetaMaskIcon(),
                provider: metaMaskProvider
            });
        } else {
            console.warn('MetaMask provider not found');
        }

        // Phantom Wallet detection
        if (window.phantom && window.phantom.ethereum) {
            console.log('Phantom provider found');
            wallets.push({
                name: 'Phantom',
                type: 'phantom',
                icon: this.getPhantomIcon(),
                provider: window.phantom.ethereum
            });
        }

        // Fallback to any injected provider
        if (wallets.length === 0 && window.ethereum) {
            console.warn('Using fallback provider');
            wallets.push({
                name: 'Browser Wallet',
                type: 'injected',
                icon: this.getGenericWalletIcon(),
                provider: window.ethereum
            });
        }

        console.log('Final wallets detected:', wallets.map(w => w.name));
        return wallets;
    }

    // Get all available providers (handles multiple wallet extensions)
    getAllProviders() {
        const providers = [];

        // Check for providers array (multiple wallets installed)
        if (window.ethereum?.providers) {
            providers.push(...window.ethereum.providers);
        } else if (window.ethereum) {
            providers.push(window.ethereum);
        }

        return providers;
    }

    // Find a specific provider from the list
    findProvider(providers, predicate) {
        for (const provider of providers) {
            if (predicate(provider)) {
                return provider;
            }
        }
        return null;
    }

    // Show wallet selection modal
    async showWalletModal() {
        return new Promise((resolve, reject) => {
            const wallets = this.detectWallets();

            if (wallets.length === 0) {
                reject(new Error('No Web3 wallet detected. Please install MetaMask, Phantom, or Base Wallet.'));
                return;
            }

            // If only one wallet, connect directly
            if (wallets.length === 1) {
                resolve({ wallet: wallets[0], closeModal: () => {} });
                return;
            }

            // Create modal for wallet selection
            this.createWalletModal(wallets, resolve, reject);
        });
    }

    // Create wallet selection modal UI
    createWalletModal(wallets, resolve, reject) {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'wallet-modal-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.2s ease-out;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'wallet-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 20px;
            padding: 32px;
            max-width: 420px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideUp 0.3s ease-out;
        `;

        // Modal header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Connect Wallet';
        title.style.cssText = `
            color: #ffffff;
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        `;

        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: #888;
            font-size: 32px;
            cursor: pointer;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.2s;
        `;
        closeBtn.onmouseover = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseout = () => closeBtn.style.color = '#888';
        closeBtn.onclick = () => {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
            reject(new Error('User cancelled wallet connection'));
        };

        header.appendChild(title);
        header.appendChild(closeBtn);

        // Wallet list
        const walletList = document.createElement('div');
        walletList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 12px;
        `;

        wallets.forEach(wallet => {
            const walletBtn = document.createElement('button');
            walletBtn.className = 'wallet-option';
            walletBtn.style.cssText = `
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px 20px;
                background: rgba(255, 255, 255, 0.05);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.2s;
                color: #ffffff;
                font-size: 16px;
                font-weight: 500;
                width: 100%;
                text-align: left;
            `;

            walletBtn.onmouseover = () => {
                walletBtn.style.background = 'rgba(255, 255, 255, 0.1)';
                walletBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                walletBtn.style.transform = 'translateY(-2px)';
            };

            walletBtn.onmouseout = () => {
                walletBtn.style.background = 'rgba(255, 255, 255, 0.05)';
                walletBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                walletBtn.style.transform = 'translateY(0)';
            };

            walletBtn.onclick = () => {
                // Show loading state
                walletBtn.style.opacity = '0.5';
                walletBtn.style.pointerEvents = 'none';
                walletBtn.innerHTML = `
                    ${icon.outerHTML}
                    <span style="flex: 1;">Connecting to ${wallet.name}...</span>
                `;

                // Resolve with wallet and close function
                resolve({
                    wallet: wallet,
                    closeModal: () => {
                        if (document.body.contains(backdrop)) {
                            document.body.removeChild(backdrop);
                        }
                    }
                });
            };

            const icon = document.createElement('div');
            icon.innerHTML = wallet.icon;
            icon.style.cssText = `
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const name = document.createElement('span');
            name.textContent = wallet.name;
            name.style.flex = '1';

            walletBtn.appendChild(icon);
            walletBtn.appendChild(name);
            walletList.appendChild(walletBtn);
        });

        modal.appendChild(header);
        modal.appendChild(walletList);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);

        // Add animations
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Connect to selected wallet
    async connect(chainId = 8453) { // Base mainnet chain ID
        let closeModal = null;

        try {
            // Show wallet selection modal
            const modalResult = await this.showWalletModal();
            const selectedWallet = modalResult.wallet;
            closeModal = modalResult.closeModal;

            this.walletType = selectedWallet.type;
            const walletProvider = selectedWallet.provider;

            console.log('Connecting to wallet:', selectedWallet.name, {
                isMetaMask: walletProvider.isMetaMask,
                isPhantom: walletProvider.isPhantom,
                isCoinbaseWallet: walletProvider.isCoinbaseWallet
            });

            // Small delay to ensure provider is ready
            await new Promise(resolve => setTimeout(resolve, 100));

            // Request account access
            let accounts;
            try {
                accounts = await walletProvider.request({
                    method: 'eth_requestAccounts'
                });
                console.log('Accounts received:', accounts);
            } catch (requestError) {
                console.error('Error requesting accounts:', requestError);
                throw new Error(`Failed to connect to ${selectedWallet.name}: ${requestError.message}`);
            }

            // Check and switch network if needed
            const currentChainId = await walletProvider.request({
                method: 'eth_chainId'
            });

            if (parseInt(currentChainId, 16) !== chainId) {
                try {
                    await walletProvider.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: `0x${chainId.toString(16)}` }],
                    });
                } catch (switchError) {
                    // If chain doesn't exist, add it
                    if (switchError.code === 4902) {
                        await this.addNetwork(walletProvider, chainId);
                    } else {
                        throw switchError;
                    }
                }
            }

            // Initialize ethers provider and signer
            this.provider = new ethers.BrowserProvider(walletProvider);
            this.signer = await this.provider.getSigner();
            this.userAddress = accounts[0];

            // Close modal after successful connection
            if (closeModal) closeModal();

            // Persist wallet type so we can auto-reconnect on refresh
            localStorage.setItem('brabo_wallet_type', this.walletType);

            return {
                provider: this.provider,
                signer: this.signer,
                address: this.userAddress,
                walletType: this.walletType
            };

        } catch (error) {
            // Close modal on error
            if (closeModal) closeModal();

            console.error('Error connecting wallet:', error);
            throw error;
        }
    }

    // Add Base network to wallet
    async addNetwork(walletProvider, chainId) {
        const networks = {
            8453: { // Base Mainnet
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org']
            },
            84532: { // Base Sepolia Testnet
                chainId: '0x14a34',
                chainName: 'Base Sepolia',
                nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18
                },
                rpcUrls: ['https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org']
            }
        };

        const networkConfig = networks[chainId];
        if (!networkConfig) {
            throw new Error(`Network configuration not found for chain ID ${chainId}`);
        }

        await walletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig]
        });
    }

    // Disconnect wallet
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
        this.walletType = null;
        localStorage.removeItem('brabo_wallet_type');
    }

    // Silently reconnect on page load using saved wallet type (no popup)
    async autoReconnect(chainId = 8453) {
        const savedWalletType = localStorage.getItem('brabo_wallet_type');
        if (!savedWalletType) return null;

        if (!window.ethereum) return null;

        // eth_accounts does NOT trigger a popup – returns accounts only if already authorized
        // Call it on window.ethereum directly; it's reliable even before detectWallets() runs
        let accounts;
        try {
            accounts = await window.ethereum.request({ method: 'eth_accounts' });
        } catch {
            return null;
        }

        if (!accounts || accounts.length === 0) {
            localStorage.removeItem('brabo_wallet_type');
            return null;
        }

        // Try to find the exact provider used last time; fall back to window.ethereum
        const wallets = this.detectWallets();
        const savedWallet = wallets.find(w => w.type === savedWalletType);
        const walletProvider = savedWallet ? savedWallet.provider : window.ethereum;

        // Ensure we're on the right network
        try {
            const currentChainId = await walletProvider.request({ method: 'eth_chainId' });
            if (parseInt(currentChainId, 16) !== chainId) {
                await walletProvider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${chainId.toString(16)}` }],
                });
            }
        } catch {
            // Can't switch silently – user will connect manually
            return null;
        }

        this.walletType = savedWalletType;
        this.provider = new ethers.BrowserProvider(walletProvider);
        this.signer = await this.provider.getSigner();
        this.userAddress = accounts[0];

        return {
            provider: this.provider,
            signer: this.signer,
            address: this.userAddress,
            walletType: this.walletType
        };
    }

    // Check if wallet is connected
    isConnected() {
        return this.provider !== null && this.userAddress !== null;
    }

    // Get wallet icons (SVG)
    getMetaMaskIcon() {
        return `<img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" style="width:40px;height:40px;">`;
    }

    getPhantomIcon() {
        return `<img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSA0Ny45NjU4Qzc2Ljc4MTYgNDcuOTY1OCA3NC42OTg5IDQ2LjE3MDQgNzQuNjk4OSA0Mi41Nzk0Qzc0LjY5ODkgMzguOTg4NSA3Ni43ODE2IDM3LjE5MzEgNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==" alt="Phantom" style="width:40px;height:40px;border-radius:8px;">`;
    }

    getBaseWalletIcon() {
        return `
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="20" fill="#0052FF"/>
                <path d="M20 30C25.5228 30 30 25.5228 30 20C30 14.4772 25.5228 10 20 10C14.8156 10 10.5644 14.0206 10.0542 19.0909H24.5455V20.9091H10.0542C10.5644 25.9794 14.8156 30 20 30Z" fill="white"/>
            </svg>
        `;
    }

    getGenericWalletIcon() {
        return `
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="6" width="18" height="13" rx="2" ry="2" fill="#3B82F6"/>
                <path d="M3 10h18" stroke="white"/>
                <circle cx="18" cy="14" r="1.5" fill="white"/>
            </svg>
        `;
    }
}

// Export singleton instance
export const walletConnector = new WalletConnector();
