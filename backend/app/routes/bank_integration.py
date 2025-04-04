import secrets
from typing import List, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.database import get_db
from backend.app.models.user import User
from backend.app.models.transaction import BankConnection, Transaction, Category
from backend.app.routes.auth import get_current_user
from backend.app.services.truelayer_service import TrueLayerService
from pydantic import BaseModel

router = APIRouter()
truelayer_service = TrueLayerService()


class BankConnectionResponse(BaseModel):
    id: int
    provider_name: str
    created_at: datetime

    class Config:
        orm_mode = True


@router.get("/auth-link")
async def get_auth_link(current_user: User = Depends(get_current_user)):
    """Generate authentication link for connecting a bank account"""
    state = secrets.token_urlsafe(32)
    auth_link = truelayer_service.generate_auth_link(state=state)
    return {"auth_link": auth_link, "state": state}


@router.get("/callback")
async def truelayer_callback(
    code: str = Query(...),
    state: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Handle callback from TrueLayer after user authorizes access"""
    try:
        print(f"Received callback with code: {code[:5]}... and state: {state[:5]}...")
        
        # Exchange code for access token
        token_data = truelayer_service.exchange_code_for_token(code)
        print("Successfully exchanged code for token")
        
        # Get user accounts
        accounts = truelayer_service.get_accounts(token_data["access_token"])
        print(f"Retrieved {len(accounts)} accounts")

        if not accounts:
            raise HTTPException(status_code=400, detail="No accounts found")

        # Create bank connection record
        expires_at = datetime.utcnow() + timedelta(seconds=token_data["expires_in"])
        connection = BankConnection(
            user_id=current_user.id,
            provider_id=accounts[0].get("provider", {}).get("provider_id", "unknown"),
            provider_name=accounts[0]
            .get("provider", {})
            .get("display_name", "Unknown Bank"),
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            token_expires_at=expires_at,
        )
        db.add(connection)
        db.flush()

        # Import transactions for all accounts
        transactions_imported = 0
        for account_data in accounts:
            # Fetch transactions
            transactions = truelayer_service.get_account_transactions(
                token_data["access_token"], account_data["account_id"]
            )

            # Import transactions
            for tx_data in transactions:
                # Check if transaction already exists
                existing_tx = (
                    db.query(Transaction)
                    .filter(
                        Transaction.bank_transaction_id == tx_data["transaction_id"]
                    )
                    .first()
                )

                if not existing_tx:
                    tx_formatted = truelayer_service.format_transaction(
                        tx_data, current_user.id, connection.id
                    )
                    transaction = Transaction(**tx_formatted)
                    db.add(transaction)
                    transactions_imported += 1

        db.commit()
        return {
            "message": "Bank account connected successfully",
            "transactions_imported": transactions_imported,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error connecting bank account: {str(e)}"
        )


@router.get("/connections", response_model=List[BankConnectionResponse])
async def get_connections(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get all bank connections for the current user"""
    connections = (
        db.query(BankConnection).filter(BankConnection.user_id == current_user.id).all()
    )
    return connections


@router.post("/refresh/{connection_id}")
async def refresh_transactions(
    connection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Refresh transactions for a specific bank connection"""
    connection = (
        db.query(BankConnection)
        .filter(
            BankConnection.id == connection_id,
            BankConnection.user_id == current_user.id,
        )
        .first()
    )

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Check if token is expired
    if connection.token_expires_at <= datetime.utcnow():
        # Refresh token
        try:
            token_data = truelayer_service.refresh_access_token(
                connection.refresh_token
            )
            connection.access_token = token_data["access_token"]
            connection.refresh_token = token_data["refresh_token"]
            connection.token_expires_at = datetime.utcnow() + timedelta(
                seconds=token_data["expires_in"]
            )
            db.commit()
        except Exception as e:
            raise HTTPException(
                status_code=401, detail="Failed to refresh token, reconnection required"
            )

    try:
        # Get accounts
        accounts = truelayer_service.get_accounts(connection.access_token)

        # Import transactions for all accounts
        transactions_imported = 0
        for account_data in accounts:
            # Fetch transactions
            transactions = truelayer_service.get_account_transactions(
                connection.access_token, account_data["account_id"]
            )

            # Import transactions
            for tx_data in transactions:
                # Check if transaction already exists
                existing_tx = (
                    db.query(Transaction)
                    .filter(
                        Transaction.bank_transaction_id == tx_data["transaction_id"]
                    )
                    .first()
                )

                if not existing_tx:
                    tx_formatted = truelayer_service.format_transaction(
                        tx_data, current_user.id, connection.id
                    )
                    transaction = Transaction(**tx_formatted)
                    db.add(transaction)
                    transactions_imported += 1

        db.commit()
        return {
            "message": "Transactions refreshed successfully",
            "transactions_imported": transactions_imported,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error refreshing transactions: {str(e)}"
        )
