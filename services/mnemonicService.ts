/**
 * Mnemonic Service
 * 
 * Handles BIP-39 mnemonic generation and NIP-06 Nostr key derivation.
 * Also prepares for Breez wallet initialization with the same seed.
 * 
 * Architecture:
 * - NEW USERS: Single 12-word mnemonic → Nostr key + Breez wallet (unified backup)
 * - EXISTING NSEC USERS: Their nsec + SEPARATE Breez mnemonic (two backups)
 * - AMBER USERS: Amber holds Nostr key + SEPARATE Breez mnemonic (two backups)
 */

import { generateMnemonic as bip39Generate, mnemonicToSeedSync, validateMnemonic as bip39Validate } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { getPublicKey } from 'nostr-tools';

// NIP-06 derivation path for Nostr keys
// m/44'/1237'/<account>'/0/0
// Using account 0 for simplicity
const NOSTR_DERIVATION_PATH = "m/44'/1237'/0'/0/0";

// Storage keys
const STORAGE_KEYS = {
    MNEMONIC_ENCRYPTED: 'cdg_mnemonic_enc',
    MNEMONIC_SALT: 'cdg_mnemonic_salt',
    AUTH_SOURCE: 'cdg_auth_source', // 'mnemonic' | 'nsec' | 'amber' | 'nip46'
    BREEZ_MNEMONIC_ENCRYPTED: 'cdg_breez_mnemonic_enc',
    BREEZ_MNEMONIC_SALT: 'cdg_breez_mnemonic_salt',
    HAS_UNIFIED_SEED: 'cdg_unified_seed', // true if Nostr + Breez use same mnemonic
};

export type AuthSource = 'mnemonic' | 'nsec' | 'amber' | 'nip46' | 'legacy';

/**
 * Generate a new 12-word BIP-39 mnemonic
 */
export const generateMnemonic = (): string => {
    // 128 bits = 12 words
    return bip39Generate(wordlist, 128);
};

/**
 * Generate a 24-word mnemonic (more secure, but harder to backup)
 */
export const generateMnemonic24 = (): string => {
    // 256 bits = 24 words
    return bip39Generate(wordlist, 256);
};

/**
 * Validate a mnemonic phrase
 */
export const validateMnemonic = (mnemonic: string): boolean => {
    return bip39Validate(mnemonic, wordlist);
};

/**
 * Derive Nostr keypair from mnemonic using NIP-06 standard
 * Derivation path: m/44'/1237'/0'/0/0
 * 
 * @param mnemonic - 12 or 24 word BIP-39 mnemonic
 * @returns { privateKey: Uint8Array, publicKey: string, privateKeyHex: string }
 */
export const deriveNostrKeyFromMnemonic = (mnemonic: string): {
    privateKey: Uint8Array;
    publicKey: string;
    privateKeyHex: string;
} => {
    if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }

    // Convert mnemonic to seed (no passphrase)
    const seed = mnemonicToSeedSync(mnemonic);

    // Derive HD key
    const hdKey = HDKey.fromMasterSeed(seed);

    // Derive at NIP-06 path
    const derivedKey = hdKey.derive(NOSTR_DERIVATION_PATH);

    if (!derivedKey.privateKey) {
        throw new Error('Failed to derive private key');
    }

    const privateKey = derivedKey.privateKey;
    const privateKeyHex = bytesToHex(privateKey);
    const publicKey = getPublicKey(privateKey);

    return {
        privateKey,
        publicKey,
        privateKeyHex
    };
};

/**
 * Get the raw seed from mnemonic (for Breez SDK initialization)
 * 
 * @param mnemonic - 12 or 24 word BIP-39 mnemonic
 * @returns seed as Uint8Array
 */
export const getSeedFromMnemonic = (mnemonic: string): Uint8Array => {
    if (!validateMnemonic(mnemonic)) {
        throw new Error('Invalid mnemonic phrase');
    }
    return mnemonicToSeedSync(mnemonic);
};

/**
 * Simple encryption for storing mnemonic locally
 * Uses user's public key as part of the encryption key
 * 
 * NOTE: This is basic protection against casual reading.
 * For production, consider using Web Crypto API with user-derived keys.
 */
const deriveEncryptionKey = (pubkey: string, salt: Uint8Array): Uint8Array => {
    // Combine pubkey and salt to create encryption key
    // Simple derivation: interleave pubkey bytes with salt
    const pubkeyBytes = new TextEncoder().encode(pubkey);
    const key = new Uint8Array(32);
    
    for (let i = 0; i < 32; i++) {
        key[i] = (pubkeyBytes[i % pubkeyBytes.length] ^ salt[i % salt.length]) & 0xFF;
    }
    
    return key;
};

/**
 * XOR-based encryption (simple but effective for local storage)
 */
const xorEncrypt = (data: Uint8Array, key: Uint8Array): Uint8Array => {
    const result = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) {
        result[i] = data[i] ^ key[i % key.length];
    }
    return result;
};

/**
 * Encrypt and store the mnemonic locally
 * 
 * @param mnemonic - The mnemonic to store
 * @param pubkey - User's public key (used for encryption)
 * @param isBreezMnemonic - If true, stores as separate Breez mnemonic
 */
