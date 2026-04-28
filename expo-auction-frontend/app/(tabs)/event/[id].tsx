import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, useTheme } from 'react-native-paper';

import type { AuctionItem } from '@/constants/auctionItems';
import type { AuctionEvent } from '@/constants/events';
import { useAppDispatch, useAppSelector } from '@/state/hooks';
import { displayNameForSub, selectCurrentUser } from '@/state/slices/authSlice';
import {
  fetchEvents,
  selectEvents,
  selectEventsLoading,
  selectEventsError,
} from '@/state/slices/eventsSlice';
import {
  fetchAuctionItems,
  selectAuctionItemsByEventId,
  selectAuctionItems,
  selectAuctionItemsLoading,
  selectAuctionItemsError,
} from '@/state/slices/auctionItemsSlice';

function readErrorMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Unable to load data.";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function ItemCard({ item, ownerLabel }: { item: AuctionItem; ownerLabel: string }) {
  const descriptionSnippet =
    item.description.length > 100 ? `${item.description.slice(0, 100)}...` : item.description;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.cardSeller}>Seller: {ownerLabel}</Text>
      <Text style={styles.cardDescription}>{descriptionSnippet}</Text>
      <View style={styles.cardRow}>
        <Text style={styles.cardPrice}>${item.current_price.toFixed(2)}</Text>
        <Text style={styles.cardStatus}>{item.status}</Text>
      </View>
    </View>
  );
}

export default function EventItemScreen() {
  const router = useRouter();
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { id, eventJson } = useLocalSearchParams<{ id?: string; eventJson?: string }>();

  const events = useAppSelector(selectEvents);
  const eventsLoading = useAppSelector(selectEventsLoading);
  const eventsError = useAppSelector(selectEventsError);
  const itemsLoading = useAppSelector(selectAuctionItemsLoading);
  const itemsError = useAppSelector(selectAuctionItemsError);
  const currentUser = useAppSelector(selectCurrentUser);

  const eventId = useMemo(() => {
    const parsed = id ? Number(id) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  }, [id]);

  const routeEvent = useMemo(() => {
    if (!eventJson) return null;
    try {
      return JSON.parse(eventJson) as AuctionEvent;
    } catch {
      return null;
    }
  }, [eventJson]);

  const storeEvent =
    eventId === null ? null : (events.find((candidate) => String(candidate.id) === String(eventId)) ?? null);
  const event = routeEvent ?? storeEvent;

  const itemsForEvent = useAppSelector(selectAuctionItemsByEventId(eventId ?? routeEvent?.id ?? 0));

  useEffect(() => {
    void dispatch(fetchEvents());
    void dispatch(fetchAuctionItems());
  }, [dispatch]);

  if (eventId === null) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Event id is missing.</Text>
      </View>
    );
  }

  if (!event && eventsLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{eventsError || 'Event not found.'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{event.name}</Text>

      <View style={styles.section}>
        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>
          {event.city}, {event.state} {event.zip_code}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Starts</Text>
        <Text style={styles.value}>{formatDateTime(event.start_datetime ?? '')}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Ends</Text>
        <Text style={styles.value}>{formatDateTime(event.end_datetime ?? '')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{event.is_active ? 'Active' : 'Ended'}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Organizer</Text>
        <Text style={styles.value}>
          {displayNameForSub(event.created_by_sub ?? '', currentUser, event.created_by_display_name)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Created</Text>
        <Text style={styles.value}>{formatDateTime(event.created_at ?? '')}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Updated</Text>
        <Text style={styles.value}>{formatDateTime(event.updated_at ?? '')}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Auction items</Text>
          <Button
            mode="contained"
            compact
            onPress={() =>
              router.push({
                pathname: '/(tabs)/addItem',
                params: { eventId: String(event.id) },
              })
            }>
            Add
          </Button>
        </View>

        {itemsLoading ? (
          <View style={styles.itemsLoadingRow}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading items...</Text>
          </View>
        ) : itemsError ? (
          <Text style={styles.error}>{itemsError}</Text>
        ) : itemsForEvent.length === 0 ? (
          <Text style={styles.emptyItems}>No items in this auction yet.</Text>
        ) : (
          itemsForEvent.map((item) => (
            <ItemCard
              key={item.id}
              item={item as any}
              ownerLabel={displayNameForSub(item.owner_sub, currentUser, item.owner_display_name)}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#111',
  },
  error: {
    fontSize: 15,
    color: '#b00020',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  emptyItems: {
    fontSize: 15,
    color: '#666',
    fontStyle: 'italic',
  },
  itemsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#555',
  },
  card: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111',
    marginBottom: 6,
  },
  cardSeller: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
    lineHeight: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  cardStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textTransform: 'capitalize',
  },
});
