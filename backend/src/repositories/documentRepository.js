const path = require('node:path');
const { constants } = require('node:fs');
const { access, rm } = require('node:fs/promises');
const { storageDirectory } = require('../config');

const documents = new Map();

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id);
}

function findByOwner(owner) {
  return [...documents.values()].filter((document) => document.owner === owner);
}

async function getFilePath(storageName) {
  const filePath = path.join(storageDirectory, storageName);
  await access(filePath, constants.R_OK);
  return filePath;
}

async function removeFile(storageName) {
  await rm(path.join(storageDirectory, storageName), { force: true });
}

module.exports = { save, findById, findByOwner, getFilePath, removeFile };