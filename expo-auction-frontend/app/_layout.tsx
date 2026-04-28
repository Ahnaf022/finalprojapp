import 'react-native-get-random-values';

import { Provider } from 'react-redux';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';

import { store } from '@/state/slices/store';


const API_HOST = 'http://3.138.107.95:8000';

if (typeof globalThis !== 'undefined' && !(globalThis as any).__auctionFetchPatched) {
  const originalFetch = globalThis.fetch.bind(globalThis);
  (globalThis as any).__auctionFetchPatched = true;

  globalThis.fetch = ((input: any, init?: any) => {
    let url = typeof input === 'string' ? input : input?.url ?? String(input);

    url = url.replace('http://localhost:8000', API_HOST);
    url = url.replace('http://127.0.0.1:8000', API_HOST);
    url = url.replace('http://3.138.107.95:8081/api/', API_HOST + '/api/');
    url = url.replace(/^\/api\//, API_HOST + '/api/');
    url = url.replace(/^\/auctionItem\//, API_HOST + '/api/auctionItem/');
    url = url.replace(/^\/auctionEvent\//, API_HOST + '/api/auctionEvent/');
    url = url.replace(API_HOST + '/api/items/', API_HOST + '/api/auctionItem/');
    url = url.replace(API_HOST + '/api/items', API_HOST + '/api/auctionItem/');
    url = url.replace(API_HOST + '/items/', API_HOST + '/api/auctionItem/');
    url = url.replace(API_HOST + '/items', API_HOST + '/api/auctionItem/');
    url = url.replace(API_HOST + '/api/api/', API_HOST + '/api/');

    return originalFetch(url, init);
  }) as any;
}


export default function Layout() {
  return (
    <Provider store={store}>
      <PaperProvider>
        <Stack screenOptions={{ headerShown: true }}>
          {/* Hide root stack chrome for grouped routes (otherwise titles show as "(tabs)" / "(auth)"). */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </Provider>
  );
}
