/**
 * Breez SDK Service
 * 
 * Wrapper for Breez SDK (Spark/Nodeless implementation)
 * Provides self-custodial Lightning wallet functionality.
 * 
 * SDK Package: @breeztech/breez-sdk-spark
 * Documentation: https://sdk-doc-spark.breez.technology/
 * 
 * STATUS: PLACEHOLDER - Awaiting API Key from Breez
 * 
 * Features:
 * - Send payments via Bolt11, LNURL-Pay, Lightning address
 * - Receive payments via Bolt11, static Lightning address
 * - On-chain interoperability
 * - WebAssembly support for web/Capacitor apps
 */

import { getSeedFromMnemonic, retrieveMnemonicEncrypted, hasStoredMnemonic } from './mnemonicService';

// ============================================================================
// TYPES
// ============================================================================

export interface BreezBalance {
    /** Balance in satoshis */
    balanceSats: number;
    /** Pending incoming payments */
    pendingReceiveSats: number;
    /** Pending outgoing payments */
    pendingSendSats: number;
}

export interface BreezPayment {
    id: string;
    paymentType: 'send' | 'receive';
    amountSats: number;
    feeSats: number;
    timestamp: number;
    description?: string;
    bolt11?: string;
    preimage?: string;
    status: 'pending' | 'complete' | 'failed';
}

export interface BreezInvoice {
    bolt11: string;
    paymentHash: string;
    amountSats: number;
    description: string;
    expiry: number;
}

export interface BreezPaymentResult {
    success: boolean;
    paymentHash?: string;
    preimage?: string;
    feeSats?: number;
    error?: string;
}

export interface BreezConfig {
    apiKey: string;
    environment: 'production' | 'staging';
    workingDir?: string;
}

// ============================================================================
// STATE
// ============================================================================

let sdkInstance: any = null;
let isInitialized = false;
let staticLightningAddress: string | null = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize Breez SDK with mnemonic
 * 
 * @param mnemonic - 12/24 word BIP-39 mnemonic
 * @param config - Breez SDK configuration with API key
 */
export const initializeBreez = async (
    mnemonic: string,
    config: BreezConfig
): Promise<boolean> => {
    console.log('🔌 Initializing Breez SDK...');

    // TODO: Uncomment when API key is available
    /*
    try {
        // Import Breez SDK WASM module
        const { default: init, SdkBuilder } = await import('@breeztech/breez-sdk-spark/web');
        
        // Initialize WebAssembly
        await init();
        
        // Get seed from mnemonic
        const seed = getSeedFromMnemonic(mnemonic);
        
        // Build SDK instance
        sdkInstance = await SdkBuilder()
            .setApiKey(config.apiKey)
            .setEnvironment(config.environment)
            .setMnemonic(mnemonic)
            .build();
        
        isInitialized = true;
        console.log('✅ Breez SDK initialized successfully');
        
        // Get static Lightning address
        staticLightningAddress = await getStaticLightningAddress();
        
        return true;
    } catch (error) {
        console.error('❌ Breez SDK initialization failed:', error);
        isInitialized = false;
        return false;
    }
    */

    // Placeholder until API key is available
    console.log('⏳ Breez SDK initialization placeholder - awaiting API key');
    console.log('📋 Mnemonic received (first word):', mnemonic.split(' ')[0] + '...');

    // Simulate initialization for development
    isInitialized = false; // Will be true when SDK is actually initialized
    return false;
};

/**
 * Initialize Breez from stored mnemonic
 * Called on app startup if mnemonic exists
 */
export const initializeBreezFromStorage = async (
    pubkey: string,
    config: BreezConfig,
    useBreezMnemonic: boolean = false
): Promise<boolean> => {
    const mnemonic = retrieveMnemonicEncrypted(pubkey, useBreezMnemonic);

    if (!mnemonic) {
        console.log('📭 No mnemonic found in storage for Breez');
        return false;
    }

    return initializeBreez(mnemonic, config);
};

/**
 * Check if Breez SDK is initialized
 */
export const isBreezInitialized = (): boolean => {
    return isInitialized;
};

/**
 * Disconnect and cleanup Breez SDK
 */
export const disconnectBreez = async (): Promise<void> => {
    if (sdkInstance) {
        // TODO: Uncomment when SDK is available
        // await sdkInstance.disconnect();
        sdkInstance = null;
    }
    isInitialized = false;
    staticLightningAddress = null;
    console.log('🔌 Breez SDK disconnected');
};

// ============================================================================
// BALANCE & INFO
// ============================================================================

/**
 * Get wallet balance
 */
export const getBreezBalance = async (): Promise<BreezBalance> => {
    if (!isInitialized || !sdkInstance) {
        console.warn('Breez SDK not initialized');
        return {
            balanceSats: 0,
            pendingReceiveSats: 0,
            pendingSendSats: 0
        };
    }

    // TODO: Implement when SDK is available
    /*
    const nodeInfo = await sdkInstance.getNodeInfo();
    return {
        balanceSats: nodeInfo.channelsBalanceMsat / 1000,
        pendingReceiveSats: nodeInfo.pendingReceiveMsat / 1000,
        pendingSendSats: nodeInfo.pendingSendMsat / 1000
    };
    */

    // Placeholder
    return {
        balanceSats: 0,
        pendingReceiveSats: 0,
        pendingSendSats: 0
    };
};

