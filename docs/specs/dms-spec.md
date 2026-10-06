# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web simples para que usuários enviem, listem e baixem seus documentos, mantendo os arquivos no filesystem local e os metadados em memória.

## 2. Escopo

### Dentro do escopo

- Receber um arquivo por requisição de upload.
- Manter o arquivo no filesystem local da aplicação, em `backend/storage` por padrão, usando `multer` com `diskStorage`.
- Manter metadados dos documentos em memória durante a execução do processo.
- Listar somente os documentos associados ao usuário informado na requisição.
- Permitir o download de um documento pertencente ao usuário informado.
- Disponibilizar uma interface web React para as operações de upload, listagem e download, consumindo a API pelo prefixo `/api` configurado no proxy do Vite.
- Configurar porta, diretório de armazenamento e limite de upload por variáveis de ambiente.

### Fora do escopo

- Armazenamento externo, em nuvem ou em serviços de terceiros.
- Banco de dados ou persistência durável dos metadados.
- Versionamento, edição, compartilhamento ou exclusão de documentos.
- Autenticação, cadastro de usuários e gestão de sessões.
- Recuperação automática de metadados depois que o processo reiniciar.
- Antivírus, OCR, indexação ou pré-visualização do conteúdo.

## 3. Requisitos funcionais

| ID | Requisito |
| --- | --- |
| RF-01 | O usuário pode enviar um arquivo por `multipart/form-data`, usando o campo `file`. |
| RF-02 | O sistema gera um identificador único para cada documento e registra nome original, tamanho, data/hora do upload e dono. |
| RF-03 | O sistema persiste o conteúdo do arquivo no disco local por meio de `multer` configurado com `diskStorage`. |
| RF-04 | O usuário pode listar os metadados dos documentos associados à sua identidade de requisição. |
| RF-05 | O usuário pode baixar um documento pelo identificador quando o documento estiver associado à sua identidade de requisição. |
| RF-06 | O sistema rejeita upload sem arquivo ou acima do limite configurado, sem registrar metadados de um upload malsucedido. |
| RF-07 | O sistema não revela se um documento existe quando ele não pertence ao usuário solicitante; nesses casos, responde como documento não encontrado. |
| RF-08 | A interface permite enviar arquivos, consultar a lista do usuário e iniciar o download de um documento listado. |

### Identidade do usuário nesta fase

Como autenticação está fora do escopo, a API recebe a identidade operacional por meio do cabeçalho `X-User-Id`. O valor é obrigatório nas três operações, deve ser não vazio após remoção de espaços nas extremidades e é armazenado como `owner`. Esse cabeçalho é apenas um identificador fornecido pelo cliente, não prova a identidade de uma pessoa e não oferece segurança de autenticação. A aplicação não deve ser considerada adequada para exposição pública ou dados sensíveis sem autenticação e autorização confiáveis.

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos são armazenados exclusivamente no filesystem local, em `backend/storage` por padrão, usando `multer` com `diskStorage`; não usar provedores externos. |
| RNF-02 | Os metadados são mantidos em memória e desaparecem quando o processo reinicia. |
| RNF-03 | Configurações operacionais são obtidas de variáveis de ambiente, seguindo o princípio de configuração do 12-Factor App. |
| RNF-04 | O nome original nunca é usado como caminho de destino. O nome interno do arquivo é gerado pela aplicação, impedindo traversal de diretório. |
| RNF-05 | O limite padrão de upload é 10 MiB e pode ser substituído por `MAX_FILE_SIZE_BYTES`. |
| RNF-06 | Erros inesperados não devem expor caminhos locais, stack traces ou detalhes internos na resposta HTTP. |
| RNF-07 | O sistema suporta um único processo como fonte da verdade dos metadados; execução em múltiplas instâncias não é suportada nesta fase. |
| RNF-08 | A API deve responder com JSON consistente para erros e usar códigos HTTP apropriados. O conteúdo do download é binário. |
| RNF-09 | A implementação backend usa Node.js, Express e CommonJS; os testes usam `node:test`, sem adicionar dependências quando as já presentes forem suficientes. |

### Configuração

| Variável | Padrão | Uso |
| --- | --- | --- |
| `PORT` | `3000` | Porta HTTP do backend. |
| `STORAGE_DIR` | `backend/storage` | Diretório absoluto ou relativo ao processo onde `multer` grava os arquivos. |
| `MAX_FILE_SIZE_BYTES` | `10485760` | Tamanho máximo permitido para um arquivo, em bytes. |

Valores inválidos para limite de upload ou diretório de armazenamento devem impedir a inicialização ou produzir erro de configuração claro no log, sem fallback silencioso para uma configuração insegura.

