import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { AuctionItem } from '@/constants/auctionItems';
import { DJANGO_API_BASE } from '@/services/djangoApi';
import { authHeaders } from '@/state/slices/authSlice';

export type AuctionItemsState = {
  items: AuctionItem[];
  loading: boolean;
  error: string | null;
  generateDescriptionLoading: boolean;
  generateDescriptionError: string | null;
};

const initialState: AuctionItemsState = {
  items: [],
  loading: false,
  error: null,
  generateDescriptionLoading: false,
  generateDescriptionError: null,
};

const API_BASE = DJANGO_API_BASE;

type RootWithAuth = {
  auth: { accessToken: string | null };
};

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Normalize a Django auction item payload (exported for single-item fetch helpers). */
export function normalizeAuctionItem(raw: unknown): AuctionItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;

  const starting = toNumber(item.starting_price);
  const current = toNumber(item.current_price);

  // We only coerce the numeric fields that Django may serialize as strings (Decimal).
  if (starting === null || current === null) return null;

  return {
    ...(item as AuctionItem),
    starting_price: starting,
    current_price: current,
  };
}

export const fetchAuctionItems = createAsyncThunk<AuctionItem[], void, { rejectValue: string }>(
  'auctionItems/fetchAuctionItems',
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_BASE}/auctionItem/`);
      if (!res.ok) {
        return rejectWithValue(await readErrorMessage(res));
      }

      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        return rejectWithValue('Invalid items response from API.');
      }
      const normalized: AuctionItem[] = [];
      for (const row of data) {
        const item = normalizeAuctionItem(row);
        if (item) normalized.push(item);
      }
      return normalized;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to fetch items';
      return rejectWithValue(message);
    }
  }
);

export type CreateAuctionItemPayload = {
  auction_event: number;
  name: string;
  description: string;
  starting_price: number;
  status?: AuctionItem['status'];
  image_url?: string | null;
};

export const createAuctionItem = createAsyncThunk<
  AuctionItem,
  CreateAuctionItemPayload,
  { rejectValue: string; state: RootWithAuth }
>('auctionItems/createAuctionItem', async (payload, { rejectWithValue, getState }) => {
  try {
    const token = getState().auth.accessToken;
    if (!token) {
      return rejectWithValue('You must be signed in to add an item.');
    }

    const res = await fetch(`${API_BASE}/auctionItem/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({
        ...payload,
        status: payload.status ?? 'published',
        image_url: payload.image_url ?? null,
      }),
    });

    if (!res.ok) {
      return rejectWithValue(await readErrorMessage(res));
    }

    const data = (await res.json()) as unknown;
    const item = normalizeAuctionItem(data);
    if (!item) {
      return rejectWithValue('Invalid item response from API.');
    }
    return item;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create item';
    return rejectWithValue(message);
  }
});

export const generateAuctionItemDescription = createAsyncThunk<
  { description: string },
  { name: string },
  { rejectValue: string; state: RootWithAuth }
>(
  'auctionItems/generateAuctionItemDescription',
  async ({ name }, { rejectWithValue, getState }) => {
    try {
      const token = getState().auth.accessToken;
      if (!token) {
        return rejectWithValue('You must be signed in to generate a description.');
      }

      const res = await fetch(`${API_BASE}/ai/generate-item-description/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(token),
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        return rejectWithValue(await readErrorMessage(res));
      }

      const data = (await res.json()) as { description?: unknown };
      if (typeof data.description !== 'string' || !data.description.trim()) {
        return rejectWithValue('API returned no description.');
      }
      return { description: data.description };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to generate description';
      return rejectWithValue(message);
    }
  }
);

const auctionItemsSlice = createSlice({
  name: 'auctionItems',
  initialState,
  reducers: {
    setAuctionItems: (state, action: { payload: AuctionItem[] }) => {
      state.items = action.payload;
      state.error = null;
    },
    addAuctionItem: (state, action: { payload: AuctionItem }) => {
      state.items.push(action.payload);
      state.error = null;
    },
    clearAuctionItemsError: (state) => {
      state.error = null;
    },
    clearGenerateDescriptionError: (state) => {
      state.generateDescriptionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuctionItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuctionItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.error = null;
      })
      .addCase(fetchAuctionItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to fetch items';
      })
      .addCase(createAuctionItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createAuctionItem.fulfilled, (state, action) => {
        state.loading = false;
        state.items.push(action.payload);
        state.error = null;
      })
      .addCase(createAuctionItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to create item';
      })
      .addCase(generateAuctionItemDescription.pending, (state) => {
        state.generateDescriptionLoading = true;
        state.generateDescriptionError = null;
      })
      .addCase(generateAuctionItemDescription.fulfilled, (state) => {
        state.generateDescriptionLoading = false;
        state.generateDescriptionError = null;
      })
      .addCase(generateAuctionItemDescription.rejected, (state, action) => {
        state.generateDescriptionLoading = false;
        state.generateDescriptionError = action.payload ?? 'Failed to generate description';
      });
  },
});

export const {
  setAuctionItems,
  addAuctionItem,
  clearAuctionItemsError,
  clearGenerateDescriptionError,
} = auctionItemsSlice.actions;

export const selectAuctionItems = (state: { auctionItems: AuctionItemsState }): AuctionItem[] =>
  state.auctionItems.items;

export const selectAuctionItemsLoading = (state: { auctionItems: AuctionItemsState }): boolean =>
  state.auctionItems.loading;

export const selectAuctionItemsError = (state: {
  auctionItems: AuctionItemsState;
}): string | null => state.auctionItems.error;

export const selectGenerateDescriptionLoading = (state: {
  auctionItems: AuctionItemsState;
}): boolean => state.auctionItems.generateDescriptionLoading;

export const selectGenerateDescriptionError = (state: {
  auctionItems: AuctionItemsState;
}): string | null => state.auctionItems.generateDescriptionError;

export const selectAuctionItemsByEventId =
  (eventId: number) =>
  (state: { auctionItems: AuctionItemsState }): AuctionItem[] =>
    state.auctionItems.items.filter((item) => item.auction_event === eventId);

export const selectAuctionItemById =
  (id: number) =>
  (state: { auctionItems: AuctionItemsState }): AuctionItem | undefined =>
    state.auctionItems.items.find((item) => item.id === id);

type RootWithAuthItems = {
  auth: { user: { sub: string } | null };
  auctionItems: AuctionItemsState;
};

export const selectIsAuctionItemOwner =
  (item: AuctionItem) =>
  (state: RootWithAuthItems): boolean => {
    const sub = state.auth.user?.sub;
    return !!sub && item.owner_sub === sub;
  };

export const selectMyAuctionItemsByEventId =
  (eventId: number) =>
  (state: RootWithAuthItems): AuctionItem[] => {
    const sub = state.auth.user?.sub;
    if (!sub) return [];
    return state.auctionItems.items.filter(
      (item) => item.auction_event === eventId && item.owner_sub === sub
    );
  };

export default auctionItemsSlice.reducer;
