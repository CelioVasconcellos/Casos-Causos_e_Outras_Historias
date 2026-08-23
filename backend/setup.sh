#!/bin/bash
# Setup para backend

echo "🚀 Configurando Backend..."

# Criar venv
python -m venv venv
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Criar .env
cp .env.example .env
echo "⚠️ Edite .env com suas variáveis de banco de dados!"

echo "✅ Backend pronto! Execute: uvicorn app.main:app --reload"