/**
 * Get the static Lightning address for receiving
 * This address can be published to kind 0 profile
 */
export const getStaticLightningAddress = async (): Promise<string | null> => {
    if (!isInitialized || !sdkInstance) {
        console.warn('Breez SDK not initialized');
        return null;
    }

    if (staticLightningAddress) {
        return staticLightningAddress;
    }

    // TODO: Implement when SDK is available
    /*
    const receivingInfo = await sdkInstance.getReceivingInfo();
    staticLightningAddress = receivingInfo.lightningAddress;
    return staticLightningAddress;
    */

    // Placeholder
    return null;
};

/**
 * Get cached static Lightning address (sync, no API call)
 */
export const getCachedLightningAddress = (): string | null => {
    return staticLightningAddress;
};

// ============================================================================
// RECEIVING PAYMENTS
// ============================================================================

/**
 * Create a Bolt11 invoice for receiving a specific amount
 * 
 * @param amountSats - Amount in satoshis
 * @param description - Invoice description
 */
export const createInvoice = async (
    amountSats: number,
    description: string = 'ChainLinks Payment'
): Promise<BreezInvoice | null> => {
    if (!isInitialized || !sdkInstance) {
        console.warn('Breez SDK not initialized');
        return null;
    }

    // TODO: Implement when SDK is available
    /*
    const invoice = await sdkInstance.receivePayment({
        paymentMethod: 'Bolt11Invoice',
        amountSats,
        description
    });
    
    return {
        bolt11: invoice.bolt11,
        paymentHash: invoice.paymentHash,
        amountSats: invoice.amountSats,
        description: invoice.description,
        expiry: invoice.expiry
    };
    */

    // Placeholder
    console.log(`📝 Would create invoice for ${amountSats} sats: "${description}"`);
    return null;
};

// ============================================================================
// SENDING PAYMENTS
// ============================================================================

/**
 * Pay a Bolt11 invoice
 * 
 * @param bolt11 - Lightning invoice string
 */
export const payInvoice = async (bolt11: string): Promise<BreezPaymentResult> => {
    if (!isInitialized || !sdkInstance) {
        return {
            success: false,
            error: 'Breez SDK not initialized'
        };
    }

    // TODO: Implement when SDK is available
    /*
    try {
        const result = await sdkInstance.sendPayment({
            paymentMethod: 'Bolt11Invoice',
            invoice: bolt11
        });
        
        return {
            success: true,
            paymentHash: result.paymentHash,
            preimage: result.preimage,
            feeSats: result.feeMsat / 1000
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment failed'
        };
    }
    */

    // Placeholder
    console.log(`⚡ Would pay invoice: ${bolt11.substring(0, 30)}...`);
    return {
        success: false,
        error: 'Breez SDK not yet initialized - awaiting API key'
    };
};

/**
 * Pay to a Lightning address (LNURL-pay)
 * 
 * @param lightningAddress - Address like user@domain.com
 * @param amountSats - Amount in satoshis
 * @param comment - Optional comment for the payment
 */
export const payLightningAddress = async (
    lightningAddress: string,
    amountSats: number,
    comment?: string
): Promise<BreezPaymentResult> => {
    if (!isInitialized || !sdkInstance) {
        return {
            success: false,
            error: 'Breez SDK not initialized'
        };
    }

    // TODO: Implement when SDK is available
    /*
    try {
        const result = await sdkInstance.sendPayment({
            paymentMethod: 'LightningAddress',
            address: lightningAddress,
            amountSats,
            comment
        });
        
        return {
            success: true,
            paymentHash: result.paymentHash,
            preimage: result.preimage,
            feeSats: result.feeMsat / 1000
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment failed'
        };
    }
    */

    // Placeholder
    console.log(`⚡ Would pay ${amountSats} sats to ${lightningAddress}`);
    return {
        success: false,
        error: 'Breez SDK not yet initialized - awaiting API key'
    };
};

/**
 * Pay via LNURL-pay string
 * 
 * @param lnurl - LNURL string (lnurl1...)
 * @param amountSats - Amount in satoshis
 */
export const payLnurl = async (
    lnurl: string,
    amountSats: number
): Promise<BreezPaymentResult> => {
    if (!isInitialized || !sdkInstance) {
        return {
            success: false,
            error: 'Breez SDK not initialized'
        };
    }

    // TODO: Implement when SDK is available
    /*
    try {
        const result = await sdkInstance.sendPayment({
            paymentMethod: 'LnurlPay',
            lnurl,
            amountSats
        });
        
        return {
            success: true,
            paymentHash: result.paymentHash,
            preimage: result.preimage,
            feeSats: result.feeMsat / 1000
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment failed'
        };
    }
    */

    // Placeholder
    console.log(`⚡ Would pay ${amountSats} sats via LNURL`);
    return {
        success: false,
        error: 'Breez SDK not yet initialized - awaiting API key'
    };
};

