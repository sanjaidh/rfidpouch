import { useState, useEffect, useRef, useCallback } from 'react';

export interface ScanResult {
  serialNumber: string | null;
  rawPayload: string;
  tagUid: string | null;
  recordType: string;
  timestamp: Date;
  isValidPouch: boolean;
  errorMessage?: string;
}

export interface UseWebNfcReturn {
  isSupported: boolean;
  isSecureContext: boolean;
  isScanning: boolean;
  status: 'idle' | 'scanning' | 'success' | 'error';
  lastScan: ScanResult | null;
  errorMessage: string | null;
  startScan: () => Promise<void>;
  stopScan: () => void;
  writeTag: (serialNumber: string) => Promise<{ success: boolean; message: string }>;
  isWriting: boolean;
  clearError: () => void;
  // Explicitly labeled developer simulator for testing without Android NFC hardware
  simulatorMode: boolean;
  setSimulatorMode: (enabled: boolean) => void;
  simulateScan: (serialNumber: string) => void;
}

export function parseNdefText(rawText: string): {
  isValid: boolean;
  serialNumber: string | null;
  errorMessage?: string;
} {
  const clean = rawText.trim();
  const match = clean.match(/^POUCH:\s*([A-Za-z0-9_\-]+)$/i);

  if (match && match[1]) {
    return {
      isValid: true,
      serialNumber: match[1].trim().toUpperCase(),
    };
  }

  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return {
      isValid: false,
      serialNumber: null,
      errorMessage: 'Tag contains a URL instead of a factory pouch identifier. Expected format: POUCH:<SERIAL_NUMBER>',
    };
  }

  return {
    isValid: false,
    serialNumber: null,
    errorMessage: 'Unregistered or invalid pouch tag. Register the pouch or write a valid pouch identifier to this tag.',
  };
}

