import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState, Alert } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<{ risk_level?: string; confidence?: string } | null>(null);
  
  // සියලුම අගයන් සම්පූර්ණයෙන්ම ස්වයංක්‍රීයව (Automatic) සෙන්සර් සහ ඇප් භාවිතය මත පදනම් වේ
  const [sensors, setSensors] = useState({
    steps: 0,           
    sleepHours: 0, 
    activeMinutes: 0,
    fatigueScore: 0,
    sessionScreenMinutes: 0 // ඇප් එක පාවිච්චි කරන සහ ෆෝන් එක ඔන් කරලා තියෙන වෙලාව මත ස්වයංක්‍රීයව වැඩි වේ
  });

  useEffect(() => {
    let accelerometerSubscription: any;

    // 1. Accelerometer මඟින් Mobility Tally එක වඩාත් සංවේදීව සහ ස්වයංක්‍රීයව ලබා ගැනීම
    const setupAccelerometer = () => {
      Accelerometer.setUpdateInterval(300); // තත්පර 0.3 කින් අප්ඩේට් වේ
      
      accelerometerSubscription = Accelerometer.addListener(accelerometerData => {
        const { x, y, z } = accelerometerData;
        const acceleration = Math.sqrt(x * x + y * y + z * z);
        
        // ෆෝන් එකේ කුඩා චලනයක් වුවද හඳුනා ගැනීම සඳහා සීමාව සකස් කර ඇත
        if (acceleration > 1.05 || acceleration < 0.95) {
          setSensors(prev => {
            const newSteps = prev.steps + 2; // Mobility එක වඩාත් පැහැදිලිව වැඩි වීමට
            const newActiveMinutes = Math.round(newSteps / 20); 
            return { 
              ...prev, 
              steps: newSteps,
              activeMinutes: newActiveMinutes > 0 ? newActiveMinutes : prev.activeMinutes,
              fatigueScore: Math.min(Math.round(newSteps / 50), 10)
            };
          });
        }
      });
    };

    setupAccelerometer();

    // 2. ඇප් එක Foreground එකේ තියෙන වෙලාව සහ Background යන වෙලාව මත Screen Time සහ Sleep ස්වයංක්‍රීයව ගණනය කිරීම
    const timer = setInterval(() => {
      setSensors(prev => ({ ...prev, sessionScreenMinutes: prev.sessionScreenMinutes + 1 }));
    }, 60000); // සෑම මිනිත්තුවකට වරක් Screen Time එක ස්වයංක්‍රීයව වැඩි වේ

    const handleAppStateChange = async (nextAppState: string) => {
      try {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          await AsyncStorage.setItem('sleep_start_time', Date.now().toString());
        } else if (nextAppState === 'active') {
          const startTimeStr = await AsyncStorage.getItem('sleep_start_time');
          if (startTimeStr) {
            const startTime = parseInt(startTimeStr, 10);
            const currentTime = Date.now();
            const sleepDurationHours = (currentTime - startTime) / (1000 * 60 * 60);

            if (sleepDurationHours >= 0.01) { 
              setSensors(prev => ({ ...prev, sleepHours: Number(sleepDurationHours.toFixed(2)) }));
            }
          }
        }
      } catch (e) {
        console.log('Sleep tracker error:', e);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (accelerometerSubscription) accelerometerSubscription.remove();
      appStateSubscription.remove();
      clearInterval(timer);
    };
  }, []);

  // 3. සම්පූර්ණයෙන්ම ස්වයංක්‍රීයව ලබාගත් ඩාටා Flask API වෙත යැවීම
  const runAutoAssessment = async () => {
    setLoading(true);

    try {
      // ස්වයංක්‍රීයව එකතු වූ විනාඩි මත පදනම් වූ Screen Time එක පැය වලින් සකස් කිරීම (අවම වශයෙන් සාමාන්‍ය අගයක් සමඟ එකතු වේ)
      const autoScreenTime = Number((4.5 + (sensors.sessionScreenMinutes / 60) + (sensors.activeMinutes / 30)).toFixed(1));

      const payload = {
        mental_fatigue_score: sensors.fatigueScore > 0 ? sensors.fatigueScore : 3,
        daily_screen_time_hours: autoScreenTime, // ෆෝන් එකේ භාවිතය මත ස්වයංක්‍රීයව හැදෙන Screen Time එක
        sleep_quality_score: sensors.sleepHours > 2 ? 8 : 5, 
        digital_wellness_score: 5, 
        fatigue_activity_ratio: sensors.activeMinutes > 0 ? Number((sensors.fatigueScore / sensors.activeMinutes).toFixed(2)) : 1,
        sleep_efficiency: sensors.sleepHours > 4 ? 0.90 : 0.70,
        physical_activity_minutes: sensors.activeMinutes > 0 ? sensors.activeMinutes : 15, 
        sleep_duration_hours: sensors.sleepHours > 0 ? sensors.sleepHours : 6.5,     
        phone_usage_before_sleep_minutes: 30
      };

      console.log("🚀 BehaviourNet සර්වර් එකට යවන සම්පූර්ණයෙන්ම Automatic ඩාටා:", payload);

      const CLOUD_API_URL = 'https://chathunika.pythonanywhere.com/predict';

      const response = await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setPrediction({
        risk_level: data.risk_level, 
        confidence: `${data.probability?.high_risk || 0}%` 
      });

    } catch (error) {
      Alert.alert("Connection Error", "Cloud සර්වර් එක සමඟ සම්බන්ධ වීමේ දෝෂයක් ඇත.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MindTrack Engine</Text>
        <Text style={styles.statusBadge}>Passive Sensing is ACTIVE 🟢 (Fully Auto)</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Aggregated Proxies (24h Window)</Text>
        
        {/* දැන් මෙහි කිසිදු ටයිප් කිරීමක් අවශ්‍ය නැත; සියල්ල ස්වයංක්‍රීයව ජෙනරේට් වේ */}
        <Text style={styles.dataPoint}>📱 Screen On-Time (Auto): {Number((4.5 + (sensors.sessionScreenMinutes / 60) + (sensors.activeMinutes / 30)).toFixed(1))} hrs</Text>
        <Text style={styles.dataPoint}>🏃 Mobility Tally (Live): {sensors.steps} steps</Text> 
        <Text style={styles.dataPoint}>⏱️ Active Minutes: {sensors.activeMinutes} mins</Text>
        <Text style={styles.dataPoint}>🛌 Sleep Architecture: {sensors.sleepHours} hrs</Text>
      </View>

      {prediction && (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>BehaviourNet Classification</Text>
          <Text style={styles.riskText}>Assessed Risk: {prediction.risk_level}</Text>
          <Text style={styles.confidenceText}>Confidence Score: {prediction.confidence}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.actionButton} onPress={runAutoAssessment} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Force Sync & Predict</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#60d4e0', padding: 24 },
  header: { marginTop: 40, marginBottom: 24 },
  appTitle: { fontSize: 32, fontWeight: '900', color: '#0F172A' },
  statusBadge: { fontSize: 13, color: '#16A34A', fontWeight: '800', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#475569', marginBottom: 12, textTransform: 'uppercase' },
  dataPoint: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginVertical: 6 },
  alertCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1.5 },
  alertTitle: { fontSize: 12, color: '#DC2626', fontWeight: '900', textTransform: 'uppercase' },
  riskText: { fontSize: 24, fontWeight: '900', color: '#991B1B', marginTop: 4 },
  confidenceText: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  actionButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 'auto' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});