## 5. Modelo de dados

### Metadados do documento

| Campo | Tipo | Exposição | Descrição |
| --- | --- | --- | --- |
| `id` | string | Público | Identificador único, gerado pela aplicação, preferencialmente com `crypto.randomUUID()`. |
| `originalName` | string | Público | Nome original recebido no upload; usado como nome sugerido no download, nunca como caminho no disco. |
| `size` | number | Público | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Público | Data/hora em ISO 8601, gerada no servidor. |
| `owner` | string | Público na listagem do próprio usuário | Identificador obtido do cabeçalho `X-User-Id`. |
| `storageName` | string | Interno | Nome seguro gerado para o arquivo no disco. Não é retornado pela API. |

O formato público de metadados contém `id`, `originalName`, `size`, `uploadedAt` e `owner`. `storageName` é mantido apenas na persistência em memória para localizar o arquivo; não deve ser aceito do cliente. Os metadados são únicos por `id`. A listagem é ordenada por `uploadedAt` decrescente; em caso de empate, por `id` crescente para garantir resultado determinístico.

### Persistência e ciclo de vida

- O arquivo é gravado localmente com um nome interno não derivado do nome original.
- O repositório em memória guarda os metadados e o nome interno correspondente.
- Se o upload ao disco falhar, nenhum registro de metadados é criado.
- Se o registro em memória falhar depois da gravação, a implementação deve tentar remover o arquivo recém-gravado para evitar órfãos.
- Reiniciar o processo remove os metadados da memória, mas não necessariamente os arquivos do disco. A limpeza de arquivos órfãos não faz parte desta versão.

## 6. Contratos de API

Todas as rotas abaixo são rotas do backend. No frontend, as chamadas usam o prefixo `/api` encaminhado pelo proxy do Vite. Todas exigem `X-User-Id`.

### Formato de erro

Respostas de erro JSON usam o formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descrição legível do erro."
  }
}
```

`message` é seguro para exibição e não contém stack trace ou caminho do filesystem. Códigos previstos: `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `DOCUMENT_NOT_FOUND` e `INTERNAL_ERROR`.

### POST /upload

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Entrada: `multipart/form-data`, com exatamente um arquivo no campo `file`.
- Limite: `MAX_FILE_SIZE_BYTES` (padrão 10 MiB).
- Sucesso: `201 Created`, `Content-Type: application/json`.
- Corpo de sucesso: metadados públicos do documento criado.

```json
{
  "id": "identificador-gerado",
  "originalName": "relatorio.pdf",
  "size": 24576,
  "uploadedAt": "2026-10-06T12:00:00.000Z",
  "owner": "usuario-123"
}
```

- `400 Bad Request`: cabeçalho ausente/vazio ou arquivo ausente/campo incorreto; código `VALIDATION_ERROR`.
- `413 Payload Too Large`: arquivo excede o limite; código `FILE_TOO_LARGE`.
- `500 Internal Server Error`: falha inesperada de gravação ou persistência; código `INTERNAL_ERROR`.

### GET /documents

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, `Content-Type: application/json`.
- Corpo de sucesso: array de metadados públicos pertencentes ao usuário, inclusive array vazio quando não houver documentos.
- Ordem: `uploadedAt` decrescente e, em empate, `id` crescente.
- `400 Bad Request`: cabeçalho ausente/vazio; código `VALIDATION_ERROR`.
- `500 Internal Server Error`: falha inesperada; código `INTERNAL_ERROR`.

Exemplo:

```json
[
  {
    "id": "identificador-gerado",
    "originalName": "relatorio.pdf",
    "size": 24576,
    "uploadedAt": "2026-10-06T12:00:00.000Z",
    "owner": "usuario-123"
  }
]
```

### GET /documents/:id/download

- Cabeçalho obrigatório: `X-User-Id: <identificador>`.
- Sucesso: `200 OK`, corpo binário do arquivo, `Content-Disposition: attachment` e nome de download baseado em `originalName` de forma segura.
- Não retornar caminho interno nem `storageName` ao cliente.
- `400 Bad Request`: cabeçalho ausente/vazio ou identificador inválido; código `VALIDATION_ERROR`.
- `404 Not Found`: documento inexistente, de outro usuário ou cujo arquivo local não esteja disponível; código `DOCUMENT_NOT_FOUND`.
- `500 Internal Server Error`: falha inesperada de leitura; código `INTERNAL_ERROR`.

## 7. Decisões arquiteturais

### Backend

Backend em Node.js + Express (CommonJS), organizado em quatro camadas com fluxo de dependência `routes -> controllers -> services -> repositories`:

