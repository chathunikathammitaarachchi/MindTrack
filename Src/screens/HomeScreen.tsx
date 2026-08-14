import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, AppState, Alert } from 'react-native';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<{ risk_level?: string; confidence?: string } | null>(null);
  
  // 1. ෆෝන් එකෙන් ස්වයංක්‍රීයව ලබාගන්නා දත්ත ගබඩා කිරීම
  const [sensors, setSensors] = useState({
    steps: 0,        
    sleepHours: 0, 
    screenTime: 6.5, // මෙය Screen Time tracker එකෙන් ලැබෙන අගයයි
  });

  useEffect(() => {
    let subscription: any;

    // Pedometer හරහා ස්වයංක්‍රීයව පියවර ගණන ලබා ගැනීම
    const setupPedometer = async () => {
      try {
        const permission = await Pedometer.requestPermissionsAsync();
        if (permission.granted) {
          const isAvailable = await Pedometer.isAvailableAsync();
          if (isAvailable) {
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            const pastSteps = await Pedometer.getStepCountAsync(start, end);
            if (pastSteps) {
              setSensors(prev => ({ ...prev, steps: pastSteps.steps }));
            }

            subscription = Pedometer.watchStepCount(result => {
              setSensors(prev => ({ ...prev, steps: result.steps }));
            });
          }
        }
      } catch (e) {
        console.log('Pedometer error:', e);
      }
    };

    setupPedometer();

    // App එක Background යන වේලාව මත ස්වයංක්‍රීයව නින්ද ගණනය කිරීම
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

            if (sleepDurationHours >= 2 && sleepDurationHours <= 14) {
              setSensors(prev => ({ ...prev, sleepHours: Number(sleepDurationHours.toFixed(1)) }));
            }
          }
        }
      } catch (e) {
        console.log('Sleep tracker error:', e);
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      if (subscription) subscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  // 2. සැබෑ දත්ත Cloud API එකට යවා ML Model එකෙන් ප්‍රතිඵල ලබා ගැනීම
  const runAutoAssessment = async () => {
    setLoading(true);

    try {
      // Thesis එකේ 4.4 කොටසේ Figure 4 හි දක්වා ඇති පරිදි හරියටම JSON Payload එක සැකසීම
      const payload = {
        daily_screen_time_hours: sensors.screenTime,
        sleep_duration_hours: sensors.sleepHours > 0 ? sensors.sleepHours : 7.0, // නින්ද මැනී නොමැති නම් සාමාන්‍ය අගය යැවීම
        sleep_quality_score: 5, 
        physical_activity_minutes: Math.round(sensors.steps / 80), // පියවර ගණන දළ වශයෙන් මිනිත්තු වලට හැරවීම
        phone_usage_before_sleep_minutes: 45, 
        notifications_received_per_day: 120, 
        mental_fatigue_score: 5 
      };

      // මෙතන තියෙන URL එක අපි ඊළඟ පියවරේදී Cloud එකට අප්ලෝඩ් කළාම ලැබෙන අලුත් URL එකට මාරු කරන්න ඕනේ!
      const CLOUD_API_URL = 'https://YOUR_CLOUD_SERVER.onrender.com/predict';

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
        risk_level: data.risk_level, // Flask එකෙන් එන සැබෑ Risk එක
        confidence: `${data.probability?.high_risk || 0}%` // ML මොඩල් එකේ සැබෑ Confidence එක
      });

    } catch (error) {
      Alert.alert("Connection Error", "Cloud සර්වර් එක තවම ලින්ක් කර නැත. අපි ඊළඟට ඒක කරමු!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.appTitle}>MindTrack Engine</Text>
        <Text style={styles.statusBadge}>BehaviourNet Linked 🌐</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Passive Sensing (24h)</Text>
        <Text style={styles.dataPoint}>📱 Estimated Screen Time: {sensors.screenTime} hrs</Text>
        <Text style={styles.dataPoint}>🏃 Live Mobility Tally: {sensors.steps} steps</Text> 
        <Text style={styles.dataPoint}>🛌 Detected Sleep: {sensors.sleepHours} hrs</Text>
      </View>

      {prediction && (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>Logistic Regression Assessment</Text>
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
  dataPoint: { fontSize: 16, fontWeight: '600', color: '#1E293B', marginVertical: 4 },
  alertCard: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5', borderWidth: 1.5 },
  alertTitle: { fontSize: 12, color: '#DC2626', fontWeight: '900', textTransform: 'uppercase' },
  riskText: { fontSize: 24, fontWeight: '900', color: '#991B1B', marginTop: 4 },
  confidenceText: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  actionButton: { backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 'auto' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '800' }
});