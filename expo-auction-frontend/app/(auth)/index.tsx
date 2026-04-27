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
import { signInWithEmailPassword } from '@/services/cognitoAuth';
import { getMyProfile } from '@/services/profileApi';
import { useAppDispatch } from '@/state/hooks';
import { setCredentials } from '@/state/slices/authSlice';

function authMessage(err: unknown): string {
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as Error).message === 'string'
  ) {
    return (err as Error).message;
  }
  return 'Sign in failed';
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleSignIn = () => {
    setError(null);
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setError('Enter email and password');
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const tokens = await signInWithEmailPassword(e, password);
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
          /* Profile GET is best-effort; sign-in still succeeds */
        }
        router.replace('/(tabs)/events');
      } catch (err: unknown) {
        setError(authMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Container>
          <View style={styles.signInContainer}>
            <Text style={styles.title}>Sign In</Text>
            <Text style={styles.subtitle}>Use any email and password for the local demo.</Text>

            <View style={styles.formContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!loading}
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.textInput}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                editable={!loading}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {loading ? (
                <ActivityIndicator style={styles.spinner} />
              ) : (
                <Button title="Sign In" onPress={handleSignIn} style={styles.signInButton} />
              )}

              <Pressable
                onPress={() => router.push('/(auth)/sign-up')}
                style={styles.linkWrap}
                disabled={loading}>
                <Text style={styles.link}>Create an account</Text>
              </Pressable>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  signInContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  signInButton: {
    marginTop: 24,
    marginHorizontal: 0,
  },
  spinner: {
    marginTop: 24,
  },
  errorText: {
    marginTop: 16,
    color: '#c00',
    fontSize: 14,
  },
  linkWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  link: {
    fontSize: 16,
    color: '#1565c0',
    fontWeight: '600',
  },
});
