# Casos, Causos e Outras Histórias

Plataforma web de relatos comunitários com feed estilo rede social, formulário de envio e painel de moderação.

## Tecnologias

- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL
- **Autenticação:** JWT
- **Hospedagem:** Render

## Estrutura do Projeto

```
.
├── backend/          # API Express + PostgreSQL
├── frontend/         # Aplicação React + Vite
├── docker-compose.yml
└── README.md
```

## Setup Local

### 1. Clonar e instalar dependências

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configurar variáveis de ambiente

Backend (`.env`):
```
DATABASE_URL=postgresql://user:password@localhost:5432/casos_db
JWT_SECRET=sua_chave_secreta_aqui
NODE_ENV=development
PORT=5000
```

Frontend (`.env.local`):
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Preparar banco de dados

```bash
cd backend
npm run db:setup
npm run db:seed  # (opcional, para dados de teste)
```

### 4. Rodar a aplicação

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

## Build para Produção

```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Rotas Principais

- `GET /` - Feed público
- `GET /enviar` - Formulário de colaboração
- `GET /admin` - Painel de moderação (protegido)

## API Endpoints

- `GET /api/stories` - Listar histórias aprovadas
- `POST /api/stories` - Enviar nova história
- `GET /api/stories/:id` - Detalhes da história
- `POST /api/admin/login` - Login do moderador
- `GET /api/admin/stories` - Listar todas as histórias (admin)
- `PUT /api/admin/stories/:id` - Atualizar status (admin)
- `DELETE /api/admin/stories/:id` - Deletar história (admin)

---

Data de início: Agosto 2026
