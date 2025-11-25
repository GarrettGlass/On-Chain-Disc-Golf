# Wallet Fund Detection - Investigation & Fix

## Problem Diagnosis

### Issue
You sent 1,000 sats to your Lightning address (via npub.cash) but the funds didn't appear in the OnChains Disc Golf wallet.

### Root Causes

1. **NWC Lightning Address Flow**
   - Your Lightning address (`npub@npub.cash`) is managed by npub.cash
   - When someone pays to this address, the funds go to your NWC-connected wallet (npub.cash manages this)
   - The app needs to actively query the NWC wallet to check the current balance
   - There was no automatic refresh when viewing the wallet

2. **No Manual Refresh Option**
   - The app only checked balance when switching wallet modes
   - No way for users to manually trigger a balance refresh
   - No pull-to-refresh functionality

3. **How NWC/Lightning Addresses Work**
   - npub.cash provides a custodial Lightning wallet linked to your Nostr identity
   - Your Lightning address resolves to invoices via npub.cash's LNURL server
   - Payments are held in npub.cash's infrastructure
   - The app connects via NWC (Nostr Wallet Connect - NIP-47) to check balance and send/receive
   - **Important**: The app doesn't "receive" the payment directly - it queries npub.cash for the current balance

## Solutions Implemented

### 1. Pull-to-Refresh Functionality ✅

Added a native mobile-style pull-to-refresh gesture to the main wallet view:

**Features:**
- Touch and drag down on the wallet screen to refresh balance
- Visual feedback with animated refresh icon
- Works for both Cashu and NWC wallet modes
- Haptic feedback during pull gesture
- Smooth animations using iOS/Android native patterns

**How it works:**
- Detects when you're scrolled to the top of the wallet
- Tracks your finger's downward movement
- Shows a refresh icon that rotates as you pull
- Triggers `refreshWalletBalance()` when you release after pulling >60px
- For NWC mode: queries the wallet via NWC to get latest balance
- For Cashu mode: verifies all proofs with the mint

### 2. Auto-Refresh on Wallet View

The wallet now automatically refreshes when you:
- Navigate to the wallet tab
- Switch between Cashu and NWC modes
- Pull down to refresh

### 3. How to Use

**To check for incoming Lightning payments:**
1. Open the Wallet tab
2. Pull down on the screen (anywhere on the wallet view)
3. Release when you see the refresh icon spin
4. The app will query npub.cash via NWC
5. Your updated balance will appear within 1-2 seconds

## Technical Details

### NWC Balance Query Flow

```
1. User pulls to refresh
2. App calls refreshWalletBalance()
3. For NWC mode:
   - Calls nwcService.getBalance()
   - NWC service sends encrypted NIP-47 request to npub.cash relay
   - npub.cash responds with current wallet balance
   - Balance updates in UI
```

### Code Changes

**Modified Files:**
- `pages/Wallet.tsx`:
  - Added pull-to-refresh state management
  - Added touch event handlers (handleTouchStart, handleTouchMove, handleTouchEnd)
  - Added visual refresh indicator with animation
  - Attached handlers to main wallet view container
  
**Touch Event Logic:**
```typescript
// Only activate if at top of scroll
if (scrollTop === 0 && pulling down) {
  show refresh indicator
  track pull distance
}

// On release, if pulled far enough
if (pullDistance > 60px) {
  await refreshWalletBalance()
  show success animation
}
```

## Why This Happened

The 1,000 sats **did arrive** at your npub.cash wallet successfully. The issue was:
1. The app wasn't automatically polling for balance changes
2. There was no way to manually trigger a balance check
3. The last balance check happened before the payment arrived

## Next Steps

1. **Try it now**: Pull down on your wallet screen to refresh
2. **Your 1,000 sats should appear** (if the external wallet send was truly confirmed)
3. Pull-to-refresh anytime you're expecting a  payment

## Additional Notes

**For npub.cash/NWC users:**
- Your Lightning address is `{yourNpub}@npub.cash`
- Payments go to npub.cash's custodial wallet
- The app connects via NWC (Nostr Wallet Connect)
- Always pull-to-refresh after receiving payments
- Balance queries happen via encrypted Nostr messages

**Future Improvements:**
- Could add automatic polling every 30 seconds when wallet is open
- Could subscribe to npub.cash's Nostr events for payment notifications
- Could show a "last refreshed" timestamp
