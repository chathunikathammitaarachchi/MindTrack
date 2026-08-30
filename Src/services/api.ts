const FLASK_BACKEND_URL = 'https://chathunika.pythonanywhere.com/predict';

export interface PassivePayload {
  daily_screen_time_hours: number;
  physical_activity_minutes: number;
  sleep_duration_hours: number;
  sleep_quality_score: number;
  phone_usage_before_sleep_minutes: number;
  mental_fatigue_score: number;
  digital_wellness_score?: number;
  fatigue_activity_ratio?: number;
  sleep_efficiency?: number;
  notifications_received_per_day?: number;
}

export const sendDataToBehaviorNet = async (payload: Record<string, any>) => {
  try {
    console.log("🚀 Sending request to server: ", FLASK_BACKEND_URL);
    console.log("📦 Received app payload: ", payload);
    
    const response = await fetch(FLASK_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // Real data from app (via payload) is used here instead of hardcoded values
      body: JSON.stringify(payload),
    });

    console.log("📥 Status received from server: ", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Server Error response: ", errorText);
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error: any) {
    console.log("⚠️ Network or server connection error: ", error.message);
    throw error;
  }
};