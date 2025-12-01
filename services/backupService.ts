/**
 * Backup Service
 * 
 * Provides multiple backup options for recovery phrases:
 * - QR Code generation with branding
 * - PDF Wallet Card with Memory Story
 * - Nostr encrypted backup (NIP-78)
 */

import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { splitMnemonicToWords } from './mnemonicService';
import { publishWalletBackup, fetchWalletBackup, getSession } from './nostrService';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// =============================================================================
// STORY GENERATOR
// =============================================================================

/**
 * Story templates for each word position (1-12)
 * These create a coherent narrative when combined
 */
const STORY_TEMPLATES = [
    "In a distant land known as {WORD},",
    "there lived a brave {WORD}",
    "who discovered a magical {WORD}.",
    "The journey led through the {WORD} valley,",
    "where a wise {WORD} offered guidance.",
    "Together they faced the fearsome {WORD},",
    "crossing the bridge of {WORD}",
    "beneath the ancient {WORD} mountains.",
    "At last they found the hidden {WORD},",
    "guarded by the spirit of {WORD}.",
    "With courage like {WORD},",
    "they claimed the treasure of {WORD}."
];

/**
 * Generate a memorable story from the mnemonic words
 * Each word is woven into a narrative structure
 */
export const generateMemoryStory = (mnemonic: string): string => {
    const words = splitMnemonicToWords(mnemonic);
    
    const storyParts = words.map((word, index) => {
        const template = STORY_TEMPLATES[index] || `The {WORD} was significant.`;
        // Capitalize the word for proper noun treatment in the story
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
        return template.replace('{WORD}', capitalizedWord);
    });
    
    return storyParts.join(' ');
};

/**
 * Generate story with word numbers for reference
 */
export const generateMemoryStoryWithNumbers = (mnemonic: string): string => {
    const words = splitMnemonicToWords(mnemonic);
    
    const storyParts = words.map((word, index) => {
        const template = STORY_TEMPLATES[index] || `The {WORD} was significant.`;
        const capitalizedWord = word.charAt(0).toUpperCase() + word.slice(1);
        // Add word number in parentheses for reference
        return template.replace('{WORD}', `${capitalizedWord} (#${index + 1})`);
    });
    
    return storyParts.join(' ');
};

// =============================================================================
// QR CODE GENERATION
// =============================================================================

/**
 * Generate a QR code as a data URL with branding
 * Returns a canvas element that includes the QR + "On-Chain Disc Golf" text
 */
export const generateBrandedQRCode = async (mnemonic: string): Promise<string> => {
    // Create a canvas for the QR code
    const qrCanvas = document.createElement('canvas');
    
    await QRCode.toCanvas(qrCanvas, mnemonic, {
        width: 280,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
    });
    
    // Create a new canvas with space for branding
    const brandedCanvas = document.createElement('canvas');
    const ctx = brandedCanvas.getContext('2d')!;
    
    const padding = 20;
    const textHeight = 50;
    
    brandedCanvas.width = qrCanvas.width + (padding * 2);
    brandedCanvas.height = qrCanvas.height + (padding * 2) + textHeight;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, brandedCanvas.width, brandedCanvas.height);
    
    // Draw QR code
    ctx.drawImage(qrCanvas, padding, padding);
    
    // Add branding text
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('On-Chain Disc Golf', brandedCanvas.width / 2, qrCanvas.height + padding + 25);
    
    ctx.fillStyle = '#64748b'; // slate-500
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.fillText('Recovery Phrase Backup', brandedCanvas.width / 2, qrCanvas.height + padding + 42);
    
    return brandedCanvas.toDataURL('image/png');
};

/**
 * Download the branded QR code as an image
 */
export const downloadQRCode = async (mnemonic: string): Promise<void> => {
    const dataUrl = await generateBrandedQRCode(mnemonic);
    
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'onchain-discgolf-backup.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// =============================================================================
// PDF WALLET CARD GENERATION
// =============================================================================

/**
 * Generate a beautiful PDF wallet card with:
 * - 12 words in a grid
 * - Memory story for easier recall
 * - Branding and instructions
 */
export const generateWalletCardPDF = async (mnemonic: string): Promise<jsPDF> => {
    const words = splitMnemonicToWords(mnemonic);
    const story = generateMemoryStory(mnemonic);
    
    // Create PDF (A5 size for a nice card feel)
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5' // 148 x 210 mm
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    
    // Background color (very light teal tint)
    pdf.setFillColor(240, 253, 250);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Header
    pdf.setFontSize(22);
    pdf.setTextColor(13, 148, 136); // teal-600
    pdf.setFont('helvetica', 'bold');
    pdf.text('On-Chain Disc Golf', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setTextColor(100, 116, 139); // slate-500
    pdf.setFont('helvetica', 'normal');
    pdf.text('Recovery Phrase Backup', pageWidth / 2, 28, { align: 'center' });
    
    // Divider line
    pdf.setDrawColor(203, 213, 225); // slate-300
    pdf.setLineWidth(0.5);
    pdf.line(margin, 35, pageWidth - margin, 35);
    
    // Word grid section
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105); // slate-600
    pdf.setFont('helvetica', 'bold');
    pdf.text('YOUR 12 WORDS:', margin, 45);
    
    // Draw word grid (4 columns x 3 rows)
    const gridStartY = 50;
    const colWidth = (pageWidth - (margin * 2)) / 4;
    const rowHeight = 12;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(30, 41, 59); // slate-800
    
    words.forEach((word, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const x = margin + (col * colWidth) + 5;
        const y = gridStartY + (row * rowHeight);
        
        // Word number
        pdf.setTextColor(148, 163, 184); // slate-400
        pdf.setFontSize(9);
        pdf.text(`${index + 1}.`, x, y);
        
        // Word
        pdf.setTextColor(30, 41, 59); // slate-800
        pdf.setFontSize(11);
        pdf.text(word, x + 8, y);
    });
    
    // Divider
    pdf.setDrawColor(203, 213, 225);
    pdf.line(margin, gridStartY + 40, pageWidth - margin, gridStartY + 40);
    
    // Memory Story section
    const storyStartY = gridStartY + 50;
    
    pdf.setFontSize(10);
    pdf.setTextColor(71, 85, 105);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MEMORY STORY:', margin, storyStartY);
    
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85); // slate-700
    
    // Split story into lines that fit the page width
    const maxWidth = pageWidth - (margin * 2);
    const storyLines = pdf.splitTextToSize(story, maxWidth);
    pdf.text(storyLines, margin, storyStartY + 8);
    
    // Warning box at bottom
    const warningY = pageHeight - 45;
    
    pdf.setFillColor(254, 242, 242); // red-50
    pdf.setDrawColor(252, 165, 165); // red-300
    pdf.roundedRect(margin, warningY, pageWidth - (margin * 2), 30, 3, 3, 'FD');
    
    pdf.setFontSize(9);
    pdf.setTextColor(185, 28, 28); // red-700
    pdf.setFont('helvetica', 'bold');
    pdf.text('⚠️ KEEP THIS SAFE!', margin + 5, warningY + 8);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(127, 29, 29); // red-800
    const warningText = 'Anyone with these words can access your wallet. Never share them online or with anyone claiming to be support.';
    const warningLines = pdf.splitTextToSize(warningText, pageWidth - (margin * 2) - 10);
    pdf.text(warningLines, margin + 5, warningY + 15);
    
    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    
    return pdf;
};

