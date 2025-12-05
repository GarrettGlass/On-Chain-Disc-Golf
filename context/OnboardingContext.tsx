/**
 * OnboardingContext
 * 
 * Holds temporary identity state during onboarding flow.
 * Nothing is persisted until the Finalization step.
 * 
 * Flow: Welcome → Profile Setup → Mnemonic Backup → Finalization → Home
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { generateMnemonic, deriveNostrKeyFromMnemonic } from '../services/mnemonicService';
import { nip19 } from 'nostr-tools';

interface OnboardingIdentity {
    mnemonic: string;
    privateKey: Uint8Array;
    privateKeyHex: string;
    publicKey: string;
    lightningAddress: string;
}

interface OnboardingProfile {
    name: string;
    picture: string;
    pdga?: string;
}

interface OnboardingContextType {
    // Identity (generated at Welcome)
    identity: OnboardingIdentity | null;
    
    // Profile data (collected at Profile Setup)
    profile: OnboardingProfile;
    
    // Actions
    generateIdentity: () => OnboardingIdentity;
    setProfileData: (data: Partial<OnboardingProfile>) => void;
    clearOnboarding: () => void;
    
    // State
    isOnboarding: boolean;
    setIsOnboarding: (value: boolean) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [identity, setIdentity] = useState<OnboardingIdentity | null>(null);
    const [profile, setProfile] = useState<OnboardingProfile>({
        name: 'Disc Golfer',
        picture: '',
        pdga: undefined
    });
    const [isOnboarding, setIsOnboarding] = useState(false);

    /**
     * Generate a new identity from mnemonic
     * Called at Welcome screen - stores in memory only
     */
    const generateIdentity = useCallback((): OnboardingIdentity => {
        // Generate 12-word BIP-39 mnemonic
        const mnemonic = generateMnemonic();
        
        // Derive Nostr keys using NIP-06 standard
        const keys = deriveNostrKeyFromMnemonic(mnemonic);
        
        // ⚠️ CRITICAL: DO NOT CHANGE THE LIGHTNING ADDRESS FORMAT ⚠️
        // The Cashu lightning address MUST be: npub...@npubx.cash
        // - npub.cash gateway requires the npub-encoded public key (not hex)
        // - Using hex format will break payment receiving
        // - The nip19.npubEncode() call is REQUIRED
        const npub = nip19.npubEncode(keys.publicKey);
        const lightningAddress = `${npub}@npubx.cash`;
        
        const newIdentity: OnboardingIdentity = {
            mnemonic,
            privateKey: keys.privateKey,
            privateKeyHex: keys.privateKeyHex,
            publicKey: keys.publicKey,
            lightningAddress
        };
        
        setIdentity(newIdentity);
        console.log('🔑 [Onboarding] Identity generated in memory (not persisted yet)');
        console.log(`📍 [Onboarding] Lightning Address: ${lightningAddress}`);
        
        return newIdentity;
    }, []);

    /**
     * Update profile data (name, picture, pdga)
     * Called during Profile Setup screen
     */
    const setProfileData = useCallback((data: Partial<OnboardingProfile>) => {
        setProfile(prev => ({ ...prev, ...data }));
    }, []);

    /**
     * Clear all onboarding state
     * Called after finalization or on cancel
     */
    const clearOnboarding = useCallback(() => {
        setIdentity(null);
        setProfile({ name: 'Disc Golfer', picture: '', pdga: undefined });
        setIsOnboarding(false);
    }, []);

    return (
        <OnboardingContext.Provider value={{
            identity,
            profile,
            generateIdentity,
            setProfileData,
            clearOnboarding,
            isOnboarding,
            setIsOnboarding
        }}>
            {children}
        </OnboardingContext.Provider>
    );
};

export const useOnboarding = () => {
    const context = useContext(OnboardingContext);
    if (context === undefined) {
        throw new Error('useOnboarding must be used within an OnboardingProvider');
    }
    return context;
};

