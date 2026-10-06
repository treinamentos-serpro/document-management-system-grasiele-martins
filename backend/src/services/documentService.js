const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');

function createError(code) {
  return Object.assign(new Error(code), { code });
}

function validateOwner(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError('VALIDATION_ERROR');
  }
  return value.trim();
}

function toPublicMetadata(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

async function createDocument(file, owner) {
  const normalizedOwner = validateOwner(owner);
  if (!file) throw createError('VALIDATION_ERROR');

  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: normalizedOwner,
    storageName: file.filename,
  };

  try {
    await documentRepository.save(document);
  } catch (error) {
    try {
      await documentRepository.removeFile(document.storageName);
    } catch (cleanupError) {
      console.error('Falha ao remover arquivo após erro de persistência:', cleanupError);
    }
    throw error;
  }

  return toPublicMetadata(document);
}

function listDocuments(owner) {
  const documents = documentRepository.findByOwner(validateOwner(owner));
  documents.sort((first, second) => {
    if (first.uploadedAt !== second.uploadedAt) {
      return first.uploadedAt > second.uploadedAt ? -1 : 1;
    }
    return first.id < second.id ? -1 : first.id > second.id ? 1 : 0;
  });
  return documents.map(toPublicMetadata);
}

async function getDownload(id, owner) {
  const normalizedOwner = validateOwner(owner);
  if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw createError('VALIDATION_ERROR');
  }

  const document = documentRepository.findById(id);
  if (!document || document.owner !== normalizedOwner) {
    throw createError('DOCUMENT_NOT_FOUND');
  }

  try {
    const filePath = await documentRepository.getFilePath(document.storageName);
    return { filePath, originalName: document.originalName };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      throw createError('DOCUMENT_NOT_FOUND');
    }
    throw error;
  }
}

module.exports = { validateOwner, createDocument, listDocuments, getDownload };