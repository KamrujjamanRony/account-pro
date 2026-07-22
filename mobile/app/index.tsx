import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';

/** Entry route: waits for the session to restore, then routes accordingly. */
export default function Index() {
  const { user, initializing } = useAuth();
  const { palette } = useTheme();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
