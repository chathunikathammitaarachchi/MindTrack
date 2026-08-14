from flask import Flask, request, jsonify
import joblib
import numpy as np

app = Flask(__name__)

# Machine Learning මොඩල් සහ Scaler එක ලෝඩ් කිරීම
try:
    scaler = joblib.load('BehaviourNet_scaler.pkl')
    model = joblib.load('behaviournet.pkl')
except Exception as e:
    print("Error loading models. Check if .pkl files exist:", e)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # ML මොඩල් එක බලාපොරොත්තු වන Features 10 අනුපිළිවෙලටම සැකසීම
        screen_time = data.get('daily_screen_time_hours', 0)
        sleep_duration = data.get('sleep_duration_hours', 1) # 0 න් බෙදීම වැළැක්වීමට 1 යෙදීම
        
        features = [
            data.get('mental_fatigue_score', 0),
            screen_time,
            data.get('sleep_quality_score', 0),
            screen_time / sleep_duration, # screen_to_sleep_ratio ගණනය කිරීම
            data.get('digital_wellness_score', 5), 
            data.get('fatigue_activity_ratio', 1),
            data.get('sleep_efficiency', 0.8),
            data.get('physical_activity_minutes', 0),
            sleep_duration,
            data.get('phone_usage_before_sleep_minutes', 0)
        ]
        
        # NumPy Array එකක් බවට පත් කිරීම
        features_array = np.array([features])
        
        # දත්ත Scaler එක හරහා යවා Normalize කිරීම
        scaled_features = scaler.transform(features_array)
        
        # මොඩල් එක මඟින් ප්‍රතිඵලය (Risk) සහ සම්භාවිතාව (Confidence) ලබා ගැනීම
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
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)