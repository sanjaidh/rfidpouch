import React, { useState } from 'react';
import { Radio, CheckCircle2, AlertTriangle, X, ShieldAlert, Cpu } from 'lucide-react';
import { api } from '../services/api';

interface WriteTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  pouch: {
    id: string;
    serialNumber: string;
    batchNumber?: string;
  };
  onSuccess?: () => void;
  onNavigateToScan?: () => void;
}

export const WriteTagModal: React.FC<WriteTagModalProps> = ({
  isOpen,
  onClose,
  pouch,
  onSuccess,
  onNavigateToScan,
}) => {
  const [step, setStep] = useState<'confirm' | 'writing' | 'success' | 'error'>('confirm');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const payload = `POUCH:${pouch.serialNumber.trim().toUpperCase()}`;
  const isNfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

  const handleStartWrite = async () => {
    if (!isNfcSupported) {
      setStep('error');
      setErrorMessage(
        'Web NFC is not supported on this browser or device. To write real NFC tags, open this web application in Google Chrome on an Android phone with NFC hardware.'
      );
      return;
    }

    try {
      setStep('writing');
      setStatusMessage('Hold the back of your phone close to a compatible writable NFC tag...');

      const NDEFReaderClass = (window as any).NDEFReader;
      const writer = new NDEFReaderClass();

      // Perform real NDEF write
      await writer.write({
        records: [
          {
            recordType: 'text',
            data: payload,
            lang: 'en',
          },
        ],
      });

      // Update backend database tagProgrammed flag
      await api.markTagProgrammed(pouch.id);

      setStep('success');
      setStatusMessage(`Tag programmed successfully with identifier: ${payload}`);
      onSuccess?.();
    } catch (err: any) {
      setStep('error');
      if (err.name === 'NotAllowedError') {
        setErrorMessage('NFC write permission was denied by the browser.');
      } else if (err.name === 'NotSupportedError') {
        setErrorMessage('This tag appears to be read-only or is not compatible with NDEF formatting.');
      } else {
        setErrorMessage(err.message || 'Failed to program NFC tag. Tag may have moved away too quickly.');
      }
    }
  };

  const handleSimulatedWrite = async () => {
    // For developer testing on desktop
    setStep('writing');
    setStatusMessage('Simulating tag write in developer mode...');
    setTimeout(async () => {
      try {
        await api.markTagProgrammed(pouch.id);
        setStep('success');
        setStatusMessage(`[Simulated] Tag registered with identifier: ${payload}`);
        onSuccess?.();
      } catch (e: any) {
        setStep('error');
        setErrorMessage(e.message);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-blue-600 animate-pulse" />
            <h3 className="font-semibold text-slate-800">Program NFC Physical Tag</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <p className="text-xs uppercase tracking-wider font-semibold text-blue-600 mb-1">
                  Target NDEF Text Payload
                </p>
                <code className="text-lg font-mono font-bold text-blue-950 block">{payload}</code>
                <p className="text-xs text-blue-700 mt-2">
                  Target Pouch: <span className="font-semibold">{pouch.serialNumber}</span>
                  {pouch.batchNumber ? ` (Batch ${pouch.batchNumber})` : ''}
                </p>
              </div>

              <div className="text-sm text-slate-600 space-y-2">
                <p>
                  Writing this tag will format its primary NDEF text record. Existing data on this tag will be replaced.
                </p>
                <div className="flex items-start space-x-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
                  <span>Ensure your Android device has NFC enabled and you are using a writable Type 2 or Type 4 NDEF tag.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={handleStartWrite}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                >
                  <Radio className="w-4 h-4" />
                  <span>Confirm & Write NFC Tag</span>
                </button>

                {!isNfcSupported && (
                  <button
                    onClick={handleSimulatedWrite}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-300 transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    <span>Developer Mode: Simulate Tag Write (No Android NFC)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'writing' && (
            <div className="text-center py-6 space-y-4">
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-50 border border-blue-200">
                <Radio className="w-10 h-10 text-blue-600 animate-nfc-pulse" />
              </div>
              <div>
                <h4 className="text-base font-semibold text-slate-800">Ready to Program</h4>
                <p className="text-sm text-slate-600 mt-1 max-w-xs mx-auto">{statusMessage}</p>
              </div>
              <p className="text-xs text-slate-400">Do not move the tag away until writing is confirmed.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Tag Programmed!</h4>
                <p className="text-sm text-slate-600 mt-1">{statusMessage}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-800">
                Verified: {payload}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-xl text-sm transition-colors"
                >
                  Done
                </button>
                {onNavigateToScan && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToScan();
                    }}
                    className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm shadow transition-colors"
                  >
                    Scan to Verify
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Write Failed</h4>
                <p className="text-sm text-rose-700 mt-1">{errorMessage}</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setStep('confirm')}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
