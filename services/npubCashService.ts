import { NPCClient, JWTAuthProvider, ConsoleLogger } from "npubcash-sdk";
import { signEventWrapper, getSession } from './nostrService';
import { Event } from 'nostr-tools';

// Singleton client instance
let clientInstance: NPCClient | null = null;
// Subscription disposer
let subscriptionDisposer: (() => void) | null = null;

const getClient = () => {
    if (clientInstance) return clientInstance;

    const baseUrl = "https://npubx.cash";

    // Wrapper to adapt signEventWrapper to what SDK expects
    // SDK expects: (e: Omit<NostrEvent, "id" | "sig" | "pubkey">) => Promise<NostrEvent>
    const signer = async (e: any): Promise<any> => {
        // signEventWrapper handles adding pubkey, id, sig, and created_at if missing
        // But SDK might pass some of these.
        // signEventWrapper expects a template.
        return await signEventWrapper(e);
    };

    const auth = new JWTAuthProvider(baseUrl, signer);
    const client = new NPCClient(baseUrl, auth);
    // client.setLogger(new ConsoleLogger()); // Uncomment for debug logs

    clientInstance = client;
    return client;
};

export interface NpubCashQuote {
    quoteId: string;
    mintUrl: string;
    amount: number;
    state: string;
    request: string;
}

/**
 * Subscribe to real-time quote updates via WebSocket
 * @param onUpdate Callback when a quote is updated (receives quoteId)
 * @param onError Optional error handler
 * @returns Disposer function to unsubscribe
 */
export const subscribeToQuoteUpdates = (
    onUpdate: (quoteId: string) => void,
    onError?: (error: any) => void
): (() => void) => {
    const session = getSession();
    if (!session) {
        console.warn("Cannot subscribe to npub.cash: no session");
        return () => { }; // Return no-op disposer
    }

    try {
        const client = getClient();
        console.log("📡 [npub.cash] Subscribing to real-time quote updates via WebSocket...");

        // Unsubscribe from any existing subscription first
        if (subscriptionDisposer) {
            console.log("📡 [npub.cash] Cleaning up existing subscription...");
            subscriptionDisposer();
            subscriptionDisposer = null;
        }

        // Subscribe to real-time updates
        const disposer = client.subscribe(
            (quoteId: string) => {
                console.log(`📥 [npub.cash] Quote updated: ${quoteId}`);
                onUpdate(quoteId);
            },
            (error: any) => {
                console.error("❌ [npub.cash] WebSocket error:", error);
                if (onError) onError(error);
            }
        );

        subscriptionDisposer = disposer;
        console.log("✅ [npub.cash] WebSocket subscription active");

        return disposer;
    } catch (e) {
        console.error("Failed to subscribe to npub.cash WebSocket", e);
        if (onError) onError(e);
        return () => { }; // Return no-op disposer on error
    }
};

/**
 * Unsubscribe from quote updates
 */
export const unsubscribeFromQuoteUpdates = () => {
    if (subscriptionDisposer) {
        console.log("🔌 [npub.cash] Unsubscribing from WebSocket...");
        subscriptionDisposer();
        subscriptionDisposer = null;
    }
};

/**
 * Fetch all pending payments (HTTP fallback, used for manual refresh)
 */
export const checkPendingPayments = async (): Promise<NpubCashQuote[]> => {
    const session = getSession();
    if (!session) return [];

    try {
        const client = getClient();
        console.log("Checking for pending npub.cash payments...");

        // Fetch all quotes
        // TODO: We could optimize this with getQuotesSince if we track last check time
        const quotes = await client.getAllQuotes();
        console.log(`Fetched ${quotes.length} quotes from npub.cash`);

        // Log the first few quotes to see their structure and state
        if (quotes.length > 0) {
            console.log("Sample quote:", JSON.stringify(quotes[0], null, 2));
            quotes.forEach(q => console.log(`Quote ${q.quoteId}: state=${q.state}, amount=${q.amount}`));
        }

        // Filter for PAID quotes
        // We cast to any because the SDK types might be strict but we want to be sure
        const paidQuotes = quotes.filter((q: any) => q.state === 'PAID');

        console.log(`Found ${paidQuotes.length} PAID quotes`);
        return paidQuotes as unknown as NpubCashQuote[];
    } catch (e) {
        console.error("Failed to check npub.cash payments", e);
        return [];
    }
};

/**
 * Fetch a specific quote by ID
 */
export const getQuoteById = async (quoteId: string): Promise<NpubCashQuote | null> => {
    try {
        const client = getClient();
        const quotes = await client.getAllQuotes();
        const quote = quotes.find((q: any) => q.quoteId === quoteId);
        return quote as unknown as NpubCashQuote || null;
    } catch (e) {
        console.error("Failed to fetch quote by ID", e);
        return null;
    }
};
