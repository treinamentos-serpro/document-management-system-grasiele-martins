import { useEffect, useState } from 'react';
import UploadComponent from './components/UploadComponent';
import DocumentList from './components/DocumentList';
import { listDocuments } from './services/documentApi';
import './App.css';

function DocumentWorkspace({ userId }) {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  function refreshDocuments() {
    setRefreshVersion((version) => version + 1);
  }

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError('');

    listDocuments(userId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDocuments(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [userId, refreshVersion]);

  return (
    <>
      <UploadComponent userId={userId} onUploaded={refreshDocuments} />
      <DocumentList documents={documents} userId={userId} isLoading={isLoading} error={error} onRefresh={refreshDocuments} />
    </>
  );
}

export default function App() {
  const [userId, setUserId] = useState('');
  const [userInput, setUserInput] = useState('');

  function handleUserSubmit(event) {
    event.preventDefault();
    const normalizedUser = userInput.trim();
    if (normalizedUser) setUserId(normalizedUser);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <span className="brand">DMS</span>
        <h1>Gestão de documentos</h1>
      </header>
      <form className="user-form" onSubmit={handleUserSubmit}>
        <label htmlFor="user-id">Identificador do usuário</label>
        <input id="user-id" value={userInput} onChange={(event) => setUserInput(event.target.value)} required />
        <button type="submit" disabled={!userInput.trim()}>Abrir documentos</button>
      </form>
      {userId ? (
        <div key={userId}>
          <p className="active-user">Usuário atual: <strong>{userId}</strong></p>
          <DocumentWorkspace userId={userId} />
        </div>
      ) : <p className="empty-state">Nenhum usuário selecionado.</p>}
    </main>
  );
}
