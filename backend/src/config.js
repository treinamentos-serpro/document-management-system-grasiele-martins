const path = require('node:path');
const { mkdirSync } = require('node:fs');

const configuredDirectory = process.env.STORAGE_DIR;
const configuredLimit = process.env.MAX_FILE_SIZE_BYTES ?? '10485760';

if (configuredDirectory !== undefined && !configuredDirectory.trim()) {
  throw new Error('STORAGE_DIR deve indicar um diretório local válido.');
}

const maxFileSizeBytes = Number(configuredLimit);
if (!/^\d+$/.test(configuredLimit) || !Number.isSafeInteger(maxFileSizeBytes) || maxFileSizeBytes <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo válido.');
}

const storageDirectory = configuredDirectory === undefined
  ? path.resolve(__dirname, '../storage')
  : path.resolve(configuredDirectory);

mkdirSync(storageDirectory, { recursive: true });

module.exports = { storageDirectory, maxFileSizeBytes };