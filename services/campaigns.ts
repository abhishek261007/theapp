import api from './api';

export type ActiveCampaign = {
  _id: string;
  name: string;
  description: string;
  offerCode: string;
  endAt: string;
  showValidTill?: boolean;
};

export async function fetchActiveCampaign(): Promise<ActiveCampaign | null> {
  try {
    const res = await api.get('/campaigns/active');
    return res.data;
  } catch {
    return null;
  }
}

export async function validateOfferCode(code: string): Promise<{
  valid: boolean;
  campaign?: { _id: string; name: string; offerCode: string; description: string };
  message?: string;
}> {
  try {
    const res = await api.post('/campaigns/validate', { code });
    return res.data;
  } catch {
    return { valid: false, message: 'Failed to validate code' };
  }
}
