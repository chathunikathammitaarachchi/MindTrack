from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

try:
    scaler = joblib.load('/home/chathunika/mysite/BehaviourNet_scaler.pkl')
    model = joblib.load('/home/chathunika/mysite/BehaviourNet.pkl')
    print("Models loaded successfully!")
except Exception as e:
    print("Error loading models:", e)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # යූසර් එවන ඕනෑම JSON එකක් හෝ හිස් එකක් ආරක්ෂිතව ලබා ගැනීම
        data = request.get_json(force=True, silent=True) or {}
        print("RECEIVED DATA FROM APP:", data)  
        
        # සියලුම අගයන් ආරක්ෂිතව අංක බවට පත් කර ගැනීම (None හෝ 0 ආවත් 400 එරර් එකක් නොයන ලෙස)
        mental_fatigue = float(data.get('mental_fatigue_score', 5) or 5)
        screen_time = float(data.get('daily_screen_time_hours', 6.0) or 6.0)
        sleep_quality = float(data.get('sleep_quality_score', 5) or 5)
        digital_wellness = float(data.get('digital_wellness_score', 5) or 5)
        fatigue_ratio = float(data.get('fatigue_activity_ratio', 1) or 1)
        sleep_eff = float(data.get('sleep_efficiency', 0.8) or 0.8)
        physical_activity = float(data.get('physical_activity_minutes', 30) or 30)
        sleep_duration = float(data.get('sleep_duration_hours', 7.0) or 7.0)
        phone_before_sleep = float(data.get('phone_usage_before_sleep_minutes', 30) or 30)
        
        # බිංදුවෙන් බෙදීම (Division by zero) වැළැක්වීමට ආරක්ෂිත පියවරක්
        safe_sleep = sleep_duration if sleep_duration > 0 else 7.0
        screen_sleep_ratio = screen_time / safe_sleep

        features = [
            mental_fatigue,
            screen_time,
            sleep_quality,
            screen_sleep_ratio,
            digital_wellness,
            fatigue_ratio,
            sleep_eff,
            physical_activity,
            safe_sleep,
            phone_before_sleep
        ]
        
        features_array = np.array([features])
        scaled_features = scaler.transform(features_array)
        
        prediction = model.predict(scaled_features)
        probabilities = model.predict_proba(scaled_features)
        
        risk_level = "High Risk" if prediction[0] == 1 else "Low Risk"
        high_risk_prob = round(probabilities[0][1] * 100, 2)
        
        return jsonify({
            "status": "success",
            "risk_level": risk_level,
            "probability": {
                "high_risk": high_risk_prob,
                "low_risk": 100 - high_risk_prob
            }
        })
        
    except Exception as e:
        print("PYTHON SERVER ERROR:", str(e))  
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)