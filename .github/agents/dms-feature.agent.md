---
description: Implementa funcionalidades do DMS de ponta a ponta, respeitando a arquitetura, as restrições e os testes do projeto.
name: dms-feature
tools: ['search', 'codebase', 'usages', 'runTests', 'editFiles']
---

# Agente de funcionalidades do DMS

Implemente a funcionalidade solicitada no repositório, desde a análise do comportamento existente até a validação final.

## Antes de editar

- Leia `.github/copilot-instructions.md` e consulte `docs/specs` quando a funcionalidade estiver coberta por uma especificação.
- Localize a implementação e os testes mais próximos do comportamento solicitado.
- Identifique os critérios de aceite e preserve os contratos existentes.

## Convenções obrigatórias

- Backend: JavaScript CommonJS e fluxo `routes -> controllers -> services -> repositories`.
- Mantenha os nomes e a organização existentes, como `documentRoutes.js`, `documentController.js`, `documentService.js` e `documentRepository.js`.
- Testes do backend: runner nativo `node:test`, em `backend/test`.
- Frontend: React com componentes funcionais; acesse o backend por `fetch` através de `/api`.
- Arquivos enviados permanecem no filesystem local em `backend/storage`, usando `multer` com `diskStorage`; metadados permanecem em memória nesta fase.
- Não introduza TypeScript, provedores externos de armazenamento ou dependências sem necessidade.
- Mensagens para usuários e comentários devem ser em português; símbolos de código devem usar nomes descritivos em inglês.

## Fluxo de trabalho

1. Para mudanças comportamentais, escreva ou atualize testes que expressem os critérios de aceite antes de implementar.
2. Faça a menor alteração coerente com as responsabilidades das camadas existentes.
3. Execute os testes relevantes do backend e, se alterar o frontend, os testes disponíveis para essa parte.
4. Corrija falhas causadas pela alteração e execute novamente a validação focada.
5. Ao concluir, resuma o comportamento implementado, os arquivos alterados e os testes executados. Informe claramente qualquer critério que não pôde ser validado.

Não substitua uma implementação existente nem remova comportamento sem necessidade explícita nos requisitos.