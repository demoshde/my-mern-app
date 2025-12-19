import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, RefreshCw } from 'lucide-react';
import { itemsAPI } from '../lib/api';
import type { PPEItem } from '../types';
import toast from 'react-hot-toast';

export default function ItemQRPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [item, setItem] = useState<PPEItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const response = await itemsAPI.getById(id!);
      setItem(response.data);
    } catch (error) {
      toast.error('Failed to fetch item');
      navigate('/inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const response = await itemsAPI.regenerateQR(id!);
      setItem((prev) => (prev ? { ...prev, qrCode: response.data.qrCode } : null));
      toast.success('QR code regenerated');
    } catch (error) {
      toast.error('Failed to regenerate QR code');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDownload = () => {
    if (!item?.qrCode) return;

    const link = document.createElement('a');
    link.href = item.qrCode;
    link.download = `${item.barcode || item.name}-qr.png`;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !item) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>PPE Label - ${item.name}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .label {
              text-align: center;
              padding: 20px;
              border: 2px solid #000;
              max-width: 300px;
            }
            .label img {
              width: 200px;
              height: 200px;
            }
            .label h2 {
              margin: 15px 0 5px;
              font-size: 18px;
            }
            .label p {
              margin: 5px 0;
              color: #666;
              font-size: 12px;
            }
            .barcode {
              font-family: monospace;
              font-size: 14px;
              margin-top: 10px;
              padding: 5px;
              background: #f5f5f5;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${item.qrCode}" alt="QR Code" />
            <h2>${item.name}</h2>
            ${item.type ? `<p>Type: ${item.type}</p>` : ''}
            ${item.size ? `<p>Size: ${item.size}</p>` : ''}
            <div class="barcode">${item.barcode}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">QR Code Label</h1>
          <p className="text-gray-500">{item.name}</p>
        </div>
      </div>

      {/* QR Code Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          {item.qrCode ? (
            <img
              src={item.qrCode}
              alt="QR Code"
              className="w-64 h-64 mx-auto mb-6 border border-gray-200 rounded-lg"
            />
          ) : (
            <div className="w-64 h-64 mx-auto mb-6 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">No QR code available</p>
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-900 mb-2">{item.name}</h2>
          {item.type && <p className="text-gray-500">Type: {item.type}</p>}
          {item.size && <p className="text-gray-500">Size: {item.size}</p>}

          <div className="mt-4 inline-block px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm">
            {item.barcode}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            Download
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Print Label
          </button>
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </button>
        </div>
      </div>
    </div>
  );
}
