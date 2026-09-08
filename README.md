# Casos, Causos e Outras Histórias

Mural digital para preservar memórias comunitárias. O público pode ler histórias e reagir com emojis sem login. O envio de novas histórias exige conta e passa por moderação.

## Objetivo do Mural

- Preservar histórias e testemunhos para fortalecer a memória coletiva.
- Criar um acervo acessível para diferentes gerações.
- Estimular participação respeitosa com baixa barreira de entrada.

## Regras de Participação

- Ler histórias: aberto para todos.
- Reagir com emojis: aberto para todos, sem comentários em texto nesta fase.
- Enviar história: somente usuários autenticados.
- Uso abusivo de reações pode gerar limitação temporária.

## Tecnologias

- Backend: Python + FastAPI + SQLAlchemy
- Frontend: React + Vite + Tailwind CSS
- Banco: SQLite local e PostgreSQL em produção
- Autenticação: JWT

## Estrutura

```text
.
├── backend/
│   ├── app/
│   ├── migrations/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   └── package.json
├── docker-compose.yml
└── README.md
```

## Setup Local (Sem Docker)

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend em http://127.0.0.1:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend em http://localhost:5173

## Endpoints Principais

- GET /api/stories
- GET /api/stories/{story_id}
- POST /api/stories (auth)
- PUT /api/stories/{story_id} (auth, correção)
- GET /api/stories/{story_id}/reactions
- GET /api/stories/reactions/bulk
- POST /api/stories/{story_id}/reactions
- POST /api/stats/visit
- GET /api/stats/summary
- POST /api/auth/register
- POST /api/auth/login
- POST /api/admin/login
- GET /api/admin/stories

## Contadores da Plataforma

- Visitantes únicos sem login: contado por identidade técnica anônima (cookie + origem parcial).
- Usuários logados ativos: contado por janela de atividade de 15 minutos.
- Visitas únicas por dia: série diária com janelas de 7 e 30 dias para acompanhar tendência.

## Observações

- Uploads são servidos em /uploads (ou no bucket S3/R2 quando configurado).
- O backend cria tabelas automaticamente ao iniciar.
- Para ambientes existentes, aplique as migrations da pasta backend/migrations.
- Para produção em HTTPS, configure COOKIE_SECURE=true para cookies técnicos.

## Deploy Consolidado (1 serviço no Render)

O backend serve o frontend buildado no mesmo processo, dispensando um serviço Node separado. No Render, configure um único Web Service Python com Root Directory `backend` e:

```text
Build Command: cd ../frontend && npm install && npm run build && rm -rf ../backend/frontend_dist && cp -r dist ../backend/frontend_dist && cd ../backend && pip install -r requirements.txt
Start Command: uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

O passo de copiar o build para dentro de `backend/frontend_dist` é necessário porque, com Root Directory definido, o Render só leva para produção o conteúdo dessa pasta.

Com o frontend e o backend na mesma origem, `CORS_ORIGINS`/`FRONTEND_URL` deixam de ser necessários em produção (podem ficar vazios).

## Configuração de Produção (Obrigatória)

Antes de publicar, configure no backend:

- JWT_SECRET com valor forte e exclusivo.
- COOKIE_SECURE=true em ambiente HTTPS.
- DATABASE_URL apontando para o PostgreSQL de produção.
- S3_ENDPOINT_URL/S3_ACCESS_KEY/S3_SECRET_KEY/S3_BUCKET/S3_PUBLIC_URL para mídias (Cloudflare R2).

Exemplo:

```env
JWT_SECRET=troque_por_um_valor_forte
COOKIE_SECURE=true
APP_ENV=production
```

## Anti-abuso em Produção

- O limite de reações usa Redis quando `REDIS_URL` está configurado (opcional).
- Sem Redis, o sistema usa fallback local em memória. Como histórias e comentários já passam por moderação antes de publicar, o Redis é dispensável para uma unica instância; ele so ajuda a distribuir o rate limit de reações entre múltiplas instâncias.


## Verificação Rápida dos Endpoints

Com o backend rodando em `http://127.0.0.1:8000`, execute:

```powershell
Set-Location backend
./scripts/verificar-endpoints.ps1
```

O script valida healthcheck, contadores de visita/presença e endpoint de reações em lote.

Para validar também o limite anti-abuso de reações (HTTP 429):

```powershell
Set-Location backend
./scripts/verificar-endpoints.ps1 -TestAntiAbuse
```