export function useWebNfc(): UseWebNfcReturn {
  const isSupported = typeof window !== 'undefined' && 'NDEFReader' in window;
  const isSecureContext = typeof window !== 'undefined' && Boolean(window.isSecureContext);

  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWriting, setIsWriting] = useState(false);

  // Developer simulation mode (only active when enabled explicitly for desktop test)
  const [simulatorMode, setSimulatorMode] = useState<boolean>(() => {
    return !isSupported && typeof window !== 'undefined' && window.location.hostname === 'localhost';
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<any>(null);
  const lastReadTimeRef = useRef<number>(0);
  const lastScannedPayloadRef = useRef<string>('');

  const clearError = useCallback(() => {
    setErrorMessage(null);
    if (status === 'error') {
      setStatus(isScanning ? 'scanning' : 'idle');
    }
  }, [status, isScanning]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        try {
          abortControllerRef.current.abort();
        } catch (_) {}
      }
    };
  }, []);

  const stopScan = useCallback(() => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (_) {}
      abortControllerRef.current = null;
    }
    setIsScanning(false);
    setStatus('idle');
  }, []);

  const startScan = useCallback(async () => {
    if (!isSupported) {
      if (!isSecureContext) {
        setErrorMessage(
          'Web NFC blocked: Chrome requires a Secure Context (HTTPS or localhost). Over plain Wi-Fi HTTP, Chrome disables the NFC API. Enable HTTPS or configure chrome://flags/#unsafely-treat-insecure-origin-as-secure.'
        );
      } else {
        setErrorMessage(
          'Web NFC is not supported in this browser or device. Open this application in Google Chrome on an NFC-enabled Android phone.'
        );
      }
      setStatus('error');
      return;
    }

    // Stop existing scan if active
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (_) {}
    }

    try {
      setErrorMessage(null);
      setStatus('scanning');
      setIsScanning(true);

      const NDEFReaderClass = (window as any).NDEFReader;
      const reader = new NDEFReaderClass();
      readerRef.current = reader;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Register reading listener
      reader.addEventListener(
        'reading',
        (event: any) => {
          const now = Date.now();
          const tagUid = event.serialNumber || null;

          let decodedText = '';
          let primaryRecordType = 'unknown';

          if (event.message && event.message.records && event.message.records.length > 0) {
            for (const record of event.message.records) {
              primaryRecordType = record.recordType || 'unknown';

              if (record.recordType === 'text') {
                const textDecoder = new TextDecoder(record.encoding || 'utf-8');
                decodedText = textDecoder.decode(record.data);
                break;
              } else if (record.recordType === 'url') {
                const textDecoder = new TextDecoder();
                decodedText = textDecoder.decode(record.data);
                break;
              } else if (record.data) {
                try {
                  const textDecoder = new TextDecoder();
                  decodedText = textDecoder.decode(record.data);
                } catch (_) {
                  decodedText = '[Binary NDEF Data]';
                }
              }
            }
          }

          // Debounce duplicate reads of the exact same tag within 2.5 seconds
          if (
            decodedText === lastScannedPayloadRef.current &&
            now - lastReadTimeRef.current < 2500
          ) {
            return;
          }

          lastReadTimeRef.current = now;
          lastScannedPayloadRef.current = decodedText;

          // Parse pouch payload
          const parsed = parseNdefText(decodedText);

          const scanResult: ScanResult = {
            serialNumber: parsed.serialNumber,
            rawPayload: decodedText || '[Empty NDEF Message]',
            tagUid,
            recordType: primaryRecordType,
            timestamp: new Date(),
            isValidPouch: parsed.isValid,
            errorMessage: parsed.errorMessage,
          };

          setLastScan(scanResult);

          if (parsed.isValid) {
            setStatus('success');
            setErrorMessage(null);
          } else {
            setStatus('error');
            setErrorMessage(parsed.errorMessage || 'Invalid NFC tag content.');
          }
        },
        { signal: controller.signal }
      );

      // Register reading error listener
      reader.addEventListener(
        'readingerror',
        () => {
          setStatus('error');
          setErrorMessage('Cannot read data from the NFC tag. Try bringing the phone closer or hold still.');
        },
        { signal: controller.signal }
      );

      // Start actual hardware scan
      await reader.scan({ signal: controller.signal });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User stopped scan cleanly
        setIsScanning(false);
        setStatus('idle');
        return;
      }

      setIsScanning(false);
      setStatus('error');

      if (err.name === 'NotAllowedError') {
        setErrorMessage('NFC permission was denied. Please allow NFC access in your browser settings.');
      } else if (err.name === 'NotSupportedError') {
        setErrorMessage('Web NFC is not supported or NFC is turned off in Android system settings.');
      } else {
        setErrorMessage(err.message || 'Failed to start NFC scan. Please verify NFC is enabled in phone settings.');
      }
    }
  }, [isSupported]);

  // Real NFC Tag Writing using NDEFReader.write()
  const writeTag = useCallback(
    async (serialNumber: string): Promise<{ success: boolean; message: string }> => {
      const cleanSerial = serialNumber.trim().toUpperCase();
      const payload = `POUCH:${cleanSerial}`;

      if (!isSupported) {
        return {
          success: false,
          message: !isSecureContext
            ? 'Web NFC requires a Secure Context (HTTPS). Connect via HTTPS or enable the Chrome insecure origins flag.'
            : 'Web NFC is not supported on this browser/device. Open this application on Chrome for Android over HTTPS.',
        };
      }

      setIsWriting(true);
      try {
        const NDEFReaderClass = (window as any).NDEFReader;
        const writer = new NDEFReaderClass();

        // Write standard NDEF text record
        await writer.write({
          records: [
            {
              recordType: 'text',
              data: payload,
              lang: 'en',
            },
          ],
        });

        setIsWriting(false);
        return {
          success: true,
          message: `Successfully programmed NFC tag with payload: ${payload}`,
        };
      } catch (err: any) {
        setIsWriting(false);
        let msg = err.message || 'Failed to write NFC tag.';
        if (err.name === 'NotAllowedError') {
          msg = 'Permission to write NFC tag was denied.';
        } else if (err.name === 'NotSupportedError') {
          msg = 'The NFC tag is read-only or unsupported by this device.';
        }
        return {
          success: false,
          message: msg,
        };
      }
    },
    [isSupported]
  );

  // Simulation mode for testing on desktop browser or devices without NFC hardware
  const simulateScan = useCallback((serialNumber: string) => {
    const clean = serialNumber.trim().toUpperCase();
    const rawPayload = `POUCH:${clean}`;
    const parsed = parseNdefText(rawPayload);

    const scanResult: ScanResult = {
      serialNumber: parsed.serialNumber,
      rawPayload,
      tagUid: `04:A1:B2:${Math.floor(Math.random() * 89 + 10)}:C3:D4:E5`,
      recordType: 'text',
      timestamp: new Date(),
      isValidPouch: parsed.isValid,
      errorMessage: parsed.errorMessage,
    };

    setLastScan(scanResult);
    if (parsed.isValid) {
      setStatus('success');
      setErrorMessage(null);
    } else {
      setStatus('error');
      setErrorMessage(parsed.errorMessage || 'Invalid simulation payload.');
    }
  }, []);

  return {
    isSupported,
    isSecureContext,
    isScanning,
    status,
    lastScan,
    errorMessage,
    startScan,
    stopScan,
    writeTag,
    isWriting,
    clearError,
    simulatorMode,
    setSimulatorMode,
    simulateScan,
  };
}
