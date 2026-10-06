const documentService = require('../services/documentService');

const errorResponses = {
  VALIDATION_ERROR: { status: 400, message: 'Informe X-User-Id, um identificador válido e um único arquivo no campo file para upload.' },
  FILE_TOO_LARGE: { status: 413, message: 'O arquivo excede o limite permitido.' },
  DOCUMENT_NOT_FOUND: { status: 404, message: 'Documento não encontrado.' },
  INTERNAL_ERROR: { status: 500, message: 'Não foi possível concluir a operação.' },
};

function validateOwner(req, res, next) {
  try {
    req.documentOwner = documentService.validateOwner(req.get('X-User-Id'));
    next();
  } catch (error) {
    next(error);
  }
}

async function upload(req, res) {
  const document = await documentService.createDocument(req.file, req.documentOwner);
  res.status(201).json(document);
}

function list(req, res) {
  res.json(documentService.listDocuments(req.documentOwner));
}

async function download(req, res, next) {
  const document = await documentService.getDownload(req.params.id, req.documentOwner);
  res.download(document.filePath, document.originalName, (error) => {
    if (!error) return;
    if (res.headersSent) {
      res.destroy(error);
      return;
    }
    if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
      error.code = 'DOCUMENT_NOT_FOUND';
    }
    next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);
  const code = Object.hasOwn(errorResponses, error.code) ? error.code : 'INTERNAL_ERROR';
  const { status, message } = errorResponses[code];
  if (code === 'INTERNAL_ERROR') console.error('Falha na operação de documentos:', error);
  res.status(status).json({ error: { code, message } });
}

module.exports = { validateOwner, upload, list, download, handleError };