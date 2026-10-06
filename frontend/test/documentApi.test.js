import assert from 'node:assert/strict';
import { afterEach, mock, test } from 'node:test';
import { downloadDocument, listDocuments, uploadDocument } from '../src/services/documentApi.js';

afterEach(() => mock.restoreAll());

test('listagem usa /api, o usuário e o sinal de cancelamento', async () => {
  const documents = [{ id: 'document-id', originalName: 'arquivo.txt' }];
  const signal = new AbortController().signal;
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(documents));

  assert.deepEqual(await listDocuments('user-1', signal), documents);
  const [path, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(path, '/api/documents');
  assert.equal(options.headers['X-User-Id'], 'user-1');
  assert.equal(options.signal, signal);
});

test('upload envia um único arquivo como multipart sem definir Content-Type manualmente', async () => {
  const file = new File(['conteudo'], 'arquivo.txt', { type: 'text/plain' });
  const metadata = { id: 'document-id', originalName: file.name };
  const fetchMock = mock.method(globalThis, 'fetch', async () => Response.json(metadata, { status: 201 }));

  assert.deepEqual(await uploadDocument(file, 'user-1'), metadata);
  const [path, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(path, '/api/upload');
  assert.equal(options.method, 'POST');
  assert.deepEqual(options.headers, { 'X-User-Id': 'user-1' });
  assert.ok(options.body instanceof FormData);
  assert.equal(options.body.getAll('file').length, 1);
  assert.equal(options.body.get('file').name, file.name);
  assert.equal(await options.body.get('file').text(), 'conteudo');
});

test('download codifica o identificador, envia o usuário e retorna o conteúdo binário', async () => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response('conteudo'));

  const blob = await downloadDocument('document/id', 'user-1');
  assert.ok(blob instanceof Blob);
  assert.equal(await blob.text(), 'conteudo');
  const [path, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(path, '/api/documents/document%2Fid/download');
  assert.equal(options.headers['X-User-Id'], 'user-1');
});

test('erros HTTP preservam a mensagem retornada pelo backend', async () => {
  mock.method(globalThis, 'fetch', async () => Response.json({
    error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
  }, { status: 404 }));

  await assert.rejects(downloadDocument('missing', 'user-1'), { message: 'Documento não encontrado.' });
});

test('erros sem JSON usam uma mensagem de fallback', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('Bad Gateway', { status: 502 }));

  await assert.rejects(listDocuments('user-1'), { message: 'Não foi possível concluir a operação.' });
});