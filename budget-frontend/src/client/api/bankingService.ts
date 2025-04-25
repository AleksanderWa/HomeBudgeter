import api from './client.ts';

export interface TransactionFilterRule {
  id: number;
  description_pattern?: string | null;
  merchant_name?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface CreateFilterRuleRequest {
  description_pattern?: string | null;
  merchant_name?: string | null;
  min_amount?: number | null;
  max_amount?: number | null;
  is_active?: boolean;
}

export interface UpdateFilterRuleRequest extends CreateFilterRuleRequest {}

export const getFilterRules = async (): Promise<TransactionFilterRule[]> => {
  const response = await api.get('/bank/filter-rules');
  return response.data;
};

export const createFilterRule = async (
  rule: CreateFilterRuleRequest
): Promise<TransactionFilterRule> => {
  const response = await api.post('/bank/filter-rules', rule);
  return response.data;
};

export const updateFilterRule = async (
  id: number,
  rule: UpdateFilterRuleRequest
): Promise<TransactionFilterRule> => {
  const response = await api.put(`/bank/filter-rules/${id}`, rule);
  return response.data;
};

export const deleteFilterRule = async (id: number): Promise<void> => {
  await api.delete(`/bank/filter-rules/${id}`);
};

// Get bank connections
export const getBankConnections = async () => {
  const response = await api.get('/bank/connections');
  return response.data;
};

// Get auth link
export const getAuthLink = async (state: string) => {
  const response = await api.get(`/bank/auth-link?state=${state}`);
  return response.data;
};

// Refresh transactions
export const refreshTransactions = async (connectionId: number) => {
  const response = await api.post(`/bank/refresh/${connectionId}`);
  return response.data;
}; 