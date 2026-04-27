import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Text, useTheme } from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '@/state/hooks';
import {
  fetchAuctionItems,
  selectAuctionItems,
  selectAuctionItemsError,
  selectAuctionItemsLoading,
} from '@/state/slices/auctionItemsSlice';

export default function ItemsScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const items = useAppSelector(selectAuctionItems);
  const loading = useAppSelector(selectAuctionItemsLoading);
  const error = useAppSelector(selectAuctionItemsError);

  useEffect(() => {
    void dispatch(fetchAuctionItems());
  }, [dispatch]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Items
      </Text>
      <Text variant="bodySmall" style={styles.subtitle}>
        All auction items currently stored in the Django SQLite database.
      </Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : items.length === 0 ? (
        <Text style={styles.emptyText}>No items yet. Open an event and add one.</Text>
      ) : (
        items.map((item) => (
          <Card key={String(item.id)} style={styles.card} mode="elevated">
            <Card.Content>
              <Text variant="titleMedium">{item.name}</Text>
              <Text variant="bodySmall" style={styles.meta}>
                ${item.current_price.toFixed(2)} · {item.status}
              </Text>
              <Text variant="bodyMedium" numberOfLines={2}>
                {item.description}
              </Text>
              {item.status === 'published' ? (
                <Button
                  mode="contained"
                  compact
                  style={styles.buy}
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/itemCheckout/[itemId]',
                      params: { itemId: String(item.id) },
                    })
                  }>
                  Buy
                </Button>
              ) : null}
            </Card.Content>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: 6,
  },
  subtitle: {
    color: '#666',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  meta: {
    color: '#666',
    marginTop: 6,
    marginBottom: 4,
  },
  eventName: {
    color: '#555',
    marginBottom: 8,
  },
  errorText: {
    color: '#c00',
  },
  emptyText: {
    color: '#666',
    fontStyle: 'italic',
  },
});
