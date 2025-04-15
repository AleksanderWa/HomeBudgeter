# TrueLayer Integration

This integration allows users to connect their bank accounts using TrueLayer's Data API and import transactions directly into the Budgeter application.

## Setup

1. Register for a developer account at [TrueLayer Console](https://console.truelayer.com/)

2. Create a new application in the TrueLayer Console

3. Configure redirect URLs:
   - Add `http://localhost:8000/api/bank/callback` for local development
   - Add your production callback URL if deploying to production

4. Get your API credentials from the TrueLayer Console:
   - Client ID
   - Client Secret

5. Add these environment variables to your application:

```
TRUELAYER_CLIENT_ID=your_client_id
TRUELAYER_CLIENT_SECRET=your_client_secret
TRUELAYER_REDIRECT_URI=http://localhost:8000/api/bank/callback
```

## Database Migration

After adding the TrueLayer integration, you need to run a database migration:

```bash
alembic revision --autogenerate -m "Add TrueLayer integration"
alembic upgrade head
```

## Usage

### Connect a Bank Account

1. Frontend: Create a button or link that directs users to connect their bank account

2. When a user clicks this button, call the API endpoint:
   ```
   GET /api/bank/auth-link
   ```

3. This returns an authentication link. Redirect the user to this link.

4. The user will select their bank and authorize access to their data on the TrueLayer page.

5. After authorization, TrueLayer will redirect the user back to your application with a code.

6. Your application's callback endpoint will process this code, retrieve bank data, and import transactions.

### View Connected Banks

```
GET /api/bank/connections
```

Returns a list of bank connections for the current user.

### Refresh Transactions

To update transactions from a connected bank:

```
POST /api/bank/refresh/{connection_id}
```

This will fetch new transactions that haven't been imported yet.

## Transaction Mapping

TrueLayer transactions are automatically converted to match your existing Transaction model structure. The integration adds additional fields to store bank-specific data such as:

- `bank_transaction_id`: Unique identifier from the bank
- `account_name`: Name of the bank account
- `merchant_name`: Name of the merchant (when available)
- `transaction_type`: Type of transaction (e.g., debit, credit)
- `bank_connection_id`: Reference to the connected bank

## Limitations

- Bank connections expire and need to be refreshed. The integration handles token refreshing automatically.
- TrueLayer's API has rate limits. Check their documentation for details.
- Not all banks provide the same level of transaction detail. Some fields might be empty for certain banks. 