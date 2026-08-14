const FLASK_BACKEND_URL = 'http://localhost:8000/predict';

export interface PassivePayload {
  daily_screen_time_hours: number;
  physical_activity_minutes: number;
  sleep_duration_hours: number;
  sleep_quality_score: number;
  phone_usage_before_sleep_minutes: number;
  notifications_received_per_day: number;
  mental_fatigue_score: number;
}

export const sendDataToBehaviorNet = async (payload: PassivePayload) => {
  try {
    const response = await fetch(FLASK_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error: any) {
    throw new Error('Flask Server unreachable. Check your WiFi/IP address.');
  }
};