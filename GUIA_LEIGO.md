═══════════════════════════════════════════════════════════════════════════════
GUIA DO LEIGO - Casos, Causos e Outras Histórias
Do GitHub ao Deploy no Render (Passo a Passo Super Simples)
═══════════════════════════════════════════════════════════════════════════════

## COMO O MURAL FUNCIONA (PARA QUALQUER PESSOA)

Objetivo do mural:
- Guardar histórias, aprendizados e lembranças para que não se percam.
- Criar um espaço de memória coletiva que sirva de apoio para as próximas gerações.

Como participar:
- Ler histórias: qualquer pessoa pode ler.
- Curtir histórias: qualquer pessoa pode reagir com emojis, sem precisar de login.
- Enviar história: precisa entrar com usuário e senha.

Regras de convivência:
- Nesta fase, a interação do leitor é apenas por emojis (sem comentários em texto).
- A plataforma aplica limites automáticos para evitar vandalismo em sequência.
- Histórias enviadas passam por curadoria antes de aparecer no mural público.

## PASSO 1: CRIAR REPOSITÓRIO NO GITHUB

1. Acesse: https://www.github.com
2. Clique "Sign in" (entre com sua conta)
3. Clique no "+" no canto superior direito
4. Escolha "New repository"
5. Preencha:
   - Repository name: "casos-causos-historias"
   - Description: "Plataforma comunitária de histórias - Casos, Causos e Outras Histórias"
   - Escolha: "Public"
   - NÃO marque "Initialize with README"
6. Clique "Create repository"
7. Na tela seguinte, COPIE o link que aparece (algo como: git@github.com:seu_usuario/casos-causos-historias.git)

═══════════════════════════════════════════════════════════════════════════════

## PASSO 2: INSTALAR GIT NO SEU COMPUTADOR

1. Baixe em: https://git-scm.com/download/win
2. Execute o arquivo
3. Clique "Next" em tudo até terminar
4. Abra PowerShell (Windows + digita "powershell")
5. Digite ISTO (substitua pelos seus dados):

   git config --global user.name "Seu Nome"
   git config --global user.email "seu@email.com"

6. Pronto!

═══════════════════════════════════════════════════════════════════════════════

## PASSO 3: ENVIAR PROJETO PARA GITHUB

1. Abra PowerShell na pasta do projeto:
   C:\Users\celio\OneDrive\Área de Trabalho\Casos, Causos e Outras Historias

2. Digite CADA LINHA (uma por vez):

   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin SEU_LINK_GITHUB
   git push -u origin main

   (Troque SEU_LINK_GITHUB pelo link que você copiou no PASSO 1)

3. Pronto! Seu projeto "Casos, Causos e Outras Histórias" está no GitHub!

═══════════════════════════════════════════════════════════════════════════════

## PASSO 4: INSTALAR PYTHON E NODE

### Para Python:
1. Acesse: https://www.python.org
2. Clique em "Downloads"
3. Escolha versão 3.11 ou 3.12
4. Execute o instalador
5. IMPORTANTE: Marque "Add Python to PATH"
6. Clique "Install Now"

### Para Node.js:
1. Acesse: https://nodejs.org
2. Clique em "Download" (versão LTS)
3. Execute o instalador
4. Clique "Next" até terminar

═══════════════════════════════════════════════════════════════════════════════

## PASSO 5: INSTALAR DEPENDÊNCIAS

### Backend:
1. Abra PowerShell na pasta "backend"
2. Digite:

   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt

   (Leva alguns minutos...)

### Frontend:
1. Abra PowerShell na pasta "frontend"
2. Digite:

   npm install

   (Leva alguns minutos...)

═══════════════════════════════════════════════════════════════════════════════

## PASSO 6: TESTAR LOCALMENTE

### Terminal 1 (Backend):
1. Na pasta "backend"
2. Com (venv) ativado, digite:

   uvicorn app.main:app --reload

3. Você vai ver: "Uvicorn running on http://127.0.0.1:8000"

### Terminal 2 (Frontend):
1. Na pasta "frontend"
2. Digite:

   npm run dev

3. Você vai ver: "Local: http://localhost:5173"

### Teste:
1. Abra navegador
2. Vá em: http://localhost:5173
3. Veja funcionar!

═══════════════════════════════════════════════════════════════════════════════

## PASSO 7: FAZER DEPLOY NO RENDER

### 7.1 - Criar conta no Render:
1. Acesse: https://render.com
2. Clique "Sign up"
3. Escolha "Continue with GitHub"
4. Autorize

### 7.2 - Criar serviço de PostgreSQL:
1. Clique "New +"
2. Escolha "PostgreSQL"
3. Escolha plano pago (~R/mês)
4. Clique "Create"
5. COPIE a connection string (URL)

### 7.3 - Criar Web Service para Backend:
1. Clique "New +"
2. Escolha "Web Service"
3. Conecte seu repositório GitHub "casos-causos-historias"
4. Preencha:
   - Name: "casos-causos-historias-backend"
   - Root Directory: "backend"
   - Runtime: "Python 3"
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn app.main:app --host 0.0.0.0 --port 8000

5. Clique em "Advanced"
6. Em "Environment Variables", adicione:
   - DATABASE_URL: (cole a URL do PostgreSQL que você copiou)
   - JWT_SECRET: (qualquer texto longo e seguro)

7. Clique "Create Web Service"
8. Render vai fazer o deploy (leva 5-10 minutos)

### 7.4 - Seu site está ao vivo!
- Backend: https://seus-casos-causos-historias-backend.onrender.com
- Frontend: (faça mesmo para frontend se quiser)

═══════════════════════════════════════════════════════════════════════════════

## DE AGORA EM DIANTE:

Cada vez que você quer atualizar o site:

1. Faça mudanças no código
2. No PowerShell, digite:

   git add .
   git commit -m "Descrição da mudança"
   git push origin main

3. Render vai automaticamente fazer deploy da nova versão!

═══════════════════════════════════════════════════════════════════════════════

## DÚVIDAS COMUNS?

Tem dúvida em algum passo? Me avisa! Vou te guiar passo a passo.

═══════════════════════════════════════════════════════════════════════════════
