import { useState } from 'react';
import { uploadDocument } from '../services/documentApi';

export default function UploadComponent({ userId, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file || isUploading) return;
    const form = event.currentTarget;
    setIsUploading(true);
    setError('');
    setMessage('');

    try {
      await uploadDocument(file, userId);
      form.reset();
      setFile(null);
      setMessage('Documento enviado.');
      onUploaded();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <h2 id="upload-title">Novo documento</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        <label htmlFor="document-file">Arquivo</label>
        <input
          id="document-file"
          type="file"
          required
          disabled={isUploading}
          onChange={(event) => {
            setFile(event.target.files[0] || null);
            setError('');
            setMessage('');
          }}
        />
        <button type="submit" disabled={!file || isUploading}>
          {isUploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {error && <p role="alert" className="error">{error}</p>}
      <p role="status" className="status">{message}</p>
    </section>
  );
}