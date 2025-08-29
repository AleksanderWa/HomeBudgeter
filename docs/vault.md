# Vault Feature Specification

## Overview
The Vault feature allows users to track their physical cash holdings alongside their digital transactions, providing a complete view of their financial situation.

## Core Components

### 1. Vault Model
```python
class Vault(Base):
    __tablename__ = "vaults"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    amount = Column(DECIMAL(precision=10, scale=2), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User")
```

### 2. Transaction Type Enhancement
Add an enum for transaction types to the Transaction model:
```python
class TransactionType(str, Enum):
    CASH = "cash"
    DIGITAL = "digital"
```

## API Endpoints

### Vault Management
- `GET /api/vault` - Get current vault balance
- `POST /api/vault` - Add cash to vault
- `PUT /api/vault/{id}` - Update vault entry
- `DELETE /api/vault/{id}` - Remove vault entry
- `GET /api/vault/history` - Get vault transaction history

### Transaction Updates
- Update transaction creation/update endpoints to include transaction type

## Frontend Components

### 1. Vault Dashboard
- Current cash balance display
- Quick actions for adding/removing cash
- Recent vault transactions
- Visual representation of cash vs digital balance

### 2. Vault Transaction Form
- Amount input
- Description field
- Date picker
- Transaction type selector (Add/Remove)

### 3. Transaction Form Updates
- Add transaction type selector (Cash/Digital/Transfer)
- Conditional fields based on transaction type

## Database Changes

1. New `vaults` table
2. Add `transaction_type` enum to `transactions` table

## Implementation Phases

### Phase 1: Backend Foundation
- [ ] Create Vault model
- [ ] Implement vault API endpoints
- [ ] Add transaction type enum
- [ ] Update transaction model

### Phase 2: Frontend Development
- [ ] Create vault dashboard component
- [ ] Implement vault transaction forms
- [ ] Update transaction forms
- [ ] Add vault balance to main dashboard

### Phase 3: Integration & Testing
- [ ] Integrate vault with existing transaction system
- [ ] Add unit tests
- [ ] Perform integration testing
- [ ] User acceptance testing

## Security Considerations
- Ensure proper authorization for vault operations
- Validate all cash transactions
- Implement audit logging for vault changes

## Future Enhancements
- Vault categories (e.g., emergency fund, savings)
- Cash flow projections including vault
- Vault transaction export
- Multi-currency support 