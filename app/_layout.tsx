import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { MedicineProvider } from '../context/MedicineContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AuthScreen from './auth';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions } from '../services/notificationService';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.frameworkReady?.();
    }
    // Request notification permissions on app start safely
    requestNotificationPermissions().catch(() => {});
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <MedicineProvider firebaseUid={user?.uid ?? null}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="camera" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style="auto" />
    </MedicineProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
