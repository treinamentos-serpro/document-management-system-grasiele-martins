async function request(path, userId, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { ...options.headers, 'X-User-Id': userId },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message || 'Não foi possível concluir a operação.');
  }

  return response;
}

export async function listDocuments(userId, signal) {
  const response = await request('/documents', userId, { signal });
  return response.json();
}

export async function uploadDocument(file, userId) {
  const body = new FormData();
  body.append('file', file);
  const response = await request('/upload', userId, { method: 'POST', body });
  return response.json();
}

export async function downloadDocument(id, userId) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, userId);
  return response.blob();
}