/**
 * Download the wallet card PDF
 */
export const downloadWalletCardPDF = async (mnemonic: string): Promise<void> => {
    const pdf = await generateWalletCardPDF(mnemonic);
    pdf.save('onchain-discgolf-wallet-card.pdf');
};

// =============================================================================
// NOSTR ENCRYPTED BACKUP
// =============================================================================

const BACKUP_EVENT_KIND = 30078; // NIP-78 Application Specific Data (parameterized replaceable)
const BACKUP_D_TAG = 'chainlinks_encrypted_backup';

/**
 * Simple AES-GCM encryption using Web Crypto API
 */
const encryptWithPassword = async (data: string, password: string): Promise<{
    ciphertext: string;
    iv: string;
    salt: string;
}> => {
    // Generate salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from password
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(data)
    );
    
    return {
        ciphertext: bytesToHex(new Uint8Array(ciphertext)),
        iv: bytesToHex(iv),
        salt: bytesToHex(salt)
    };
};

/**
 * Decrypt data with password
 */
const decryptWithPassword = async (
    ciphertextHex: string,
    ivHex: string,
    saltHex: string,
    password: string
): Promise<string> => {
    const ciphertext = hexToBytes(ciphertextHex);
    const iv = hexToBytes(ivHex);
    const salt = hexToBytes(saltHex);
    
    // Derive key from password
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
};

/**
 * Backup mnemonic to Nostr relays (encrypted)
 * User provides a password that encrypts the mnemonic before publishing
 */
export const backupToNostr = async (mnemonic: string, password: string): Promise<boolean> => {
    try {
        // Encrypt mnemonic with user's password
        const encrypted = await encryptWithPassword(mnemonic, password);
        
        // Create backup payload
        const payload = JSON.stringify({
            type: 'encrypted_seed_backup',
            version: 1,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            salt: encrypted.salt,
            timestamp: Date.now()
        });
        
        // For now, we'll use a simple approach - store as app data
        // This could be published as a NIP-78 event
        // The actual implementation will use the nostrService
        
        console.log('📤 Backing up encrypted seed to Nostr...');
        
        // Store locally for now (TODO: publish to relays when nostrService supports it)
        localStorage.setItem('cdg_nostr_backup', payload);
        localStorage.setItem('cdg_nostr_backup_timestamp', Date.now().toString());
        
        console.log('✅ Encrypted backup stored');
        return true;
        
    } catch (error) {
        console.error('❌ Nostr backup failed:', error);
        return false;
    }
};

/**
 * Restore mnemonic from Nostr backup
 */
export const restoreFromNostr = async (password: string): Promise<string | null> => {
    try {
        // For now, restore from local storage (TODO: fetch from relays)
        const payload = localStorage.getItem('cdg_nostr_backup');
        
        if (!payload) {
            console.log('No Nostr backup found');
            return null;
        }
        
        const data = JSON.parse(payload);
        
        if (data.type !== 'encrypted_seed_backup') {
            throw new Error('Invalid backup format');
        }
        
        // Decrypt with password
        const mnemonic = await decryptWithPassword(
            data.ciphertext,
            data.iv,
            data.salt,
            password
        );
        
        return mnemonic;
        
    } catch (error) {
        console.error('❌ Nostr restore failed:', error);
        return null;
    }
};

/**
 * Check if a Nostr backup exists
 */
export const hasNostrBackup = (): boolean => {
    return localStorage.getItem('cdg_nostr_backup') !== null;
};

/**
 * Get Nostr backup timestamp
 */
export const getNostrBackupTimestamp = (): Date | null => {
    const timestamp = localStorage.getItem('cdg_nostr_backup_timestamp');
    if (timestamp) {
        return new Date(parseInt(timestamp));
    }
    return null;
};

