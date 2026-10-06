import { useState } from 'react';
import { downloadDocument } from '../services/documentApi';

export default function DownloadButton({ document, userId }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  async function handleDownload() {
    if (isDownloading) return;
    setIsDownloading(true);
    setError('');

    try {
      const blob = await downloadDocument(document.id, userId);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.originalName;
      window.document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div className="download-action">
      <button
        type="button"
        className="secondary-button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`Baixar ${document.originalName}`}
      >
        {isDownloading ? 'Baixando...' : 'Baixar'}
      </button>
      {error && <p role="alert" className="error">{error}</p>}
    </div>
  );
}