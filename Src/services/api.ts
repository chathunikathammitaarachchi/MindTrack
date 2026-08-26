const FLASK_BACKEND_URL = 'https://chathunika.pythonanywhere.com/predict';

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
    console.log("🚀 සර්වර් එකට යවනවා: ", FLASK_BACKEND_URL);
    console.log("📦 ඇප් එකෙන් ලැබුණු සැබෑ ඩේටා: ", payload);
    
    const response = await fetch(FLASK_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // මෙතන දැන් හැඩ්කෝඩ් කරපු අංක වෙනුවට, 
      // ඇප් එකෙන් (payload එක හරහා) එන සැබෑ ඩේටා යොදා ඇත.
      body: JSON.stringify({
        "daily_screen_time_hours": payload.daily_screen_time_hours,
        "physical_activity_minutes": payload.physical_activity_minutes,
        "sleep_duration_hours": payload.sleep_duration_hours,
        "sleep_quality_score": payload.sleep_quality_score,
        "phone_usage_before_sleep_minutes": payload.phone_usage_before_sleep_minutes,
        "notifications_received_per_day": payload.notifications_received_per_day,
        "mental_fatigue_score": payload.mental_fatigue_score
      }),
    });

    console.log("📥 සර්වර් එකෙන් ආපු Status එක: ", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ සර්වර් එකේ ඇත්තම Error එක: ", errorText);
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error: any) {
    console.log("⚠️ ජාලයේ (Network) හෝ වෙනත් Error එකක්: ", error.message);
    throw error;
  }
};