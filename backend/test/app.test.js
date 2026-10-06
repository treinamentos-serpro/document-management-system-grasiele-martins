const { test } = require('node:test');
const assert = require('node:assert');
const { mkdtempSync, readdirSync, readFileSync, rmSync, unlinkSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const storageDirectory = mkdtempSync(path.join(tmpdir(), 'dms-test-'));
const previousStorageDirectory = process.env.STORAGE_DIR;
const previousFileSize = process.env.MAX_FILE_SIZE_BYTES;
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '32';
const app = require('../src/app');

if (previousStorageDirectory === undefined) delete process.env.STORAGE_DIR;
else process.env.STORAGE_DIR = previousStorageDirectory;
if (previousFileSize === undefined) delete process.env.MAX_FILE_SIZE_BYTES;
else process.env.MAX_FILE_SIZE_BYTES = previousFileSize;

test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('contratos HTTP dos documentos', async (context) => {
  const server = app.listen(0, '127.0.0.1');
  context.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    rmSync(storageDirectory, { recursive: true, force: true });
  });
  await new Promise((resolve) => server.once('listening', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const ownerHeaders = { 'X-User-Id': 'usuario-123' };
  const upload = (content, headers = ownerHeaders, field = 'file') => {
    const form = new FormData();
    form.append(field, new Blob([content]), 'relatorio.txt');
    return fetch(`${baseUrl}/upload`, { method: 'POST', headers, body: form });
  };
  const expectError = async (response, status, code) => {
    assert.strictEqual(response.status, status);
    const body = await response.json();
    assert.strictEqual(body.error.code, code);
    assert.strictEqual(typeof body.error.message, 'string');
    assert.ok(!JSON.stringify(body).includes(storageDirectory));
  };
  let document;
  let storageName;

  await context.test('preserva o endpoint de saúde', async () => {
    const response = await fetch(`${baseUrl}/health`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { status: 'ok' });
  });

  await context.test('exige identidade nas três operações antes de gravar arquivos', async () => {
    for (const headers of [{}, { 'X-User-Id': '   ' }]) {
      await expectError(await upload('conteudo', headers), 400, 'VALIDATION_ERROR');
      await expectError(await fetch(`${baseUrl}/documents`, { headers }), 400, 'VALIDATION_ERROR');
      await expectError(await fetch(`${baseUrl}/documents/invalid/download`, { headers }), 400, 'VALIDATION_ERROR');
    }
    assert.deepStrictEqual(readdirSync(storageDirectory), []);
  });

  await context.test('lista vazia para um usuário sem documentos', async () => {
    const response = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), []);
  });

  await context.test('grava upload no disco e retorna somente metadados públicos', async () => {
    const response = await upload('conteudo', { 'X-User-Id': ' usuario-123 ' });
    assert.strictEqual(response.status, 201);
    document = await response.json();
    assert.deepStrictEqual(Object.keys(document).sort(), ['id', 'originalName', 'owner', 'size', 'uploadedAt']);
    assert.match(document.id, /^[0-9a-f-]{36}$/);
    assert.strictEqual(document.originalName, 'relatorio.txt');
    assert.strictEqual(document.owner, 'usuario-123');
    assert.strictEqual(document.size, Buffer.byteLength('conteudo'));
    assert.strictEqual(new Date(document.uploadedAt).toISOString(), document.uploadedAt);
    const storedFiles = readdirSync(storageDirectory);
    assert.strictEqual(storedFiles.length, 1);
    storageName = storedFiles[0];
    assert.notStrictEqual(storageName, document.originalName);
    assert.strictEqual(readFileSync(path.join(storageDirectory, storageName), 'utf8'), 'conteudo');
  });

  await context.test('lista e baixa somente documentos do dono', async () => {
    const listing = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.strictEqual(listing.status, 200);
    assert.deepStrictEqual(await listing.json(), [document]);
    const download = await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: ownerHeaders });
    assert.strictEqual(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /^attachment;.*relatorio\.txt/);
    assert.strictEqual(await download.text(), 'conteudo');
    const otherHeaders = { 'X-User-Id': 'outro-usuario' };
    const otherListing = await fetch(`${baseUrl}/documents`, { headers: otherHeaders });
    assert.deepStrictEqual(await otherListing.json(), []);
    await expectError(await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: otherHeaders }), 404, 'DOCUMENT_NOT_FOUND');
  });

  await context.test('rejeita arquivo ausente, campo incorreto e arquivos extras', async () => {
    await expectError(await fetch(`${baseUrl}/upload`, { method: 'POST', headers: ownerHeaders, body: new FormData() }), 400, 'VALIDATION_ERROR');
    await expectError(await upload('conteudo', ownerHeaders, 'wrong'), 400, 'VALIDATION_ERROR');
    const form = new FormData();
    form.append('file', new Blob(['primeiro']), 'primeiro.txt');
    form.append('file', new Blob(['segundo']), 'segundo.txt');
    await expectError(await fetch(`${baseUrl}/upload`, { method: 'POST', headers: ownerHeaders, body: form }), 400, 'VALIDATION_ERROR');
    assert.deepStrictEqual(readdirSync(storageDirectory), [storageName]);
  });

  await context.test('rejeita limite excedido sem arquivo ou metadados parciais', async () => {
    await expectError(await upload('a'.repeat(33)), 413, 'FILE_TOO_LARGE');
    assert.deepStrictEqual(readdirSync(storageDirectory), [storageName]);
    const listing = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.deepStrictEqual(await listing.json(), [document]);
  });

  await context.test('rejeita identificador inválido e trata documento inexistente', async () => {
    await expectError(await fetch(`${baseUrl}/documents/invalid/download`, { headers: ownerHeaders }), 400, 'VALIDATION_ERROR');
    await expectError(await fetch(`${baseUrl}/documents/00000000-0000-4000-8000-000000000000/download`, { headers: ownerHeaders }), 404, 'DOCUMENT_NOT_FOUND');
  });

  await context.test('retorna 404 quando o arquivo local não está disponível', async () => {
    unlinkSync(path.join(storageDirectory, storageName));
    await expectError(await fetch(`${baseUrl}/documents/${document.id}/download`, { headers: ownerHeaders }), 404, 'DOCUMENT_NOT_FOUND');
  });

  await context.test('ordena a listagem por data decrescente e id crescente', async () => {
    await upload('primeiro');
    await upload('segundo');
    const response = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    const documents = await response.json();
    assert.strictEqual(documents.length, 3);
    const sorted = [...documents].sort((first, second) => {
      if (first.uploadedAt !== second.uploadedAt) return first.uploadedAt > second.uploadedAt ? -1 : 1;
      return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
    });
    assert.deepStrictEqual(documents, sorted);
  });

  await context.test('aceita arquivo exatamente no limite configurado', async () => {
    const response = await upload('a'.repeat(32), { 'X-User-Id': 'usuario-limite' });
    assert.strictEqual(response.status, 201);
    assert.strictEqual((await response.json()).size, 32);
  });

  await context.test('trata falha de gravação sem registrar metadados', async () => {
    const before = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    const documents = await before.json();
    rmSync(storageDirectory, { recursive: true, force: true });
    await expectError(await upload('conteudo'), 500, 'INTERNAL_ERROR');
    const after = await fetch(`${baseUrl}/documents`, { headers: ownerHeaders });
    assert.deepStrictEqual(await after.json(), documents);
  });
});