// ============================================================================
// LNURL RESOLUTION
// ============================================================================

/**
 * Resolve a Lightning address to get payment details
 * Works even without full SDK initialization
 * 
 * @param lightningAddress - Address like user@domain.com
 */
export const resolveLightningAddress = async (
    lightningAddress: string
): Promise<{
    callback: string;
    minSendable: number;
    maxSendable: number;
    metadata: string;
} | null> => {
    try {
        const [name, domain] = lightningAddress.split('@');
        if (!name || !domain) {
            throw new Error('Invalid Lightning address format');
        }

        // Fetch LNURL-pay endpoint
        const url = `https://${domain}/.well-known/lnurlp/${name}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to resolve: ${response.status}`);
        }

        const data = await response.json();

        return {
            callback: data.callback,
            minSendable: Math.ceil(data.minSendable / 1000), // Convert msats to sats
            maxSendable: Math.floor(data.maxSendable / 1000),
            metadata: data.metadata
        };
    } catch (error) {
        console.error('Failed to resolve Lightning address:', error);
        return null;
    }
};

/**
 * Get invoice from LNURL callback
 * 
 * @param callback - LNURL callback URL
 * @param amountSats - Amount in satoshis
 * @param comment - Optional comment
 */
export const getInvoiceFromLnurl = async (
    callback: string,
    amountSats: number,
    comment?: string
): Promise<string | null> => {
    try {
        const url = new URL(callback);
        url.searchParams.set('amount', (amountSats * 1000).toString()); // Convert to msats

        if (comment) {
            url.searchParams.set('comment', comment);
        }

        const response = await fetch(url.toString());

        if (!response.ok) {
            throw new Error(`Failed to get invoice: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'ERROR') {
            throw new Error(data.reason || 'LNURL error');
        }

        return data.pr; // Bolt11 invoice
    } catch (error) {
        console.error('Failed to get invoice from LNURL:', error);
        return null;
    }
};

// ============================================================================
// PAYMENT HISTORY
// ============================================================================

/**
 * Get payment history
 */
export const getPaymentHistory = async (): Promise<BreezPayment[]> => {
    if (!isInitialized || !sdkInstance) {
        console.warn('Breez SDK not initialized');
        return [];
    }

    // TODO: Implement when SDK is available
    /*
    const payments = await sdkInstance.listPayments();
    return payments.map(p => ({
        id: p.id,
        paymentType: p.paymentType === 'sent' ? 'send' : 'receive',
        amountSats: p.amountMsat / 1000,
        feeSats: p.feeMsat / 1000,
        timestamp: p.timestamp,
        description: p.description,
        bolt11: p.bolt11,
        preimage: p.preimage,
        status: p.status
    }));
    */

    // Placeholder
    return [];
};

// ============================================================================
// SYNC & EVENTS
// ============================================================================

/**
 * Sync wallet state
 * Call this when app comes to foreground
 */
export const syncBreez = async (): Promise<void> => {
    if (!isInitialized || !sdkInstance) {
        return;
    }

    // TODO: Implement when SDK is available
    /*
    await sdkInstance.sync();
    console.log('🔄 Breez wallet synced');
    */

    console.log('🔄 Breez sync placeholder');
};

/**
 * Subscribe to payment events
 * 
 * @param onPaymentReceived - Callback when payment is received
 * @param onPaymentSent - Callback when payment is sent
 */
export const subscribeToPayments = (
    onPaymentReceived: (payment: BreezPayment) => void,
    onPaymentSent: (payment: BreezPayment) => void
): (() => void) => {
    if (!isInitialized || !sdkInstance) {
        console.warn('Breez SDK not initialized - cannot subscribe to payments');
        return () => { };
    }

    // TODO: Implement when SDK is available
    /*
    const unsubscribe = sdkInstance.addEventListener('payment', (event) => {
        const payment: BreezPayment = {
            id: event.id,
            paymentType: event.type,
            amountSats: event.amountMsat / 1000,
            feeSats: event.feeMsat / 1000,
            timestamp: event.timestamp,
            status: event.status
        };
        
        if (event.type === 'receive') {
            onPaymentReceived(payment);
        } else {
            onPaymentSent(payment);
        }
    });
    
    return unsubscribe;
    */

    // Placeholder - return no-op cleanup function
    return () => { };
};

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Check if we can use Breez for payments
 * Returns true if SDK is initialized and has balance
 */
export const canUseBreez = async (): Promise<boolean> => {
    if (!isInitialized) {
        return false;
    }

    const balance = await getBreezBalance();
    return balance.balanceSats > 0;
};

/**
 * Format satoshis for display
 */
export const formatSats = (sats: number): string => {
    if (sats >= 1000000) {
        return `${(sats / 1000000).toFixed(2)}M sats`;
    } else if (sats >= 1000) {
        return `${(sats / 1000).toFixed(1)}k sats`;
    }
    return `${sats} sats`;
};

/**
 * Get Breez status for debugging
 */
export const getBreezStatus = (): {
    initialized: boolean;
    lightningAddress: string | null;
} => {
    return {
        initialized: isInitialized,
        lightningAddress: staticLightningAddress
    };
};

