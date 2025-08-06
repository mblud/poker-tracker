from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from enum import Enum
import uuid
from datetime import datetime

app = FastAPI(title="Poker Tracker API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums for validation
class PaymentMethod(str, Enum):
    CASH = "Cash"
    VENMO = "Venmo"
    APPLE_PAY = "Apple Pay"
    ZELLE = "Zelle"
    OTHER = "Other"

class TransactionType(str, Enum):
    BUY_IN = "buy-in"
    REBUY = "rebuy"

# Data models
class PlayerCreate(BaseModel):
    name: str

class Payment(BaseModel):
    id: str
    amount: float
    method: PaymentMethod
    type: TransactionType
    dealer_fee_applied: bool
    timestamp: datetime

class BuyInRequest(BaseModel):
    amount: float
    method: PaymentMethod

class RebuyRequest(BaseModel):
    player_name: str
    amount: float
    method: PaymentMethod

class Player(BaseModel):
    id: str
    name: str
    total: float = 0.0
    payments: List[Payment] = []
    created_at: datetime

# Game settings
DEALER_FEE = 35.0

# In-memory storage
players_db = {}

@app.get("/")
def root():
    return {"message": "🃏 Poker Tracker API is running!"}

@app.get("/api/test")
def test():
    return {"status": "success", "message": "Backend connected!"}

@app.post("/api/players", response_model=Player)
def create_player(player_data: PlayerCreate):
    player_id = str(uuid.uuid4())
    new_player = Player(
        id=player_id,
        name=player_data.name,
        created_at=datetime.now()
    )
    players_db[player_id] = new_player.dict()
    return new_player

@app.get("/api/players", response_model=List[Player])
def get_players():
    return list(players_db.values())

@app.post("/api/players/{player_id}/buyin", response_model=Player)
def add_buyin(player_id: str, buyin_data: BuyInRequest):
    if player_id not in players_db:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = players_db[player_id]
    
    # Determine if this is first buy-in (apply dealer fee)
    has_previous_buyin = any(
        payment["type"] == TransactionType.BUY_IN 
        for payment in player["payments"]
    )
    
    # Create payment record
    payment_id = str(uuid.uuid4())
    dealer_fee_applied = not has_previous_buyin  # Apply fee only on first buy-in
    amount_to_pot = buyin_data.amount - (DEALER_FEE if dealer_fee_applied else 0)
    
    new_payment = Payment(
        id=payment_id,
        amount=buyin_data.amount,
        method=buyin_data.method,
        type=TransactionType.BUY_IN,
        dealer_fee_applied=dealer_fee_applied,
        timestamp=datetime.now()
    )
    
    # Update player
    player["payments"].append(new_payment.dict())
    player["total"] = sum(
        payment["amount"] - (DEALER_FEE if payment["dealer_fee_applied"] else 0)
        for payment in player["payments"]
    )
    
    players_db[player_id] = player
    return Player(**player)

@app.get("/api/game-stats")
def get_game_stats():
    total_pot = sum(player["total"] for player in players_db.values())
    total_dealer_fees = sum(
        DEALER_FEE for player in players_db.values()
        for payment in player["payments"]
        if payment["dealer_fee_applied"]
    )
    total_buy_ins = sum(
        payment["amount"] for player in players_db.values()
        for payment in player["payments"]
    )
    
    # Calculate payment method breakdown
    payment_method_totals = {}
    for player in players_db.values():
        for payment in player["payments"]:
            method = payment["method"]
            amount = payment["amount"]
            if method not in payment_method_totals:
                payment_method_totals[method] = {"total": 0, "count": 0}
            payment_method_totals[method]["total"] += amount
            payment_method_totals[method]["count"] += 1
    
    return {
        "total_pot": total_pot,
        "total_dealer_fees": total_dealer_fees,
        "total_buy_ins": total_buy_ins,
        "player_count": len(players_db),
        "payment_method_breakdown": payment_method_totals
    }

@app.get("/api/players/{player_id}/payment-summary")
def get_player_payment_summary(player_id: str):
    if player_id not in players_db:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = players_db[player_id]
    payment_summary = {}
    
    for payment in player["payments"]:
        method = payment["method"]
        amount = payment["amount"]
        if method not in payment_summary:
            payment_summary[method] = {"total": 0, "count": 0}
        payment_summary[method]["total"] += amount
        payment_summary[method]["count"] += 1
    
    return {
        "player_id": player_id,
        "player_name": player["name"],
        "payment_summary": payment_summary,
        "total_in_pot": player["total"]
    }

@app.post("/api/rebuys")
def process_rebuy(rebuy_data: RebuyRequest):
    # Try to find existing player by name
    player_id = None
    for pid, player in players_db.items():
        if player["name"].lower() == rebuy_data.player_name.lower():
            player_id = pid
            break
    
    # If player doesn't exist, CREATE THEM automatically
    if not player_id:
        player_id = str(uuid.uuid4())
        new_player = Player(
            id=player_id,
            name=rebuy_data.player_name,
            created_at=datetime.now()
        )
        players_db[player_id] = new_player.dict()
        player = players_db[player_id]
        is_new_player = True
    else:
        player = players_db[player_id]
        is_new_player = False
    
    # SMART DETECTION: Check if this is their first transaction
    has_any_previous_transactions = len(player["payments"]) > 0
    
    # If no previous transactions, this is a buy-in (apply dealer fee)
    # If they have previous transactions, this is a rebuy (no dealer fee)
    is_first_buyin = not has_any_previous_transactions
    transaction_type = TransactionType.BUY_IN if is_first_buyin else TransactionType.REBUY
    
    payment_id = str(uuid.uuid4())
    new_payment = Payment(
        id=payment_id,
        amount=rebuy_data.amount,
        method=rebuy_data.method,
        type=transaction_type,
        dealer_fee_applied=is_first_buyin,
        timestamp=datetime.now()
    )
    
    # Update player
    player["payments"].append(new_payment.dict())
    player["total"] = sum(
        payment["amount"] - (DEALER_FEE if payment["dealer_fee_applied"] else 0)
        for payment in player["payments"]
    )
    
    players_db[player_id] = player
    
    # Return helpful message
    if is_new_player:
        message = f"Welcome {player['name']}! First buy-in processed (${DEALER_FEE} dealer fee applied)"
    else:
        transaction_word = "buy-in" if is_first_buyin else "rebuy"
        fee_message = f" (${DEALER_FEE} dealer fee applied)" if is_first_buyin else " (no dealer fee)"
        message = f"{transaction_word.title()} processed for {player['name']}{fee_message}"
    
    return {
        "success": True, 
        "message": message,
        "is_new_player": is_new_player,
        "is_first_buyin": is_first_buyin,
        "dealer_fee_applied": is_first_buyin,
        "amount_to_pot": rebuy_data.amount - (DEALER_FEE if is_first_buyin else 0)
    }

@app.get("/api/rebuys/recent")
def get_recent_rebuys():
    recent_rebuys = []
    for player in players_db.values():
        for payment in player["payments"]:
            if payment["type"] == TransactionType.REBUY:
                recent_rebuys.append({
                    "player_name": player["name"],
                    "amount": payment["amount"],
                    "method": payment["method"],
                    "timestamp": payment["timestamp"]
                })
    
    recent_rebuys.sort(key=lambda x: x["timestamp"], reverse=True)
    return recent_rebuys[:5]
@app.delete("/api/players/{player_id}/payments/{payment_id}")
def delete_payment(player_id: str, payment_id: str):
    if player_id not in players_db:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = players_db[player_id]
    
    # Find and remove the payment
    payment_to_remove = None
    for i, payment in enumerate(player["payments"]):
        if payment["id"] == payment_id:
            payment_to_remove = player["payments"].pop(i)
            break
    
    if not payment_to_remove:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Recalculate player total
    player["total"] = sum(
        payment["amount"] - (DEALER_FEE if payment["dealer_fee_applied"] else 0)
        for payment in player["payments"]
    )
    
    players_db[player_id] = player
    return {"success": True, "message": f"Removed ${payment_to_remove['amount']} {payment_to_remove['type']} for {player['name']}"}

@app.get("/api/transactions/recent")
def get_recent_transactions():
    """Get all recent transactions across all players for admin view"""
    all_transactions = []
    for player in players_db.values():
        for payment in player["payments"]:
            all_transactions.append({
                "id": payment["id"],
                "player_id": player["id"],
                "player_name": player["name"],
                "amount": payment["amount"],
                "method": payment["method"],
                "type": payment["type"],
                "dealer_fee_applied": payment["dealer_fee_applied"],
                "timestamp": payment["timestamp"]
            })
    
    # Sort by timestamp, most recent first
    all_transactions.sort(key=lambda x: x["timestamp"], reverse=True)
    return all_transactions[:20]  # Return last 20 transactions
@app.delete("/api/players/{player_id}")
def delete_player(player_id: str):
    if player_id not in players_db:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = players_db[player_id]
    player_name = player["name"]
    player_total = player["total"]
    transaction_count = len(player["payments"])
    
    # Remove the player
    del players_db[player_id]
    
    return {
        "success": True, 
        "message": f"Deleted {player_name} (${player_total} removed from pot, {transaction_count} transactions deleted)"
    }