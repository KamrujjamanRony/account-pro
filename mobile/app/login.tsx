import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { environment } from '../src/config/env';
import { spacing, radius } from '../src/config/theme';
import { ApiError } from '../src/api/client';
import { Button, Card, T, TextField, Icon } from '../src/components/ui';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const { palette, toggle, isDark } = useTheme();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!userName.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(userName.trim(), password);
      router.replace('/dashboard');
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      if (status === 0 || status === -1) setError('Unable to reach the server. Please try again.');
      else if (status === 401 || status === 400) setError('Invalid username or password.');
      else setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: spacing.xl }}
      >
        <View style={{ position: 'absolute', top: spacing.lg, right: spacing.lg }}>
          <Pressable onPress={toggle} hitSlop={12} accessibilityLabel="Toggle theme">
            <Icon
              path={
                isDark
                  ? 'M12 3v2m0 14v2m9-9h-2M5 12H3m15.36 6.36-1.42-1.42M6.34 6.34 4.93 4.93m12.02 0-1.41 1.41M6.34 17.66l-1.41 1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
                  : 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z'
              }
              size={24}
              color={palette.textMuted}
            />
          </Pressable>
        </View>

        <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radius.lg,
              backgroundColor: palette.primary,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: spacing.md,
            }}
          >
            <Icon path="M3 3v18h18M8 17V9m4 8V5m4 12v-6" size={32} color={palette.onPrimary} />
          </View>
          <T size={24} weight="800">
            {environment.companyName}
          </T>
          <T muted size={14} style={{ marginTop: 4 }}>
            Sign in to continue
          </T>
        </View>

        <Card>
          <TextField
            label="Username"
            value={userName}
            onChangeText={setUserName}
            placeholder="Enter username"
            autoCapitalize="none"
          />
          <View>
            <TextField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={10}
              style={{ position: 'absolute', right: 12, top: 34 }}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Icon
                path={
                  showPassword
                    ? 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.24A9.1 9.1 0 0 1 12 4c7 0 10 8 10 8a13.2 13.2 0 0 1-1.67 2.68M6.6 6.6A13.3 13.3 0 0 0 2 12s3 8 10 8a9.3 9.3 0 0 0 5.4-1.6'
                    : 'M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'
                }
                size={20}
                color={palette.textMuted}
              />
            </Pressable>
          </View>

          {error ? (
            <View
              style={{
                backgroundColor: palette.danger + '18',
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <T size={13} color={palette.danger}>
                {error}
              </T>
            </View>
          ) : null}

          <Button label="Sign in" onPress={submit} loading={loading} full />
        </Card>

        <T muted size={12} style={{ textAlign: 'center', marginTop: spacing.lg }}>
          {environment.companyAddress}
        </T>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
