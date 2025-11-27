import { Event, getPublicKey, generateSecretKey, finalizeEvent } from 'nostr-tools';
import { nip44 } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import { getPool } from './nostrService';

/**
 * NIP-59: Gift Wrap Service for Private Messaging
 * 
 * Implements the 3-layer encryption approach:
 * 1. Rumor: unsigned event with actual content
 * 2. Seal (kind 13): rumor encrypted to recipient, signed by sender
 * 3. Gift Wrap (kind 1059): seal encrypted with ephemeral key for privacy
 */

// Random timestamp within a day
const randomNow = () => {
    const now = Math.floor(Date.now() / 1000);
    const randomOffset = Math.floor(Math.random() * (24 * 60 * 60)); // Random seconds in a day
    return now - randomOffset;
};

/**
 * Create a rumor (unsigned event)
 */
const createRumor = (content: string, senderPubkey: string, kind: number = 14): Partial<Event> => {
    return {
        kind,
        created_at: Math.floor(Date.now() / 1000),
        content,
        tags: [],
        pubkey: senderPubkey,
    };
};

/**
 * Create a seal (kind 13) - rumor encrypted to recipient's pubkey
 */
const createSeal = async (
    rumor: Partial<Event>,
    senderSecretKey: Uint8Array,
    recipientPubkey: string
): Promise<Event> => {
    const rumorJson = JSON.stringify(rumor);

    // Encrypt rumor to recipient using NIP-44
    const ciphertext = await nip44.v2.encrypt(rumorJson, nip44.v2.utils.getConversationKey(senderSecretKey, recipientPubkey));

    const sealTemplate = {
        kind: 13,
        created_at: randomNow(),
        content: ciphertext,
        tags: [],
        pubkey: getPublicKey(senderSecretKey),
    };

    return finalizeEvent(sealTemplate, senderSecretKey);
};

/**
 * Create a gift wrap (kind 1059) - seal encrypted with ephemeral key
 */
const createGiftWrap = async (
    seal: Event,
    recipientPubkey: string
): Promise<Event> => {
    // Generate random ephemeral keypair
    const ephemeralSk = generateSecretKey();
    const ephemeralPk = getPublicKey(ephemeralSk);

    const sealJson = JSON.stringify(seal);

    // Encrypt seal to recipient using ephemeral key
    const ciphertext = await nip44.v2.encrypt(sealJson, nip44.v2.utils.getConversationKey(ephemeralSk, recipientPubkey));

    const giftWrapTemplate = {
        kind: 1059,
        created_at: randomNow(),
        content: ciphertext,
        tags: [['p', recipientPubkey]], // Only recipient hint
        pubkey: ephemeralPk,
    };

    return finalizeEvent(giftWrapTemplate, ephemeralSk);
};

/**
 * Send a gift-wrapped message to a recipient
 */
export const sendGiftWrap = async (
    content: string,
    senderSecretKey: Uint8Array,
    recipientPubkey: string,
    relays: string[],
    kind: number = 14 // Default to chat message
): Promise<void> => {
    try {
        const senderPubkey = getPublicKey(senderSecretKey);

        // Step 1: Create rumor (unsigned event)
        const rumor = createRumor(content, senderPubkey, kind);

        // Step 2: Create seal (encrypted rumor, signed by sender)
        const seal = await createSeal(rumor, senderSecretKey, recipientPubkey);

        // Step 3: Create gift wrap (encrypted seal with ephemeral key)
        const giftWrap = await createGiftWrap(seal, recipientPubkey);

        // Step 4: Publish to relays
        const pool = getPool();
        await Promise.any(pool.publish(relays, giftWrap));

        console.log(`Gift wrap sent to ${recipientPubkey.slice(0, 8)}...`);
    } catch (error) {
        console.error('Failed to send gift wrap:', error);
        throw new Error('Failed to send encrypted message');
    }
};

/**
 * Unwrap a gift wrap event to get the original rumor
 */
export const unwrapGiftWrap = async (
    giftWrapEvent: Event,
    recipientSecretKey: Uint8Array
): Promise<Partial<Event>> => {
    try {
        // Step 1: Decrypt gift wrap to get seal
        const sealJson = await nip44.v2.decrypt(
            giftWrapEvent.content,
            nip44.v2.utils.getConversationKey(recipientSecretKey, giftWrapEvent.pubkey)
        );
        const seal = JSON.parse(sealJson) as Event;

        // Step 2: Decrypt seal to get rumor
        const rumorJson = await nip44.v2.decrypt(
            seal.content,
            nip44.v2.utils.getConversationKey(recipientSecretKey, seal.pubkey)
        );
        const rumor = JSON.parse(rumorJson) as Partial<Event>;

        return rumor;
    } catch (error) {
        console.error('Failed to unwrap gift wrap:', error);
        throw new Error('Failed to decrypt message');
    }
};

/**
 * Subscribe to incoming gift wraps for a user
 */
export const subscribeToGiftWraps = (
    userPubkey: string,
    userSecretKey: Uint8Array,
    relays: string[],
    onMessage: (rumor: Partial<Event>, senderPubkey: string) => void
): (() => void) => {
    const pool = getPool();

    const sub = pool.subscribeMany(relays, [
        {
            kinds: [1059],
            '#p': [userPubkey],
        },
    ], {
        onevent: async (event: Event) => {
            try {
                const rumor = await unwrapGiftWrap(event, userSecretKey);
                // The sender's pubkey is in the rumor
                const senderPubkey = rumor.pubkey || '';
                onMessage(rumor, senderPubkey);
            } catch (error) {
                console.error('Failed to process gift wrap:', error);
            }
        },
        oneose: () => {
            console.log('Gift wrap subscription established');
        },
    });

    // Return cleanup function
    return () => {
        sub.close();
    };
};
