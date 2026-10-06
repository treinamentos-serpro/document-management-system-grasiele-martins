---
description: Implementa uma funcionalidade do DMS com critérios de aceite e testes focados.
name: implementar-funcionalidade-dms
argument-hint: descreva a funcionalidade e seus critérios de aceite
agent: dms-feature
---

# Implementar funcionalidade no DMS

Implemente a seguinte funcionalidade no Document Management System:

`${input:requisito:descreva a funcionalidade e os critérios de aceite}`

Consulte as instruções do projeto e as especificações relevantes em `docs/specs`. Antes de editar, encontre o código e os testes mais próximos. Preserve os contratos existentes, siga as camadas do backend e as convenções atuais de nomes e arquivos.

Inclua ou atualize testes para os critérios de aceite. Use `node:test` no backend e execute os testes relevantes ao final. Se a alteração envolver o frontend, use os serviços existentes com o prefixo `/api` e execute os testes disponíveis para essa parte.

Respeite o armazenamento local em `backend/storage` e os metadados em memória. Não adicione integrações externas nem dependências sem necessidade. Ao concluir, informe o que foi implementado, quais arquivos foram alterados e o resultado das validações.