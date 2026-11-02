import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Pill, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';

type Mode = 'login' | 'signup' | 'reset';

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await resetPassword(email);
        showAlert('Email Sent', 'Check your inbox for the password reset link.');
        setMode('login');
      } catch (e: any) {
        const msg = mapError(e.code);
        setErrorMessage(msg);
        console.error('Reset password error:', e);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setErrorMessage('Please enter your name.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
    } catch (e: any) {
      const msg = mapError(e.code);
      setErrorMessage(msg);
      console.error('Auth error:', e.code, e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Branding */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            style={styles.brandingContainer}
          >
            <View style={styles.logoOuter}>
              <View style={styles.logoInner}>
                <Pill size={32} color={Colors.white} />
              </View>
            </View>
            <Text style={styles.appName}>MediFill</Text>
            <Text style={styles.tagline}>Smart medicine management</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            entering={FadeInDown.delay(250).duration(500)}
            style={styles.formCard}
          >
            <Text style={styles.formTitle}>
              {mode === 'login'
                ? 'Welcome back'
                : mode === 'signup'
                ? 'Create account'
                : 'Reset password'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Sign in to continue to MediFill'
                : mode === 'signup'
                ? 'Fill in your details to get started'
                : 'We\'ll send you a link to reset your password'}
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <User size={16} color={Colors.textTertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={Colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrap}>
                <Mail size={16} color={Colors.textTertiary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode !== 'reset' && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <Lock size={16} color={Colors.textTertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={16} color={Colors.textTertiary} />
                  ) : (
                    <Eye size={16} color={Colors.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <View style={styles.inputIconWrap}>
                  <Lock size={16} color={Colors.textTertiary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor={Colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                />
              </View>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <View style={styles.submitContent}>
                  <Text style={styles.submitText}>
                    {mode === 'login'
                      ? 'Sign In'
                      : mode === 'signup'
                      ? 'Create Account'
                      : 'Send Reset Link'}
                  </Text>
                  <ArrowRight size={18} color={Colors.white} />
                </View>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setMode('reset')}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Toggle */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            style={styles.toggleRow}
          >
            <Text style={styles.toggleLabel}>
              {mode === 'login' || mode === 'reset'
                ? "Don't have an account?"
                : 'Already have an account?'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setErrorMessage('');
                setMode(mode === 'login' || mode === 'reset' ? 'signup' : 'login');
              }}
            >
              <Text style={styles.toggleAction}>
                {mode === 'login' || mode === 'reset' ? 'Sign Up' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function mapError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection.';
    default:
      if (code?.includes('blocked')) {
        return 'Auth API is blocked by key restrictions. In GCP Console → Credentials, set your API key to "Don\'t restrict key".';
      }
      return 'Something went wrong. Please try again.';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxxl,
  },
  // Branding
  brandingContainer: { alignItems: 'center', marginBottom: Spacing.xxxl },
  logoOuter: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.lg,
  },
  logoInner: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginTop: Spacing.xs,
  },
  // Form Card
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    ...Shadow.md,
  },
  formTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  formSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    height: 52,
  },
  inputIconWrap: {
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: Spacing.xs,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  submitContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  submitText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  linkButton: { alignItems: 'center', marginTop: Spacing.lg },
  linkText: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: '600' },
  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xxl,
    gap: Spacing.xs,
  },
  toggleLabel: { fontSize: FontSize.md, color: Colors.textTertiary },
  toggleAction: { fontSize: FontSize.md, color: Colors.primary, fontWeight: '700' },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
});
