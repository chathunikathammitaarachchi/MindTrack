from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/predict', methods=['POST'])
def predict():
    data = request.json
    
    # ඇප් එකෙන් එන දත්ත ලබා ගැනීම
    screen_time = data.get('daily_screen_time_hours', 0)
    sleep = data.get('sleep_duration_hours', 0)
    steps = data.get('physical_activity_minutes', 0)

    # දත්ත අනුව අවදානම ගණනය කිරීම
    risk_level = "Low Risk"
    high_risk_prob = 15

    # නිදාගන්න වෙලාව අඩු නම් හෝ ෆෝන් එක බලන වෙලාව වැඩි නම් අවදානම වැඩියි
    if sleep < 5 or screen_time > 8:
        risk_level = "High Risk"
        high_risk_prob = 85
    elif sleep < 7 or screen_time > 5:
        risk_level = "Moderate Risk"
        high_risk_prob = 50

    # ප්‍රතිඵලය ඇප් එකට යැවීම
    return jsonify({
        "status": "success",
        "risk_level": risk_level,
        "probability": {
            "high_risk": high_risk_prob
        },
        "message": "Data processed successfully"
    })

if __name__ == '__main__':
    # 0.0.0.0 දැම්මාම තමයි ෆෝන් එකට කම්පියුටරේ IP එකෙන් කනෙක්ට් වෙන්න පුළුවන් වෙන්නේ
    app.run(host='0.0.0.0', port=8000)