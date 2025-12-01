/**
 * MnemonicBackup Component
 * 
 * Displays 12/24 word mnemonic phrase for user backup.
 * Includes verification step where user confirms random words.
 * 
 * Flow:
 * 1. Display all words in a grid
 * 2. User confirms they've saved the words
 * 3. Verification: User enters 3 random words to confirm backup
 * 4. Success callback when verification passes
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Icons } from './Icons';
import { splitMnemonicToWords, getVerificationIndices } from '../services/mnemonicService';

interface MnemonicBackupProps {
    mnemonic: string;
    onComplete: () => void;
    onBack?: () => void;
    title?: string;
    subtitle?: string;
    showVerification?: boolean;
}

type Step = 'display' | 'verify' | 'complete';

export const MnemonicBackup: React.FC<MnemonicBackupProps> = ({
    mnemonic,
    onComplete,
    onBack,
    title = "Save Your Recovery Phrase",
    subtitle = "These 12 words are the ONLY way to recover your account and funds. Write them down and keep them safe.",
    showVerification = true
}) => {
    const [step, setStep] = useState<Step>('display');
    const [copied, setCopied] = useState(false);
    const [showWords, setShowWords] = useState(false);
    const [verificationInputs, setVerificationInputs] = useState<string[]>(['', '', '']);
    const [verificationError, setVerificationError] = useState(false);
    const [hasConfirmedSaved, setHasConfirmedSaved] = useState(false);

    const words = useMemo(() => splitMnemonicToWords(mnemonic), [mnemonic]);
    const verificationIndices = useMemo(() => getVerificationIndices(words.length, 3), [words.length]);

    // Reset verification inputs when step changes
    useEffect(() => {
        if (step === 'verify') {
            setVerificationInputs(['', '', '']);
            setVerificationError(false);
        }
    }, [step]);

    const handleCopy = () => {
        navigator.clipboard.writeText(mnemonic);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleProceedToVerify = () => {
        if (showVerification) {
            setStep('verify');
        } else {
            onComplete();
        }
    };

    const handleVerify = () => {
        // Check if all inputs match the words at the verification indices
        const allCorrect = verificationIndices.every((wordIndex, inputIndex) => {
            const inputWord = verificationInputs[inputIndex].trim().toLowerCase();
            return inputWord === words[wordIndex].toLowerCase();
        });

        if (allCorrect) {
            setStep('complete');
            setTimeout(onComplete, 1500); // Brief success animation before callback
        } else {
            setVerificationError(true);
            setTimeout(() => setVerificationError(false), 2000);
        }
    };

    const handleVerificationInput = (index: number, value: string) => {
        const newInputs = [...verificationInputs];
        newInputs[index] = value;
        setVerificationInputs(newInputs);
        setVerificationError(false);
    };

    // Display Step - Show all 12 words
    if (step === 'display') {
        return (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
                {/* Header */}
                <div className="text-center mb-4">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <Icons.Back size={24} />
                        </button>
                    )}

                    <div className="w-16 h-16 mx-auto mb-3 bg-amber-500/20 rounded-full flex items-center justify-center border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                        <Icons.Key className="text-amber-500" size={32} />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                    <p className="text-slate-400 text-sm px-4">{subtitle}</p>
                </div>

                {/* Warning Banner */}
                <div className="mx-4 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="flex items-start space-x-2">
                        <Icons.Shield className="text-red-400 shrink-0 mt-0.5" size={18} />
                        <div className="text-xs text-red-300">
                            <strong className="block mb-1">Never share these words!</strong>
                            Anyone with these words can steal your funds. We will NEVER ask for them.
                        </div>
                    </div>
                </div>

                {/* Word Grid */}
                <div className="flex-1 mx-4 overflow-y-auto">
                    <div className="relative">
                        {/* Blur overlay when hidden */}
                        {!showWords && (
                            <div
                                className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-xl z-10 cursor-pointer"
                                onClick={() => setShowWords(true)}
                            >
                                <div className="text-center p-4">
                                    <Icons.Eye className="mx-auto text-slate-400 mb-2" size={32} />
                                    <p className="text-slate-300 font-medium text-sm">Tap to reveal words</p>
                                    <p className="text-slate-500 text-xs mt-1">Make sure no one is watching</p>
                                </div>
                            </div>
                        )}

                        {/* Word Grid */}
                        <div className="grid grid-cols-3 gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                            {words.map((word, index) => (
                                <div
                                    key={index}
                                    className="flex items-center bg-slate-900/50 rounded-lg p-2 border border-slate-700"
                                >
                                    <span className="text-slate-500 text-xs font-mono w-5 shrink-0">
                                        {index + 1}.
                                    </span>
                                    <span className="text-white font-mono text-sm">
                                        {showWords ? word : '•••••'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Copy Button */}
                    {showWords && (
                        <button
                            onClick={handleCopy}
                            className="mt-3 w-full py-2 flex items-center justify-center space-x-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                        >
                            {copied ? (
                                <>
                                    <Icons.Check size={16} className="text-green-400" />
                                    <span className="text-green-400">Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Icons.Copy size={16} className="text-slate-400" />
                                    <span className="text-slate-300">Copy to clipboard</span>
                                </>
                            )}
                        </button>
                    )}
                </div>

                {/* Confirmation Checkbox & Continue Button */}
                <div className="p-4 space-y-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={hasConfirmedSaved}
                            onChange={(e) => setHasConfirmedSaved(e.target.checked)}
                            className="mt-1 w-5 h-5 rounded border-2 border-amber-500 bg-transparent checked:bg-amber-500 focus:ring-amber-500"
                        />
                        <span className="text-slate-300 text-sm">
                            I have written down my recovery phrase and stored it safely
                        </span>
                    </label>

                    <button
                        onClick={handleProceedToVerify}
                        disabled={!hasConfirmedSaved || !showWords}
                        className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        <span>{showVerification ? 'Verify Backup' : 'Continue'}</span>
                        <Icons.Next size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // Verification Step - User enters 3 random words
    if (step === 'verify') {
        return (
            <div className="flex flex-col h-full animate-in fade-in duration-300">
                {/* Header */}
                <div className="text-center mb-6">
                    <button
                        onClick={() => setStep('display')}
                        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <Icons.Back size={24} />
                    </button>

                    <div className="w-16 h-16 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                        <Icons.Shield className="text-purple-500" size={32} />
                    </div>

                    <h2 className="text-xl font-bold text-white mb-2">Verify Your Backup</h2>
                    <p className="text-slate-400 text-sm px-4">
                        Enter the following words from your recovery phrase
                    </p>
                </div>

                {/* Verification Inputs */}
                <div className="flex-1 mx-4 space-y-4">
                    {verificationIndices.map((wordIndex, inputIndex) => (
                        <div key={wordIndex} className="space-y-2">
                            <label className="text-slate-400 text-sm font-medium">
                                Word #{wordIndex + 1}
                            </label>
                            <input
                                type="text"
                                value={verificationInputs[inputIndex]}
                                onChange={(e) => handleVerificationInput(inputIndex, e.target.value)}
                                placeholder={`Enter word #${wordIndex + 1}`}
                                className={`w-full px-4 py-3 bg-slate-800/50 border rounded-xl text-white font-mono focus:outline-none transition-colors ${verificationError
                                        ? 'border-red-500 focus:border-red-500'
                                        : 'border-slate-700 focus:border-purple-500'
                                    }`}
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                            />
                        </div>
                    ))}

                    {verificationError && (
                        <div className="flex items-center space-x-2 text-red-400 text-sm animate-in shake">
                            <Icons.Close size={16} />
                            <span>Incorrect words. Please try again.</span>
                        </div>
                    )}
                </div>

                {/* Verify Button */}
                <div className="p-4">
                    <button
                        onClick={handleVerify}
                        disabled={verificationInputs.some(v => !v.trim())}
                        className="w-full py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                        <Icons.Shield size={18} />
                        <span>Verify</span>
                    </button>

                    <button
                        onClick={() => setStep('display')}
                        className="w-full mt-2 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                    >
                        Go back and view words
                    </button>
                </div>
            </div>
        );
    }

    // Complete Step - Success animation
    if (step === 'complete') {
        return (
            <div className="flex flex-col items-center justify-center h-full animate-in zoom-in duration-300">
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] animate-pulse">
                    <Icons.Check className="text-green-500" size={48} />
                </div>

                <h2 className="text-2xl font-bold text-white mt-6">Backup Verified!</h2>
                <p className="text-slate-400 text-center mt-2 px-8">
                    Your recovery phrase is safely backed up. You're ready to go!
                </p>
            </div>
        );
    }

    return null;
};

