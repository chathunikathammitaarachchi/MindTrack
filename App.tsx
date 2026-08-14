import React from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import HomeScreen from './Src/screens/HomeScreen';

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <HomeScreen />
    </SafeAreaView>
  );
}