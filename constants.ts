/**
 * Application Constants
 * 
 * This file contains configuration constants for the On-Chain Disc Golf app.
 * 
 * ⚠️ IMPORTANT: Some values in this file are critical for wallet functionality.
 * See individual comments for modification guidelines.
 */

// ============================================================================
// GAME DEFAULTS
// ============================================================================

export const DEFAULT_HOLE_COUNT = 18;
export const DEFAULT_PAR = 3;

export const COURSE_PRESETS = [
  { name: "Oak Grove", par: 54 },
  { name: "Blue Ribbon Pines", par: 62 },
  { name: "Maple Hill", par: 60 },
  { name: "DeLaVeaga", par: 58 },
];

export const SAMPLE_PLAYERS = [
  { name: "Paul McBeth", handicap: -5 },
  { name: "Ricky Wysocki", handicap: -4 },
  { name: "Simon Lizotte", handicap: -3 },
  { name: "Calvin Heimburg", handicap: -3 },
];

export const MOCK_QR_CODE = "lnurl1dp68gurn8ghj7um5v93kketj9ehx2amn9uh8wetvdskkkmn0wah22efd95mnw7r95a5";

// ============================================================================
// BREEZ SDK CONFIGURATION
// ============================================================================

/**
 * ⚠️ BREEZ SDK API KEY - HANDLE WITH CARE ⚠️
 * 
 * This is a PEM-encoded X.509 certificate used to authenticate with Breez services.
 * 
 * KEY INFORMATION:
 * - Organization: On-Chain Disc Golf
 * - Common Name: Garrett
 * - Valid: November 2025 - November 2035 (10 years)
 * - Network: MAINNET (production Bitcoin)
 * - Email: garrett@onchaindiscgolf.com
 * 
 * SECURITY NOTES:
 * - This key is tied to our Breez account and usage quotas
 * - Do NOT share this key publicly or commit to public repos
 * - If compromised, contact Breez to revoke and reissue
 * - The key grants access to Lightning Network operations
 * 
 * REPLACEMENT:
 * - If you need a new key, request from Breez: https://breez.technology/
 * - New keys must be in the same PEM certificate format
 * - Test thoroughly on testnet before mainnet deployment
 * 
 * USAGE:
 * - Imported in AppContext.tsx for SDK initialization
 * - Passed to breezService.initializeBreez() via config object
 * 
 * FORMAT:
 * - Base64-encoded DER certificate
 * - Must be passed as a single string (no line breaks in usage)
 */
export const BREEZ_API_KEY = `MIIBfjCCATCgAwIBAgIHPq/TyrHw+TAFBgMrZXAwEDEOMAwGA1UEAxMFQnJlZXowHhcNMjUxMTMwMDQzNDMyWhcNMzUxMTI4MDQzNDMyWjAvMRswGQYDVQQKExJPbi1DaGFpbiBEaXNjIEdvbGYxEDAOBgNVBAMTB0dhcnJldHQwKjAFBgMrZXADIQDQg/XL3yA8HKIgyimHU/Qbpxy0tvzris1fDUtEs6ldd6OBiTCBhjAOBgNVHQ8BAf8EBAMCBaAwDAYDVR0TAQH/BAIwADAdBgNVHQ4EFgQU2jmj7l5rSw0yVb/vlWAYkK/YBwkwHwYDVR0jBBgwFoAU3qrWklbzjed0khb8TLYgsmsomGswJgYDVR0RBB8wHYEbZ2FycmV0dEBvbmNoYWluZGlzY2dvbGYuY29tMAUGAytlcANBAKY87D8Nt1GXnfEStgYX3VGHXwAkMuS7CSs7XrdKllzF5iQfutyaiYipD6hjZih87Q2VQxIixsCUSr5dHNgyrg4=`;