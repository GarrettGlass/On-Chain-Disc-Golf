/**
 * Finalization Screen
 * 
 * Handles all persistence and network operations after onboarding:
 * 1. Store identity in localStorage
 * 2. Publish profile metadata to Nostr
 * 3. Register lightning address with gateways
 * 4. Initialize wallet backup and sync
 * 5. Sync with Nostr network
 * 6. Initialize Breez Lightning wallet (background, non-blocking)
 * 
 * Shows KeypairFormingAnimation while tasks complete.
 * If tasks take longer than animation, shows sparkle overlay.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../context/OnboardingContext';
import { useApp } from '../context/AppContext';
import { KeypairFormingWithSparkles } from '../KeypairAnimations';
import { 
    storeMnemonicEncrypted, 
    setAuthSource, 
    setUnifiedSeed 
} from '../services/mnemonicService';
import { 
    publishProfileWithKey,
    fetchContactList,
    fetchProfilesBatch,
    fetchRecentPlayers,
    fetchWalletBackup,
    fetchHistoricalGiftWraps,
    publishWalletBackup
} from '../services/nostrService';
import { registerWithAllGateways } from '../services/npubCashService';
import { 
    initializeBreez,
    getLightningAddress,
    registerLightningAddress
} from '../services/breezService';
import { UserProfile } from '../types';

// Animation duration before sparkles appear (ms)
const ANIMATION_DURATION = 2500;

export const Finalization: React.FC = () => {
    const navigate = useNavigate();
    const { identity, profile, clearOnboarding } = useOnboarding();
    const { 
        setAuthState,
        setUserProfileState,
        setContactsState,
        setRecentPlayersState,
        restoreWalletFromBackup,
        initializeSubscriptions
    } = useApp();
    
    const [showSparkles, setShowSparkles] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);
    const tasksComplete = useRef(false);

    // Show sparkles if animation ends but tasks aren't done
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!tasksComplete.current) {
                setShowSparkles(true);
            }
        }, ANIMATION_DURATION);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!identity || hasStarted.current) return;
        hasStarted.current = true;

        const runFinalization = async () => {
            try {
                // =====================================================
                // TASK 1: Store Identity in localStorage
                // =====================================================
                console.log('🔐 [Finalization] Storing identity...');

                // Store Nostr keys
                localStorage.setItem('nostr_sk', identity.privateKeyHex);
                localStorage.setItem('nostr_pk', identity.publicKey);
                localStorage.setItem('auth_method', 'local');
                localStorage.removeItem('is_guest_mode');

                // Store encrypted mnemonic
                storeMnemonicEncrypted(identity.mnemonic, identity.publicKey, false);
                setAuthSource('mnemonic');
                setUnifiedSeed(true);

                // Store lightning address
                localStorage.setItem('cdg_lightning_address', identity.lightningAddress);

                console.log('✅ [Finalization] Identity stored securely');

                // =====================================================
                // TASK 2: Publish Profile Metadata to Nostr
                // =====================================================
                console.log('📤 [Finalization] Publishing profile...');

                const fullProfile: UserProfile = {
                    name: profile.name || 'Disc Golfer',
                    about: '',
                    picture: profile.picture || '',
                    lud16: identity.lightningAddress,
                    nip05: '',
                    pdga: profile.pdga
                };

                await publishProfileWithKey(fullProfile, identity.privateKey);
                
                // Update app state
                setUserProfileState(fullProfile);
                localStorage.setItem('cdg_user_profile', JSON.stringify(fullProfile));

                console.log('✅ [Finalization] Profile published to Nostr');

                // =====================================================
                // TASK 3: Register Lightning Address with Gateways
                // =====================================================
                console.log('⚡ [Finalization] Registering lightning address...');

                try {
                    const registrations = await registerWithAllGateways();
                    const successful = registrations.filter(r => r.success).length;
                    console.log(`✅ [Finalization] Registered with ${successful}/${registrations.length} gateways`);
                } catch (e) {
                    console.warn('⚠️ [Finalization] Gateway registration partial failure:', e);
                    // Don't fail the whole flow for gateway issues
                }

                // =====================================================
                // TASK 4: Initialize Wallet Backup
                // =====================================================
                console.log('💰 [Finalization] Initializing wallet...');

                // Check for existing backup (unlikely for new user, but handle recovery)
                const existingBackup = await fetchWalletBackup(identity.publicKey);
                if (existingBackup) {
                    console.log('📦 [Finalization] Found existing wallet backup, restoring...');
                    restoreWalletFromBackup(existingBackup);
                } else {
                    // Create initial empty backup
                    console.log('📦 [Finalization] Creating initial wallet backup...');
                    await publishWalletBackup([], [], [], []);
                }

                console.log('✅ [Finalization] Wallet initialized');

                // =====================================================
                // TASK 5: Sync with Nostr Network
                // =====================================================
                console.log('🔄 [Finalization] Syncing with network...');

                // Fetch contacts
                try {
                    const contactPubkeys = await fetchContactList(identity.publicKey);
                    if (contactPubkeys.length > 0) {
                        const profiles = await fetchProfilesBatch(contactPubkeys);
                        setContactsState(profiles);
                    }
                } catch (e) {
                    console.warn('⚠️ [Finalization] Contact fetch failed:', e);
                }

                // Fetch recent players
                try {
                    const recentPlayers = await fetchRecentPlayers(identity.publicKey);
                    if (recentPlayers && recentPlayers.length > 0) {
                        setRecentPlayersState(recentPlayers);
                    }
                } catch (e) {
                    console.warn('⚠️ [Finalization] Recent players fetch failed:', e);
                }

                // Check for missed payments (last 7 days)
                try {
                    const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);
                    await fetchHistoricalGiftWraps(identity.publicKey, sevenDaysAgo);
                } catch (e) {
                    console.warn('⚠️ [Finalization] Historical payment check failed:', e);
                }

                // Initialize real-time subscriptions
                initializeSubscriptions(identity.publicKey);

                console.log('✅ [Finalization] Network sync complete');

                // =====================================================
                // TASK 6: Initialize Breez Lightning Wallet (Background)
                // =====================================================
                console.log('⚡ [Finalization] Starting Breez Lightning wallet initialization...');

                // Start Breez initialization in background - don't await
                // This allows onboarding to complete while Breez initializes
                initializeBreez(identity.mnemonic).then(async (success) => {
                    if (success) {
                        console.log('✅ [Finalization] Breez SDK initialized in background');
                        
                        // Try to get or register Lightning address
                        try {
                            let lnAddressInfo = await getLightningAddress();
                            
                            if (!lnAddressInfo) {
                                // Try to register one based on pubkey
                                lnAddressInfo = await registerLightningAddress(identity.publicKey);
                            }
                            
                            if (lnAddressInfo) {
                                const breezLnAddress = lnAddressInfo.lightningAddress;
                                localStorage.setItem('cdg_breez_lightning_address', breezLnAddress);
                                console.log(`⚡ [Finalization] Breez Lightning address: ${breezLnAddress}`);
                                
                                // Optionally update profile with Breez address
                                // This would override the npub.cash fallback
                                // Uncomment if you want Breez address to be primary:
                                // const updatedProfile = { ...fullProfile, lud16: breezLnAddress };
                                // await publishProfileWithKey(updatedProfile, identity.privateKey);
                            }
                        } catch (e) {
                            console.warn('⚠️ [Finalization] Lightning address setup deferred:', e);
                        }
                    }
                }).catch((e) => {
                    console.warn('⚠️ [Finalization] Breez initialization will retry:', e);
                    // Breez service has infinite retry, so this will eventually succeed
                });

                // =====================================================
                // COMPLETE: Update Auth State and Navigate
                // =====================================================
                tasksComplete.current = true;
                
                // Update app auth state
                setAuthState({
                    isAuthenticated: true,
                    isGuest: false,
                    currentUserPubkey: identity.publicKey,
                    authMethod: 'local'
                });

                // Clear onboarding context
                clearOnboarding();

                // Mark as complete for visual feedback
                setIsComplete(true);

                // Brief delay to show success state
                await new Promise(resolve => setTimeout(resolve, 800));

                // Navigate to Home
                navigate('/');

            } catch (e) {
                console.error('❌ [Finalization] Error:', e);
                setError(e instanceof Error ? e.message : 'An unexpected error occurred');
                tasksComplete.current = true;
            }
        };

        runFinalization();
    }, [identity, profile, navigate, clearOnboarding, setAuthState, setUserProfileState, setContactsState, setRecentPlayersState, restoreWalletFromBackup, initializeSubscriptions]);

    // Redirect if no identity (shouldn't happen in normal flow)
    if (!identity) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-brand-dark via-slate-900 to-black">
                <div className="text-red-400 text-center p-6">
                    <p className="text-lg font-bold mb-2">Something went wrong</p>
                    <p className="text-sm text-slate-400 mb-4">No identity found. Please start over.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-b from-brand-dark via-slate-900 to-black">
                <div className="text-center p-6 max-w-sm">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <p className="text-lg font-bold text-white mb-2">Setup Failed</p>
                    <p className="text-sm text-slate-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-slate-700 rounded-lg text-white hover:bg-slate-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Show the keypair forming animation with optional sparkles
    return <KeypairFormingWithSparkles showSparkles={showSparkles} isComplete={isComplete} />;
};

export default Finalization;
