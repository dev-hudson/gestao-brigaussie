from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any
import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

# Inicialização do Firebase Admin SDK
# Se houver uma variável de ambiente com a chave (ideal para o Render), usa ela. 
# Caso contrário, procura o arquivo local 'serviceAccountKey.json'.
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

app = FastAPI(title="Backend - Precificador Confeitaria (Firebase)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SyncData(BaseModel):
    email: str
    dados: Dict[str, Any]

@app.post("/api/sync")
def salvar_nuvem(sync_data: SyncData):
    try:
        # Usa o e-mail como ID do documento na coleção 'usuarios'
        doc_ref = db.collection("usuarios").document(sync_data.email)
        doc_ref.set({"dados": sync_data.dados})
        return {"status": "success", "message": "Dados salvos na nuvem com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/sync/{email}")
def carregar_nuvem(email: str):
    try:
        doc_ref = db.collection("usuarios").document(email)
        doc = doc_ref.get()
        if doc.exists:
            return {"status": "success", "dados": doc.to_dict().get("dados")}
        raise HTTPException(status_code=404, detail="Nenhum backup encontrado para este e-mail.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))