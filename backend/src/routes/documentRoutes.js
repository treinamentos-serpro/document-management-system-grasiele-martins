const express = require('express');
const multer = require('multer');
const { randomUUID } = require('node:crypto');
const { storageDirectory, maxFileSizeBytes } = require('../config');
const documentController = require('../controllers/documentController');

const router = express.Router();
const receiveFile = multer({
  storage: multer.diskStorage({
    destination: storageDirectory,
    filename(req, file, callback) {
      callback(null, randomUUID());
    },
  }),
  limits: { fileSize: maxFileSizeBytes + 1, files: 1 },
}).single('file');

function uploadFile(req, res, next) {
  receiveFile(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      error.code = error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'VALIDATION_ERROR';
    } else if (error && /^(Multipart: Boundary not found|Unexpected end of form|Unexpected end of file|Malformed part header)$/.test(error.message)) {
      error.code = 'VALIDATION_ERROR';
    }
    next(error);
  });
}

router.post('/upload', documentController.validateOwner, uploadFile, documentController.upload);
router.get('/documents', documentController.validateOwner, documentController.list);
router.get('/documents/:id/download', documentController.validateOwner, documentController.download);
router.use(documentController.handleError);

module.exports = router;