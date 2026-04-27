import { useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { Container } from '@/components/Container';
import { signInWithEmailPassword, signUpWithEmailPassword } from '@/services/cognitoAuth';
import { getMyProfile, patchMyProfile } from '@/services/profileApi';
import { useAppDispatch } from '@/state/hooks';
import { setCredentials } from '@/state/slices/authSlice';

function cognitoMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string') {
    return (err as Error).message;
  }
  return 'Something went wrong';
}

export default function SignUpScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSignUp = () => {
    setError(null);
    setInfo(null);
    if (!normalizedEmail || !password) {
      setError('Email and password are required');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password');
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const result = await signUpWithEmailPassword(normalizedEmail, password, displayName.trim());
        if (result.userConfirmed) {
          const tokens = await signInWithEmailPassword(normalizedEmail, password);
          dispatch(
            setCredentials({
              accessToken: tokens.accessToken,
              idToken: tokens.idToken,
              refreshToken: tokens.refreshToken,
            })
          );
          try {
            await getMyProfile(tokens.accessToken);
          } catch {
            /* Row may still be missing if GET fails */
          }
          try {
            await patchMyProfile(tokens.accessToken, {
              display_name: displayName.trim() || normalizedEmail.split('@')[0] || 'User',
            });
          } catch {
            /* Display name optional if PATCH fails after GET created the row */
          }
          router.replace('/(tabs)/events');
        } else {
          setAwaitingVerification(true);
          setInfo('Check your email for a verification code, then enter it below.');
        }
      } catch (err: unknown) {
        setError(cognitoMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleConfirmCode = () => {
    setError(null);
    setInfo(null);
    if (!verificationCode.trim()) {
      setError('Enter the verification code');
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        await confirmSignUp(normalizedEmail, verificationCode);
        const tokens = await signInWithEmailPassword(normalizedEmail, password);
        dispatch(
          setCredentials({
            accessToken: tokens.accessToken,
            idToken: tokens.idToken,
            refreshToken: tokens.refreshToken,
          })
        );

        try {
          await getMyProfile(tokens.accessToken);
          await patchMyProfile(tokens.accessToken, {
            display_name: displayName.trim() || normalizedEmail.split('@')[0] || 'User',
          });
        } catch {
          /* non-fatal */
        }
        router.replace('/(tabs)/events');
      } catch (err: unknown) {
        setError(cognitoMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Container>
          <View style={styles.inner}>
            <Text style={styles.title}>Sign Up</Text>
            <Text style={styles.subtitle}>Create an account with your email.</Text>

            {!awaitingVerification ? (
              <>
                <Text style={styles.label}>Display name</Text>
                <TextInput
                  style={styles.input}
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="How you want to appear"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                  editable={!loading}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!loading}
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!loading}
                />

                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  editable={!loading}
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  style={styles.input}
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  placeholder="Code from email"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  editable={!loading}
                />
                <Pressable onPress={handleResend} disabled={loading} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryBtnText}>Resend code</Text>
                </Pressable>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {info ? <Text style={styles.info}>{info}</Text> : null}

            {loading ? (
              <ActivityIndicator style={styles.spinner} />
            ) : !awaitingVerification ? (
              <Button title="Create account" onPress={handleSignUp} style={styles.primaryBtn} />
            ) : (
              <Button title="Verify & continue" onPress={handleConfirmCode} style={styles.primaryBtn} />
            )}

            <Pressable onPress={() => router.push('/(auth)')} disabled={loading} style={styles.linkWrap}>
              <Text style={styles.link}>Already have an account? Sign in</Text>
            </Pressable>
          </View>
        </Container>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingVertical: 24 },
  inner: { width: '100%', paddingHorizontal: 24 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  primaryBtn: { marginTop: 24, marginHorizontal: 0 },
  spinner: { marginTop: 24 },
  error: { marginTop: 16, color: '#c00', fontSize: 14 },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  link: { fontSize: 16, color: '#1565c0', fontWeight: '600' },
});
