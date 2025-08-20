from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class CompanyConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rif: str
    address: str
    phone: str
    logo: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyConfigCreate(BaseModel):
    name: str
    rif: str
    address: str
    phone: str

class Client(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rif_ci: str
    address: str
    payment_condition: str
    last_note_number: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ClientCreate(BaseModel):
    name: str
    rif_ci: str
    address: str
    payment_condition: str

class DeliveryLocation(BaseModel):
    address: str
    contact_person: str
    phone: str

class Product(BaseModel):
    description: str
    package_unit: str
    package_quantity: int
    sale_unit: str
    sale_quantity: int

class DeliveryNote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    note_number: str
    issue_date: datetime
    client_id: str
    client_info: Client
    delivery_location: DeliveryLocation
    products: List[Product]
    transport: Optional[str] = ""
    received_by_name: Optional[str] = ""
    received_by_cedula: Optional[str] = ""
    received_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeliveryNoteCreate(BaseModel):
    client_id: str
    delivery_location: DeliveryLocation
    products: List[Product]
    transport: Optional[str] = ""

# Company Configuration Routes
@api_router.post("/company-config", response_model=CompanyConfig)
async def create_company_config(config: CompanyConfigCreate):
    # Delete existing config (only one company config allowed)
    await db.company_config.delete_many({})
    
    config_dict = config.dict()
    config_obj = CompanyConfig(**config_dict)
    await db.company_config.insert_one(config_obj.dict())
    return config_obj

@api_router.get("/company-config", response_model=Optional[CompanyConfig])
async def get_company_config():
    config = await db.company_config.find_one()
    if config:
        return CompanyConfig(**config)
    return None

@api_router.post("/company-config/logo")
async def upload_logo(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    
    content = await file.read()
    encoded_logo = base64.b64encode(content).decode('utf-8')
    logo_data_url = f"data:{file.content_type};base64,{encoded_logo}"
    
    # Update company config with logo
    await db.company_config.update_one(
        {},
        {"$set": {"logo": logo_data_url}}
    )
    
    return {"message": "Logo subido exitosamente", "logo": logo_data_url}

# Client Routes
@api_router.post("/clients", response_model=Client)
async def create_client(client: ClientCreate):
    client_dict = client.dict()
    client_obj = Client(**client_dict)
    await db.clients.insert_one(client_obj.dict())
    return client_obj

@api_router.get("/clients", response_model=List[Client])
async def get_clients():
    clients = await db.clients.find().to_list(1000)
    return [Client(**client) for client in clients]

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return Client(**client)

# Delivery Notes Routes
@api_router.post("/delivery-notes", response_model=DeliveryNote)
async def create_delivery_note(note: DeliveryNoteCreate):
    # Get client info
    client = await db.clients.find_one({"id": note.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client_obj = Client(**client)
    
    # Generate note number
    new_note_number = client_obj.last_note_number + 1
    note_number = f"{client_obj.rif_ci}-{new_note_number:03d}"
    
    # Update client's last note number
    await db.clients.update_one(
        {"id": note.client_id},
        {"$set": {"last_note_number": new_note_number}}
    )
    
    # Create delivery note
    note_dict = note.dict()
    note_dict["note_number"] = note_number
    note_dict["issue_date"] = datetime.now(timezone.utc)
    note_dict["client_info"] = client_obj.dict()
    
    delivery_note = DeliveryNote(**note_dict)
    await db.delivery_notes.insert_one(delivery_note.dict())
    
    return delivery_note

@api_router.get("/delivery-notes", response_model=List[DeliveryNote])
async def get_delivery_notes():
    notes = await db.delivery_notes.find().sort("created_at", -1).to_list(1000)
    return [DeliveryNote(**note) for note in notes]

@api_router.get("/delivery-notes/{note_id}", response_model=DeliveryNote)
async def get_delivery_note(note_id: str):
    note = await db.delivery_notes.find_one({"id": note_id})
    if not note:
        raise HTTPException(status_code=404, detail="Nota de entrega no encontrada")
    return DeliveryNote(**note)

@api_router.put("/delivery-notes/{note_id}", response_model=DeliveryNote)
async def update_delivery_note(note_id: str, note_update: DeliveryNoteCreate):
    existing_note = await db.delivery_notes.find_one({"id": note_id})
    if not existing_note:
        raise HTTPException(status_code=404, detail="Nota de entrega no encontrada")
    
    # Get client info
    client = await db.clients.find_one({"id": note_update.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    client_obj = Client(**client)
    
    # Update delivery note
    update_dict = note_update.dict()
    update_dict["client_info"] = client_obj.dict()
    
    await db.delivery_notes.update_one(
        {"id": note_id},
        {"$set": update_dict}
    )
    
    updated_note = await db.delivery_notes.find_one({"id": note_id})
    return DeliveryNote(**updated_note)

@api_router.delete("/delivery-notes/{note_id}")
async def delete_delivery_note(note_id: str):
    result = await db.delivery_notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Nota de entrega no encontrada")
    return {"message": "Nota de entrega eliminada exitosamente"}

# Statistics Route
@api_router.get("/statistics")
async def get_statistics():
    total_notes = await db.delivery_notes.count_documents({})
    total_clients = await db.clients.count_documents({})
    
    # Get notes by client
    pipeline = [
        {"$group": {"_id": "$client_info.name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    notes_by_client = await db.delivery_notes.aggregate(pipeline).to_list(None)
    
    return {
        "total_notes": total_notes,
        "total_clients": total_clients,
        "notes_by_client": notes_by_client
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()