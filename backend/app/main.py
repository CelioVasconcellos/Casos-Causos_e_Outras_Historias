from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import stories, users, admin

# Criar tabelas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Casos, Cousos e Outras Histórias",
    description="Plataforma comunitária de narrativas",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(stories.router)
app.include_router(users.router)
app.include_router(admin.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Casos, Cousos e Outras Histórias API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
