# Casos, Causos e Outras Histórias

Plataforma comunitária para compartilhamento de histórias e narrativas em formato de mural digital.

<!-- Teste de auto-deploy Render: 2026-09-01 -->

## 🎯 Visão

Um espaço acolhedor onde membros da comunidade podem compartilhar suas histórias, experiências e aprendizados em um ambiente moderado e respeitoso.

## 🛠 Tecnologias

- **Backend:** Python + FastAPI
- **Frontend:** React + Vite + Tailwind CSS
- **Database:** PostgreSQL
- **Autenticação:** JWT
- **Hospedagem:** Render
- **Containerização:** Docker

## 📋 Requisitos

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose (opcional)
- PostgreSQL 15+ (ou usar Docker)

## 🚀 Setup Local (Sem Docker)

### 1. Backend

\\\ash
cd backend

# Criar ambiente virtual
python -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Configurar .env
cp .env.example .env
# Edite .env com suas credenciais de banco de dados

# Rodar
uvicorn app.main:app --reload
# Backend disponível em http://localhost:8000
\\\

### 2. Frontend

\\\ash
cd frontend

# Instalar dependências
npm install

# Rodar
npm run dev
# Frontend disponível em http://localhost:5173
\\\

## 🐳 Setup com Docker

\\\ash
docker-compose up
\\\

Isso inicia:
- PostgreSQL em localhost:5432
- Backend em http://localhost:8000
- Frontend em http://localhost:5173

## 📚 Rotas Principais

### Público (sem login)
- GET / - Feed de histórias aprovadas
- GET /api/stories - Listar histórias (com filtro e busca)
- GET /api/stories/{id} - Detalhes de uma história

### Autenticação
- POST /api/auth/register - Criar conta
- POST /api/auth/login - Entrar

### Usuário Autenticado
- POST /api/stories - Enviar nova história

### Admin (moderador)
- GET /api/admin/stories - Listar todas (com filtro por status)
- PUT /api/admin/stories/{id} - Atualizar status (aprovar/rejeitar)
- DELETE /api/admin/stories/{id} - Deletar história

## 📖 Fluxo de Uso

### Para Usuários Normais
1. Acessam / e veem histórias aprovadas (público)
2. Clicam em "Cadastrar" e criam conta
3. Fazem login
4. Acessam /enviar e compartilham sua história
5. História vai para "Pendente" (aguarda moderação)

### Para Moderador
1. Acessa /admin com credenciais admin
2. Vê histórias em "Pendente"
3. Lê, pode editar se necessário
4. Aprova (publica) ou rejeita
5. Dashboard mostra estatísticas

## 🔐 Configuração de Admin

Para criar um moderador:

\\\python
# Execute no backend (Python shell ou script)
from app.database import SessionLocal
from app.models import User, AdminUser
from app.auth import get_password_hash

db = SessionLocal()
admin_user = User(
    username="seu_username",
    password_hash=get_password_hash("sua_senha")
)
db.add(admin_user)
db.commit()

admin = AdminUser(user_id=admin_user.id, role="admin")
db.add(admin)
db.commit()
\\\

## 📤 Deploy no Render

1. Crie repositório no GitHub
2. Conecte no Render (Web Service)
3. Configure variáveis de ambiente:
   - \DATABASE_URL\ - Sua URL PostgreSQL
   - \JWT_SECRET\ - Chave segura para JWT
   - \FRONTEND_URL\ - URL do frontend
4. Render faz deploy automático a cada push

## 🌍 Variáveis de Ambiente

### Backend (.env)
\\\
DATABASE_URL=postgresql://user:password@localhost:5432/casos_db
JWT_SECRET=sua_chave_muito_segura
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
MAX_UPLOAD_SIZE=5242880
UPLOAD_DIR=uploads
\\\

### Frontend (.env.local)
\\\
VITE_API_URL=http://localhost:8000/api
\\\

## 📁 Estrutura do Projeto

\\\
.
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app
│   │   ├── database.py       # PostgreSQL
│   │   ├── models.py         # Modelos de dados
│   │   ├── schemas.py        # Validação Pydantic
│   │   ├── auth.py           # Autenticação JWT
│   │   ├── routes/
│   │   │   ├── stories.py    # Stories públicas
│   │   │   ├── users.py      # Login/Register
│   │   │   └── admin.py      # Painel admin
│   │   └── utils/
│   │       └── file_handler.py # Upload de mídia
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── setup.sh
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Componentes React
│   │   ├── pages/            # Páginas
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── Dockerfile
│   └── .env.example
│
├── docker-compose.yml
├── .gitignore
└── README.md
\\\

## 🚀 Próximos Passos

1. Configurar banco de dados
2. Criar conta admin
3. Testar fluxo completo
4. Fazer push para GitHub
5. Conectar e fazer deploy no Render

## 💡 Dicas

- Sempre use HTTPS em produção
- Mude JWT_SECRET para algo bem seguro
- Faça backup regular do banco de dados
- Monitore logs no Render

## 📞 Suporte

Para dúvidas sobre a plataforma, consulte a documentação completa em /memories/repo/casos-projeto-completo.md

---

**Versão:** 1.0.0  
**Última atualização:** Agosto 2026
