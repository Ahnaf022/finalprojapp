function readErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Unable to load data.";
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { Button } from '@/components/Button';
import { useAppDispatch, useAppSelector } from '@/state/hooks';
import { selectAccessToken } from '@/state/slices/authSlice';
import {
  clearAuctionItemsError,
  clearGenerateDescriptionError,
  createAuctionItem,
  generateAuctionItemDescription,
  selectAuctionItemsError,
  selectAuctionItemsLoading,
  selectGenerateDescriptionLoading,
} from '@/state/slices/auctionItemsSlice';

function asNumber(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function AddItemScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();

  const accessToken = useAppSelector(selectAccessToken);
  const loading = useAppSelector(selectAuctionItemsLoading);
  const error = useAppSelector(selectAuctionItemsError);
  const generating = useAppSelector(selectGenerateDescriptionLoading);

  const eventIdNumber = useMemo(() => {
    const n = eventId ? Number(eventId) : NaN;
    return Number.isFinite(n) ? n : null;
  }, [eventId]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startingPrice, setStartingPrice] = useState('10');
  const [nameError, setNameError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setStartingPrice('10');
    setNameError(null);
  }, []);

  useEffect(() => {
    dispatch(clearAuctionItemsError());
    dispatch(clearGenerateDescriptionError());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      // When navigating away (back, tab switch, etc.), clear the form so it doesn't
      // keep stale values if this screen stays mounted.
      return () => {
        resetForm();
      };
    }, [resetForm])
  );

  const handleGenerate = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError('Name is required to generate a description.');
      return;
    }
    setNameError(null);
    void dispatch(generateAuctionItemDescription({ name: trimmed }))
      .unwrap()
      .then(({ description: d }: any) => {
        setDescription(d || '');
      })
      .catch((message: string) => {
        Alert.alert('Could not generate description', message);
      });
  };

  const handleSubmit = () => {
    if (!accessToken) {
      Alert.alert(
        'Sign in required',
        'Sign in again to add items (web reloads clear the session).',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.replace('/(auth)') },
        ]
      );
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Name is required.');
      return;
    }
    setNameError(null);

    if (!eventIdNumber) {
      Alert.alert('Missing event', 'No event id was provided for this item.');
      return;
    }

    const starting = asNumber(startingPrice);
    if (starting === null || starting <= 0) {
      Alert.alert('Invalid starting price', 'Starting price must be a positive number.');
      return;
    }

    void dispatch(
      createAuctionItem({
        auction_event: eventIdNumber,
        name: trimmedName,
        description: (description || '').trim() || 'Condition not specified.',
        starting_price: starting,
        status: 'published',
      })
    )
      .unwrap()
      .then(() => {
        resetForm();
        router.back();
      })
      .catch((message: string) => {
        Alert.alert('Could not add item', message);
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
        <Text style={styles.title}>Add Auction Item</Text>

        {!accessToken ? (
          <View style={styles.warnBanner}>
            <Text style={styles.warnText}>
              You are not signed in. Adding items and generating descriptions require authentication.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, nameError ? styles.inputError : null]}
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (nameError) setNameError(null);
          }}
          placeholder="Item name"
          placeholderTextColor="#999"
          maxLength={200}
        />
        {nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}

        <Text style={styles.label}>Starting price</Text>
        <TextInput
          style={styles.input}
          value={startingPrice}
          onChangeText={setStartingPrice}
          placeholder="10"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Description</Text>
        {generating ? (
          <View style={styles.generateLoadingRow}>
            <ActivityIndicator />
            <Text style={styles.generateLoadingText}>Generating description...</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the item"
              placeholderTextColor="#999"
              multiline
            />
            <Button
              title="Generate Description"
              onPress={handleGenerate}
              style={styles.generateButton}
            />
          </>
        )}

        {loading ? (
          <ActivityIndicator style={styles.submitButton} />
        ) : (
          <Button title="Add Item" onPress={handleSubmit} style={styles.submitButton} />
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
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#b00020',
  },
  fieldError: {
    color: '#b00020',
    marginTop: 8,
  },
  submitButton: {
    marginTop: 24,
    marginHorizontal: 0,
  },
  generateButton: {
    marginTop: 12,
    marginHorizontal: 0,
    backgroundColor: '#111827',
  },
  generateLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
  },
  generateLoadingText: {
    color: '#444',
    fontSize: 15,
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
  errorBanner: {
    color: '#b00020',
    fontSize: 14,
    marginBottom: 12,
  },
});