/**
 * Simplified Mnemonic Display (no verification)
 * For showing existing mnemonic in settings/profile
 */
export const MnemonicDisplay: React.FC<{
    mnemonic: string;
    onClose?: () => void;
}> = ({ mnemonic, onClose }) => {
    const [showWords, setShowWords] = useState(false);
    const [copied, setCopied] = useState(false);
    const words = splitMnemonicToWords(mnemonic);

    const handleCopy = () => {
        navigator.clipboard.writeText(mnemonic);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Warning */}
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-start space-x-2">
                    <Icons.Shield className="text-red-400 shrink-0 mt-0.5" size={18} />
                    <p className="text-xs text-red-300">
                        <strong>Never share these words!</strong> Anyone with them can steal your funds.
                    </p>
                </div>
            </div>

            {/* Words Grid */}
            <div className="relative">
                {!showWords && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-xl z-10 cursor-pointer"
                        onClick={() => setShowWords(true)}
                    >
                        <div className="text-center">
                            <Icons.Eye className="mx-auto text-slate-400 mb-2" size={24} />
                            <p className="text-slate-300 text-sm">Tap to reveal</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
                    {words.map((word, index) => (
                        <div
                            key={index}
                            className="flex items-center bg-slate-900/50 rounded-lg p-2 border border-slate-700"
                        >
                            <span className="text-slate-500 text-xs font-mono w-5 shrink-0">
                                {index + 1}.
                            </span>
                            <span className="text-white font-mono text-xs">
                                {showWords ? word : '•••••'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
                {showWords && (
                    <button
                        onClick={handleCopy}
                        className="flex-1 py-2 flex items-center justify-center space-x-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                    >
                        {copied ? (
                            <>
                                <Icons.Check size={16} className="text-green-400" />
                                <span className="text-green-400">Copied!</span>
                            </>
                        ) : (
                            <>
                                <Icons.Copy size={16} className="text-slate-400" />
                                <span className="text-slate-300">Copy</span>
                            </>
                        )}
                    </button>
                )}

                {showWords && (
                    <button
                        onClick={() => setShowWords(false)}
                        className="flex-1 py-2 flex items-center justify-center space-x-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm"
                    >
                        <Icons.Eye className="text-slate-400" size={16} />
                        <span className="text-slate-300">Hide</span>
                    </button>
                )}

                {onClose && (
                    <button
                        onClick={onClose}
                        className="py-2 px-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors text-sm text-slate-300"
                    >
                        Close
                    </button>
                )}
            </div>
        </div>
    );
};

/**
 * Mnemonic Recovery Input
 * For users recovering with their seed phrase
 */
export const MnemonicRecoveryInput: React.FC<{
    onSubmit: (mnemonic: string) => void;
    onCancel: () => void;
    error?: string;
    isLoading?: boolean;
}> = ({ onSubmit, onCancel, error, isLoading }) => {
    const [words, setWords] = useState<string[]>(Array(12).fill(''));
    const [pasteMode, setPasteMode] = useState(false);
    const [pasteInput, setPasteInput] = useState('');

    const handleWordChange = (index: number, value: string) => {
        const newWords = [...words];
        newWords[index] = value.trim().toLowerCase();
        setWords(newWords);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        const pastedWords = pastedText.trim().toLowerCase().split(/\s+/);

        if (pastedWords.length === 12 || pastedWords.length === 24) {
            if (pastedWords.length === 12) {
                setWords(pastedWords);
            } else {
                setWords(pastedWords.slice(0, 12));
            }
        }
    };

    const handlePasteSubmit = () => {
        const pastedWords = pasteInput.trim().toLowerCase().split(/\s+/);
        if (pastedWords.length >= 12) {
            setWords(pastedWords.slice(0, 12));
            setPasteMode(false);
        }
    };

    const handleSubmit = () => {
        const mnemonic = words.join(' ');
        onSubmit(mnemonic);
    };

    const isComplete = words.every(w => w.length > 0);

    return (
        <div className="space-y-4">
            <div className="text-center mb-4">
                <div className="w-14 h-14 mx-auto mb-3 bg-purple-500/20 rounded-full flex items-center justify-center border-2 border-purple-500">
                    <Icons.Key className="text-purple-500" size={28} />
                </div>
                <h3 className="text-lg font-bold text-white">Enter Recovery Phrase</h3>
                <p className="text-slate-400 text-sm">Enter your 12-word recovery phrase</p>
            </div>

            {/* Toggle between grid and paste */}
            <div className="flex justify-center space-x-2 mb-4">
                <button
                    onClick={() => setPasteMode(false)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${!pasteMode
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                >
                    Word by Word
                </button>
                <button
                    onClick={() => setPasteMode(true)}
                    className={`px-4 py-1.5 rounded-full text-sm transition-colors ${pasteMode
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-400 hover:text-white'
                        }`}
                >
                    Paste All
                </button>
            </div>

            {pasteMode ? (
                <div className="space-y-3">
                    <textarea
                        value={pasteInput}
                        onChange={(e) => setPasteInput(e.target.value)}
                        placeholder="Paste your 12 words here..."
                        className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-purple-500 focus:outline-none resize-none"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <button
                        onClick={handlePasteSubmit}
                        disabled={!pasteInput.trim()}
                        className="w-full py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        Parse Words
                    </button>
                </div>
            ) : (
                <div
                    className="grid grid-cols-3 gap-2"
                    onPaste={handlePaste}
                >
                    {words.map((word, index) => (
                        <div key={index} className="flex items-center space-x-1">
                            <span className="text-slate-500 text-xs font-mono w-5 shrink-0">
                                {index + 1}.
                            </span>
                            <input
                                type="text"
                                value={word}
                                onChange={(e) => handleWordChange(index, e.target.value)}
                                placeholder="word"
                                className="flex-1 px-2 py-1.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-purple-500 focus:outline-none"
                                autoComplete="off"
                                autoCapitalize="none"
                                spellCheck={false}
                            />
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="flex items-center space-x-2 text-red-400 text-sm">
                    <Icons.Close size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!isComplete || isLoading}
                    className="flex-1 py-3 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Recovering...' : 'Recover Account'}
                </button>
            </div>
        </div>
    );
};

export default MnemonicBackup;

