/**
 * Storage Transfer Service
 * 
 * Handles secure transfer of localStorage data from browser to PWA context.
 * Uses URL fragments to preserve user identity and wallet state during PWA installation.
 */

// Critical localStorage keys that must be transferred
const CRITICAL_KEYS = [
    // Auth & Identity
    'nostr_sk',
    'nostr_pk',
    'auth_method',
    'is_guest_mode',

    // NIP-46 Remote Signer
    'nostr_ephemeral_sk',
    'nostr_remote_pk',
    'nostr_remote_relays',

    // Amber Signer
    'amber_ephemeral_sk',
    'amber_remote_pk',
    'amber_relay',

    // Wallet Data
    'cdg_proofs',
    'cdg_mints',
    'cdg_txs',
    'cdg_wallet_mode',
    'cdg_nwc_string',

    // App State
    'cdg_recent_players',
    'cdg_active_round',
    'cdg_players',
    'cdg_current_hole',

    // Relay Configuration
    'cdg_relays'
];

interface TransferData {
    version: number;
    timestamp: number;
    data: Record<string, string | null>;
}

/**
 * Prepare localStorage data for transfer to PWA
 * @returns Base64-encoded transfer data
 */
export const prepareTransferData = (): string => {
    try {
        const transferData: TransferData = {
            version: 1,
            timestamp: Date.now(),
            data: {}
        };

        // Collect all critical localStorage items
        CRITICAL_KEYS.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                transferData.data[key] = value;
            }
        });

        // Convert to JSON and encode to base64
        const jsonString = JSON.stringify(transferData);
        const base64 = btoa(jsonString);

        console.log('[Transfer] Prepared transfer data:', {
            keys: Object.keys(transferData.data).length,
            size: base64.length
        });

        return base64;
    } catch (e) {
        console.error('[Transfer] Failed to prepare data:', e);
        throw new Error('Failed to prepare transfer data');
    }
};

/**
 * Receive and import transfer data into localStorage
 * @param encodedData Base64-encoded transfer data
 * @returns Success status
 */
export const receiveTransferData = (encodedData: string): boolean => {
    try {
        // Decode from base64
        const jsonString = atob(encodedData);
        const transferData: TransferData = JSON.parse(jsonString);

        // Validate structure
        if (!transferData.version || !transferData.timestamp || !transferData.data) {
            console.error('[Transfer] Invalid transfer data structure');
            return false;
        }

        // Check if data is too old (more than 1 hour)
        const age = Date.now() - transferData.timestamp;
        if (age > 60 * 60 * 1000) {
            console.warn('[Transfer] Transfer data is too old:', age / 1000 / 60, 'minutes');
            // Still proceed, but log warning
        }

        // Validate critical keys
        if (!transferData.data['nostr_sk'] || !transferData.data['nostr_pk']) {
            console.error('[Transfer] Missing critical auth keys');
            return false;
        }

        // Import all data into localStorage
        let importedCount = 0;
        Object.entries(transferData.data).forEach(([key, value]) => {
            if (value !== null) {
                localStorage.setItem(key, value);
                importedCount++;
            }
        });

        console.log('[Transfer] Successfully imported data:', {
            keys: importedCount,
            timestamp: new Date(transferData.timestamp).toISOString()
        });

        // Set flag to indicate successful transfer
        localStorage.setItem('cdg_transferred', 'true');
        localStorage.setItem('cdg_transfer_timestamp', transferData.timestamp.toString());

        return true;
    } catch (e) {
        console.error('[Transfer] Failed to receive data:', e);
        return false;
    }
};

/**
 * Clear transfer data from URL
 * This should be called immediately after successful import
 */
export const clearTransferData = (): void => {
    try {
        // Remove fragment from URL without page reload
        if (window.location.hash) {
            // Use replaceState to prevent back button from showing transfer URL
            const cleanUrl = window.location.pathname + window.location.search;
            window.history.replaceState({}, document.title, cleanUrl);
            console.log('[Transfer] Cleared transfer data from URL');
        }
    } catch (e) {
        console.error('[Transfer] Failed to clear URL:', e);
    }
};

/**
 * Check if current page load is from a transfer
 * @returns Transfer data if present, null otherwise
 */
export const checkForTransfer = (): string | null => {
    try {
        const hash = window.location.hash;
        if (!hash) return null;

        // Check for transfer fragment
        const transferMatch = hash.match(/#transfer=([A-Za-z0-9+/=]+)/);
        if (transferMatch && transferMatch[1]) {
            console.log('[Transfer] Detected transfer data in URL');
            return transferMatch[1];
        }

        return null;
    } catch (e) {
        console.error('[Transfer] Failed to check for transfer:', e);
        return null;
    }
};

/**
 * Get transfer status
 * @returns True if this session was transferred from browser
 */
export const wasTransferred = (): boolean => {
    return localStorage.getItem('cdg_transferred') === 'true';
};

/**
 * Clear transfer status flags
 * Call this after user has acknowledged the transfer
 */
export const clearTransferStatus = (): void => {
    localStorage.removeItem('cdg_transferred');
    localStorage.removeItem('cdg_transfer_timestamp');
};