test('remove o arquivo se o registro dos metadados falhar', async (context) => {
  const repository = require('../src/repositories/documentRepository');
  const service = require('../src/services/documentService');
  const failure = new Error('Falha simulada');
  context.mock.method(repository, 'save', () => { throw failure; });
  const removeFile = context.mock.method(repository, 'removeFile', async () => {});

  await assert.rejects(service.createDocument({
    filename: 'arquivo-interno', originalname: 'relatorio.txt', size: 8,
  }, 'usuario-123'), (error) => error === failure);
  assert.strictEqual(removeFile.mock.callCount(), 1);
  assert.deepStrictEqual(removeFile.mock.calls[0].arguments, ['arquivo-interno']);
});

test('ordenação desempata por id sem expor nomes internos', (context) => {
  const repository = require('../src/repositories/documentRepository');
  const service = require('../src/services/documentService');
  const metadata = {
    originalName: 'relatorio.txt', size: 8, owner: 'usuario-123',
    uploadedAt: '2026-10-06T12:00:00.000Z', storageName: 'interno',
  };
  context.mock.method(repository, 'findByOwner', () => [
    { ...metadata, id: 'b' },
    { ...metadata, id: 'c', uploadedAt: '2026-10-06T13:00:00.000Z' },
    { ...metadata, id: 'a' },
  ]);
  const documents = service.listDocuments('usuario-123');
  assert.deepStrictEqual(documents.map((document) => document.id), ['c', 'a', 'b']);
  assert.ok(documents.every((document) => !Object.hasOwn(document, 'storageName')));
});

test('configuração inválida impede inicialização', () => {
  const configPath = require.resolve('../src/config');
  for (const limit of ['0', '-1', 'abc', '1.5', '', '9007199254740992']) {
    const result = spawnSync(process.execPath, ['-e', 'require(process.argv[1])', configPath], {
      env: { ...process.env, STORAGE_DIR: storageDirectory, MAX_FILE_SIZE_BYTES: limit },
      encoding: 'utf8',
    });
    assert.strictEqual(result.status, 1);
    assert.match(result.stderr, /MAX_FILE_SIZE_BYTES/);
  }
  const result = spawnSync(process.execPath, ['-e', 'require(process.argv[1])', configPath], {
    env: { ...process.env, STORAGE_DIR: ' ', MAX_FILE_SIZE_BYTES: '32' },
    encoding: 'utf8',
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /STORAGE_DIR/);
});
