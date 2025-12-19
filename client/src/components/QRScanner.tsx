import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [error, setError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // QR code not detected, keep scanning
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to start camera');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (err) {
        // Scanner might already be stopped
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-gray-900">Scan QR / Barcode</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner */}
        <div className="p-4">
          {error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Please make sure your camera is enabled and permissions are granted.
              </p>
            </div>
          ) : (
            <div
              id="qr-reader"
              ref={containerRef}
              className="rounded-lg overflow-hidden"
            />
          )}
        </div>

        {/* Manual Entry */}
        <div className="p-4 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center mb-3">
            Or enter barcode manually
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).barcode as HTMLInputElement;
              if (input.value.trim()) {
                onScan(input.value.trim());
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              name="barcode"
              placeholder="Enter barcode..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
