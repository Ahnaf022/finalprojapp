import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { useAppDispatch, useAppSelector } from '@/state/hooks';
import { selectAccessToken } from '@/state/slices/authSlice';
import {
  clearEventsError,
  createEvent,
  selectEventsError,
  selectEventsLoading,
} from '@/state/slices/eventsSlice';

/** `datetime-local` value: YYYY-MM-DDTHH:mm in local terms (slice matches input format). */
function nowISO() {
  return new Date().toISOString().slice(0, 16);
}

/** Default end = start + `hours` (avoids end === start, which fails Django validation). */
function addHoursToISO(isoSlice: string, hours: number): string {
  const d = new Date(isoSlice);
  if (Number.isNaN(d.getTime())) {
    const fallback = new Date();
    fallback.setHours(fallback.getHours() + hours);
    return fallback.toISOString().slice(0, 16);
  }
  d.setTime(d.getTime() + hours * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

function toApiDateTime(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export default function AddEventScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(selectAccessToken);
  const eventsError = useAppSelector(selectEventsError);
  const eventsLoading = useAppSelector(selectEventsLoading);

  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [startDatetime, setStartDatetime] = useState(nowISO());
  const [endDatetime, setEndDatetime] = useState(() => addHoursToISO(nowISO(), 1));
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    dispatch(clearEventsError());
  }, [dispatch]);

  const handleSubmit = () => {
    if (!accessToken) {
      Alert.alert(
        'Sign in required',
        'Your session has no access token (e.g. after a full page reload on web, Redux is cleared). Sign in again to create events.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.replace('/(auth)') },
        ]
      );
      return;
    }

    const apiStart = toApiDateTime(startDatetime);
    const apiEnd = toApiDateTime(endDatetime);
    if (!apiStart || !apiEnd) {
      Alert.alert('Invalid date', 'Use the format YYYY-MM-DDTHH:mm for both dates.');
      return;
    }

    void dispatch(
      createEvent({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        zip_code: zipCode.trim(),
        start_datetime: apiStart,
        end_datetime: apiEnd,
        is_active: isActive,
      })
    )
      .unwrap()
      .then(() => {
        router.back();
      })
      .catch((message: string) => {
        Alert.alert('Could not create event', message);
      });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Auction Event</Text>

        {!accessToken ? (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              You are not signed in. Add Event will not call the API until you sign in (web reloads clear
              the session).
            </Text>
            <Pressable onPress={() => router.replace('/(auth)')} style={styles.warnLink}>
              <Text style={styles.warnLinkText}>Go to sign in</Text>
            </Pressable>
          </View>
        ) : null}

        {eventsError ? <Text style={styles.errorBanner}>{eventsError}</Text> : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Event name"
          placeholderTextColor="#999"
          maxLength={200}
        />

        <Text style={styles.label}>City</Text>
        <TextInput
          style={styles.input}
          value={city}
          onChangeText={setCity}
          placeholder="City"
          placeholderTextColor="#999"
          maxLength={100}
        />

        <Text style={styles.label}>State</Text>
        <TextInput
          style={styles.input}
          value={state}
          onChangeText={setState}
          placeholder="State (e.g. MA)"
          placeholderTextColor="#999"
          maxLength={50}
        />

        <Text style={styles.label}>Zip code</Text>
        <TextInput
          style={styles.input}
          value={zipCode}
          onChangeText={setZipCode}
          placeholder="Zip code"
          placeholderTextColor="#999"
          maxLength={10}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Start date & time</Text>
        <TextInput
          style={styles.input}
          value={startDatetime}
          onChangeText={setStartDatetime}
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>End date & time</Text>
        <TextInput
          style={styles.input}
          value={endDatetime}
          onChangeText={setEndDatetime}
          placeholder="YYYY-MM-DDTHH:mm"
          placeholderTextColor="#999"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        {eventsLoading ? (
          <ActivityIndicator style={styles.submitButton} />
        ) : (
          <Button title="Add Event" onPress={handleSubmit} style={styles.submitButton} />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 8,
  },
  submitButton: {
    marginTop: 24,
    marginHorizontal: 0,
  },
  warnBanner: {
    backgroundColor: '#fff8e6',
    borderColor: '#f0c040',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  warnText: {
    color: '#5c4a00',
    fontSize: 14,
    lineHeight: 20,
  },
  warnLink: {
    marginTop: 8,
  },
  warnLinkText: {
    color: '#1565c0',
    fontWeight: '600',
    fontSize: 15,
  },
  errorBanner: {
    color: '#b00020',
    fontSize: 14,
    marginBottom: 12,
  },
});
