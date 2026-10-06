import DownloadButton from './DownloadButton';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${sizeFormatter.format(bytes / 1024)} KB`;
  return `${sizeFormatter.format(bytes / 1024 ** 2)} MB`;
}

export default function DocumentList({ documents, userId, isLoading, error, onRefresh }) {
  return (
    <section className="documents-section" aria-labelledby="documents-title" aria-busy={isLoading}>
      <div className="section-heading">
        <h2 id="documents-title">Seus documentos <span className="count">{documents.length}</span></h2>
        <button type="button" className="secondary-button" onClick={onRefresh} disabled={isLoading}>
          Atualizar lista
        </button>
      </div>
      {isLoading && <p role="status">Carregando documentos...</p>}
      {error && <p role="alert" className="error">{error}</p>}
      {!isLoading && !error && documents.length === 0 && <p className="empty-state">Nenhum documento encontrado.</p>}
      {documents.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th scope="col">Nome</th><th scope="col">Tamanho</th><th scope="col">Enviado em</th><th scope="col">Download</th></tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <td className="document-name">{document.originalName}</td>
                  <td>{formatSize(document.size)}</td>
                  <td><time dateTime={document.uploadedAt}>{dateFormatter.format(new Date(document.uploadedAt))}</time></td>
                  <td><DownloadButton document={document} userId={userId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}