- `routes/`: declara os endpoints e conecta middlewares aos controllers. O middleware `multer` com `diskStorage` integra o upload HTTP ao armazenamento local; a rota não concentra regras de negócio.
- `controllers/`: lê cabeçalhos, parâmetros e arquivo processado pelo middleware; chama o service e converte resultados/erros em status, cabeçalhos e respostas HTTP. Não implementa regras de propriedade nem persiste metadados.
- `services/`: aplica validações e regras de negócio, incluindo identidade do usuário, propriedade do documento e coordenação dos casos de uso. Não depende de Express nem de objetos de resposta HTTP.
- `repositories/`: fornece a persistência em memória dos metadados e acesso ao arquivo no armazenamento local, sem depender de controllers ou rotas. O nome interno é a referência para o arquivo, nunca um caminho vindo do cliente.

O diretório `STORAGE_DIR` deve existir ou ser criado pela infraestrutura antes do uso do upload. O acesso ao disco permanece local e não deve ser substituído por serviço externo. O middleware de upload deve tratar os erros do Multer no limite HTTP e traduzi-los para o contrato de erro definido nesta especificação.

### Frontend

- Aplicação React + Vite, com componentes funcionais e organização por `components/`, `pages/` e `services/`.
- Um módulo de serviço centraliza as chamadas `fetch` para o prefixo `/api`, incluindo `X-User-Id`, tratamento de erros e download binário.
- A interface deve apresentar estados de carregamento, lista vazia, sucesso e falha; não deve considerar uma resposta de erro como upload ou download concluído.
- Como não há autenticação nesta fase, a origem do identificador usado em `X-User-Id` é uma decisão de integração a resolver antes da interface funcional. Um valor fornecido pelo usuário não deve ser apresentado como autenticação segura.

### Tratamento transversal

- Erros são tratados nos limites HTTP e de filesystem, com respostas públicas estáveis e detalhes técnicos apenas nos logs do servidor.
- IDs e nomes internos são gerados no servidor. Nenhum nome de arquivo, identificador ou caminho enviado pelo cliente pode determinar o destino físico de gravação.
- Regras do service e contratos HTTP devem ser verificáveis com os testes nativos do Node já adotados pelo projeto.

## 8. Plano de execução

Etapas futuras de implementação, em ordem. Esta especificação não executa nem altera arquivos de backend ou frontend.

1. **Estabelecer configurações e contratos**: validar variáveis de ambiente e fechar a decisão de identidade de usuário necessária ao fluxo web. Aceite: valores padrão e inválidos definidos; contrato de erro e cabeçalho documentados.
2. **Implementar persistência local**: configurar armazenamento de arquivos com `multer`/`diskStorage` e repositório em memória para metadados. Aceite: arquivos recebem nomes internos seguros; metadados são consultáveis durante o processo; falhas não deixam registro parcial.
3. **Implementar regras de negócio**: criar casos de uso de upload, listagem e download, com validação de identidade e propriedade. Aceite: usuário lista apenas os próprios documentos e não baixa documentos alheios.
4. **Expor os contratos HTTP**: conectar rotas e controllers aos services, mapear erros e servir downloads como anexo. Aceite: status, cabeçalhos e corpos correspondem aos contratos desta especificação.
5. **Verificar o backend**: cobrir os casos de sucesso, validações, limite, isolamento por usuário, erros de filesystem e comportamento após reinício com `node:test`. Aceite: testes determinísticos e armazenamento temporário isolado nos testes.
6. **Integrar a interface web**: conectar upload, listagem e download à API pelo proxy `/api`; representar carregamento, vazio e erros. Aceite: os três fluxos usam o mesmo identificador operacional e exibem resultados coerentes com a API.
7. **Executar validação integrada**: verificar fluxo completo no ambiente local, configuração documentada e ausência de dependências externas de armazenamento. Aceite: upload seguido de listagem e download funciona no mesmo processo; reinício perde metadados conforme a limitação declarada.

## 9. Critérios gerais de aceite

- Upload grava o conteúdo somente no filesystem local e devolve metadados sem expor o nome interno.
- Listagem e download respeitam o dono associado a `X-User-Id`.
- Limite de upload e configurações podem ser alterados por ambiente, sem alterar código.
- Erros de validação, limite, ausência de documento e falhas internas seguem o contrato JSON; downloads bem-sucedidos retornam conteúdo binário como anexo.
- A arquitetura mantém a direção de dependência definida e deixa HTTP fora das regras de negócio.
- A documentação da interface não implica autenticação, persistência durável ou suporte a múltiplas instâncias.