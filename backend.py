import os
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import firebase_admin
from firebase_admin import credentials, firestore, auth

# Inicializa o Firebase Admin usando a variável de ambiente segura do Render
if not firebase_admin._apps:
    firebase_key_json = os.environ.get("FIREBASE_KEY_JSON")
    if firebase_key_json:
        cred_dict = json.loads(firebase_key_json)
        cred = credentials.Certificate(cred_dict)
        firebase_admin.initialize_app(cred)
    else:
        cred = credentials.Certificate("serviceAccountKey.json")
        firebase_admin.initialize_app(cred)

db = firestore.client()
security = HTTPBearer()

app = FastAPI()

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SyncRequest(BaseModel):
    dados: dict

# Rota para SALVAR os dados do usuário logado
@app.post("/api/sync")
def sync_data(
    payload: SyncRequest, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        user_email = decoded_token.get("email")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="E-mail não encontrado no token.")
            
        doc_ref = db.collection("usuarios").document(user_email)
        doc_ref.set({"dados": payload.dados})
        
        return {"status": "sucesso", "email": user_email}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro de autenticação: {str(e)}")

# Rota para PUXAR os dados do usuário logado
@app.get("/api/dados")
def get_dados(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        decoded_token = auth.verify_id_token(token)
        user_email = decoded_token.get("email")
        
        if not user_email:
            raise HTTPException(status_code=400, detail="E-mail não encontrado no token.")
            
        doc_ref = db.collection("usuarios").document(user_email)
        doc = doc_ref.get()
        
        if doc.exists:
            return {"dados": doc.to_dict().get("dados", {})}
        else:
            return {"dados": {}}
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Erro de autenticação: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "API Brigaussie rodando com segurança e Firebase Auth!"}