import os
from pathlib import Path
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from dotenv import load_dotenv

# Get the absolute path to the .env file
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / '.env'

# Load the environment variables with explicit path
load_dotenv(dotenv_path=env_path)

# Add debug prints to check what's being loaded
print(f"TRUELAYER_CLIENT_ID: {os.getenv('TRUELAYER_CLIENT_ID')}")
print(f"TRUELAYER_REDIRECT_URI: {os.getenv('TRUELAYER_REDIRECT_URI')}")


class TrueLayerService:
    # Use production endpoints
    BASE_URL = "https://api.truelayer.com"
    AUTH_URL = "https://auth.truelayer.com"

    def __init__(self):
        # Load values with fallbacks for debugging
        self.client_id = os.getenv("TRUELAYER_CLIENT_ID")
        self.client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
        self.redirect_uri = 'https://console.truelayer.com/redirect-page' #os.getenv("TRUELAYER_REDIRECT_URI")
        
        # Add debug prints in the constructor
        print("Initialized TrueLayerService with:")
        print(f"  - client_id: {self.client_id}")
        print(f"  - redirect_uri: {self.redirect_uri}")
        
        if not self.client_id or not self.client_secret:
            print("WARNING: TrueLayer credentials not found!")

    def generate_auth_link(self, state: str) -> str:
        """Generate authentication link for users to connect their bank account"""
        # Include all required scopes as in the working URL
        scopes = ["info", "accounts", "balance", "cards", "transactions", 
                  "direct_debits", "standing_orders", "offline_access"]

        query_params = {
            "response_type": "code",
            "client_id": self.client_id,
            "scope": " ".join(scopes),
            "redirect_uri": self.redirect_uri,
            "state": state,
            # Use production providers as per the working link
            "providers": "pl-polishapi-mbank pl-polishapi-ing uk-oauth-all"
        }

        params = "&".join([f"{k}={v}" for k, v in query_params.items()])
        auth_url = f"{self.AUTH_URL}/?{params}"
        print(f"Generated auth URL: {auth_url}")
        return auth_url

    def exchange_code_for_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization code for access token"""
        # Use correct token endpoint for sandbox
        url = f"{self.AUTH_URL}/connect/token"
        payload = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
        }
        
        print(f"Sending token request to: {url}")
        print(f"With payload: {payload}")
        
        response = requests.post(url, data=payload)
        
        # Check for errors and log them
        if response.status_code != 200:
            print(f"Error exchanging code: {response.status_code}")
            print(f"Response: {response.text}")
            response.raise_for_status()
            
        return response.json()

    def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        url = f"{self.AUTH_URL}/connect/token"
        payload = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }

        response = requests.post(url, data=payload)
        response.raise_for_status()
        return response.json()

    def get_accounts(self, access_token: str) -> List[Dict[str, Any]]:
        """Get user's bank accounts"""
        url = f"{self.BASE_URL}/data/v1/accounts"
        headers = {"Authorization": f"Bearer {access_token}"}

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json().get("results", [])

    def get_account_transactions(
        self,
        access_token: str,
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get transactions for a specific account"""
        url = f"{self.BASE_URL}/data/v1/accounts/{account_id}/transactions"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {}

        if from_date:
            params["from"] = from_date
        if to_date:
            params["to"] = to_date

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json().get("results", [])

    def format_transaction(
        self, tx_data: Dict[str, Any], user_id: int, connection_id: int
    ) -> Dict[str, Any]:
        """Format transaction data from TrueLayer API to match our Transaction model"""
        # Convert amount - TrueLayer uses negative for credit, positive for debit
        # We may need to adjust based on your system's convention
        amount = Decimal(str(tx_data.get("amount", 0)))

        # Parse date from ISO format
        operation_date = None
        if "timestamp" in tx_data:
            operation_date = datetime.fromisoformat(
                tx_data["timestamp"].replace("Z", "+00:00")
            ).date()

        return {
            "operation_date": operation_date,
            "description": tx_data.get("description", ""),
            "amount": amount,
            "user_id": user_id,
            "bank_transaction_id": tx_data.get("transaction_id"),
            "account_name": tx_data.get("account_name", ""),
            "merchant_name": tx_data.get("merchant_name", ""),
            "transaction_type": tx_data.get("transaction_type", ""),
            "bank_connection_id": connection_id,
        }
