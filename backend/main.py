
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client

# Load credentials from backend/backend/.env
load_dotenv(Path(__file__).resolve().parent / "backend" / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing Supabase credentials in .env")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="CU FDE2 Kanban API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Status = Literal["todo", "doing", "done"]


class CardCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    status: Status = "todo"


class Card(CardCreate):
    id: int


@app.get("/")
def home():
    return {"message": "CU FDE2 Kanban API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/cards", response_model=list[Card])
def list_cards():
    try:
        result = (
            supabase.table("cards")
            .select("id, title, status")
            .order("id")
            .execute()
        )
        return result.data
    except Exception:
        raise HTTPException(
            status_code=500, detail="Could not load cards from database"
        )


@app.post("/cards", response_model=Card, status_code=201)
def create_card(data: CardCreate):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    try:
        result = (
            supabase.table("cards")
            .insert({"title": title, "status": data.status})
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=500, detail="Card was not returned by database"
            )
        return result.data[0]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="Could not create card in database"
        )


@app.patch("/cards/{card_id}", response_model=Card)
def update_card(card_id: int, data: CardCreate):
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title cannot be empty")

    try:
        result = (
            supabase.table("cards")
            .update({"title": title, "status": data.status})
            .eq("id", card_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(status_code=404, detail="Card not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="Could not update card in database"
        )


@app.delete("/cards/{card_id}", status_code=204)
def delete_card(card_id: int):
    try:
        existing = (
            supabase.table("cards")
            .select("id")
            .eq("id", card_id)
            .execute()
        )
        if not existing.data:
            raise HTTPException(status_code=404, detail="Card not found")

        supabase.table("cards").delete().eq("id", card_id).execute()
        return Response(status_code=204)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=500, detail="Could not delete card from database"
        )