export const storeMnemonicEncrypted = (
    mnemonic: string,
    pubkey: string,
    isBreezMnemonic: boolean = false
): void => {
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const key = deriveEncryptionKey(pubkey, salt);

    // Encrypt mnemonic
    const mnemonicBytes = new TextEncoder().encode(mnemonic);
    const encrypted = xorEncrypt(mnemonicBytes, key);

    // Store encrypted mnemonic and salt
    const storageKeyEnc = isBreezMnemonic ? STORAGE_KEYS.BREEZ_MNEMONIC_ENCRYPTED : STORAGE_KEYS.MNEMONIC_ENCRYPTED;
    const storageKeySalt = isBreezMnemonic ? STORAGE_KEYS.BREEZ_MNEMONIC_SALT : STORAGE_KEYS.MNEMONIC_SALT;

    localStorage.setItem(storageKeyEnc, bytesToHex(encrypted));
    localStorage.setItem(storageKeySalt, bytesToHex(salt));

    console.log(`🔐 Mnemonic stored encrypted (${isBreezMnemonic ? 'Breez' : 'Nostr'})`);
};

/**
 * Retrieve and decrypt the stored mnemonic
 * 
 * @param pubkey - User's public key (used for decryption)
 * @param isBreezMnemonic - If true, retrieves Breez mnemonic
 * @returns Decrypted mnemonic or null if not found
 */
export const retrieveMnemonicEncrypted = (
    pubkey: string,
    isBreezMnemonic: boolean = false
): string | null => {
    const storageKeyEnc = isBreezMnemonic ? STORAGE_KEYS.BREEZ_MNEMONIC_ENCRYPTED : STORAGE_KEYS.MNEMONIC_ENCRYPTED;
    const storageKeySalt = isBreezMnemonic ? STORAGE_KEYS.BREEZ_MNEMONIC_SALT : STORAGE_KEYS.MNEMONIC_SALT;

    const encryptedHex = localStorage.getItem(storageKeyEnc);
    const saltHex = localStorage.getItem(storageKeySalt);

    if (!encryptedHex || !saltHex) {
        return null;
    }

    try {
        const encrypted = hexToBytes(encryptedHex);
        const salt = hexToBytes(saltHex);
        const key = deriveEncryptionKey(pubkey, salt);

        // Decrypt
        const decrypted = xorEncrypt(encrypted, key);
        const mnemonic = new TextDecoder().decode(decrypted);

        // Validate the decrypted mnemonic
        if (!validateMnemonic(mnemonic)) {
            console.error('Decrypted mnemonic is invalid - possible corruption or wrong key');
            return null;
        }

        return mnemonic;
    } catch (e) {
        console.error('Failed to decrypt mnemonic:', e);
        return null;
    }
};

/**
 * Check if user has a stored mnemonic
 */
export const hasStoredMnemonic = (isBreezMnemonic: boolean = false): boolean => {
    const storageKey = isBreezMnemonic ? STORAGE_KEYS.BREEZ_MNEMONIC_ENCRYPTED : STORAGE_KEYS.MNEMONIC_ENCRYPTED;
    return localStorage.getItem(storageKey) !== null;
};

/**
 * Get the authentication source
 */
export const getAuthSource = (): AuthSource | null => {
    const source = localStorage.getItem(STORAGE_KEYS.AUTH_SOURCE);
    if (!source) {
        // Check for legacy auth
        const authMethod = localStorage.getItem('auth_method');
        if (authMethod === 'local') return 'legacy';
        if (authMethod === 'amber') return 'amber';
        if (authMethod === 'nip46') return 'nip46';
        return null;
    }
    return source as AuthSource;
};

/**
 * Set the authentication source
 */
export const setAuthSource = (source: AuthSource): void => {
    localStorage.setItem(STORAGE_KEYS.AUTH_SOURCE, source);
};

/**
 * Check if user has unified seed (Nostr + Breez from same mnemonic)
 */
export const hasUnifiedSeed = (): boolean => {
    return localStorage.getItem(STORAGE_KEYS.HAS_UNIFIED_SEED) === 'true';
};

/**
 * Set unified seed flag
 */
export const setUnifiedSeed = (unified: boolean): void => {
    localStorage.setItem(STORAGE_KEYS.HAS_UNIFIED_SEED, unified ? 'true' : 'false');
};

/**
 * Clear all mnemonic-related storage
 */
export const clearMnemonicStorage = (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
    console.log('🧹 Mnemonic storage cleared');
};

/**
 * Generate a new identity from mnemonic
 * This is the main function for new user onboarding
 * 
 * @returns Object with mnemonic and derived keys
 */
export const generateNewIdentity = (): {
    mnemonic: string;
    privateKey: Uint8Array;
    publicKey: string;
    privateKeyHex: string;
} => {
    const mnemonic = generateMnemonic();
    const keys = deriveNostrKeyFromMnemonic(mnemonic);

    return {
        mnemonic,
        ...keys
    };
};

/**
 * Create identity from existing mnemonic (recovery flow)
 */
export const recoverIdentityFromMnemonic = (mnemonic: string): {
    privateKey: Uint8Array;
    publicKey: string;
    privateKeyHex: string;
} | null => {
    if (!validateMnemonic(mnemonic)) {
        return null;
    }

    return deriveNostrKeyFromMnemonic(mnemonic);
};

/**
 * Split mnemonic into word array for display
 */
export const splitMnemonicToWords = (mnemonic: string): string[] => {
    return mnemonic.trim().split(/\s+/);
};

/**
 * Join words back into mnemonic
 */
export const joinWordsToMnemonic = (words: string[]): string => {
    return words.map(w => w.trim().toLowerCase()).join(' ');
};

/**
 * Get a random subset of word indices for backup verification
 * Returns indices (0-based) for user to verify
 */
export const getVerificationIndices = (wordCount: number, verifyCount: number = 3): number[] => {
    const indices: number[] = [];
    while (indices.length < verifyCount) {
        const idx = Math.floor(Math.random() * wordCount);
        if (!indices.includes(idx)) {
            indices.push(idx);
        }
    }
    return indices.sort((a, b) => a - b);
};

// Export storage keys for external use if needed
export { STORAGE_KEYS };

