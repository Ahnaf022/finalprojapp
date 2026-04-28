import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

type Item = Record<string, any>;

const KEY = 'auction_items_demo';

function loadItems(): Item[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function saveItems(items: Item[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

function priceFrom(x: any) {
  const n = Number(x?.current_price ?? x?.starting_price ?? x?.startingPrice ?? x?.price ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function eventFrom(x: any) {
  const n = Number(x?.eventId ?? x?.event_id ?? x?.auction_event ?? x?.auctionEvent ?? x?.event ?? 1);
  return Number.isFinite(n) ? n : 1;
}
type AuctionItemsState = {
  items: Item[];
  loading: boolean;
  error: string | null;
  createLoading: boolean;
  createError: string | null;
  generateDescriptionLoading: boolean;
  generateDescriptionError: string | null;
  generatedDescription: string | null;
};

const initialState: AuctionItemsState = {
  items: [],
  loading: false,
  error: null,
  createLoading: false,
  createError: null,
  generateDescriptionLoading: false,
  generateDescriptionError: null,
  generatedDescription: null,
};

function makeItem(x: any): Item {
  const eventId = eventFrom(x);
  const price = priceFrom(x);
  const now = new Date().toISOString();

  return {
    id: Date.now(),
    name: x?.name || 'Auction item',
    description: x?.description || '',
    starting_price: price,
    current_price: price,
    status: x?.status || 'published',
    event: eventId,
    event_id: eventId,
    auction_event: eventId,
    auctionEvent: eventId,
    created_at: now,
    updated_at: now,
  };
}

export const fetchAuctionItems = createAsyncThunk('auctionItems/fetchAuctionItems', async () => {
  return loadItems();
});

export const createAuctionItem = createAsyncThunk('auctionItems/createAuctionItem', async (payload: any) => {
  const items = loadItems();
  const item = makeItem(payload);
  const updated = [item, ...items];
  saveItems(updated);
  return item;
});

export const addAuctionItem = createAuctionItem;
export const generateItemDescription = createAsyncThunk(
  'auctionItems/generateItemDescription',
  async (payload: any) => {
    const name = payload?.name || 'This item';
    return { description: `${name} is available for this auction event. Condition not specified. Please review the item details before placing a bid.` };
  }
);

const auctionItemsSlice = createSlice({
  name: 'auctionItems',
  initialState,
  reducers: {
    clearAuctionItemsError(state) {
      state.error = null;
      state.createError = null;
      state.generateDescriptionError = null;
    },
    clearAuctionItemError(state) {
      state.error = null;
      state.createError = null;
      state.generateDescriptionError = null;
    },
    resetAuctionItems(state) {
      state.items = [];
      saveItems([]);
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
      })
      .addCase(createAuctionItem.pending, (state) => {
        state.createLoading = true;
        state.createError = null;
      })
      .addCase(createAuctionItem.fulfilled, (state, action) => {
        state.createLoading = false;
        state.items = [action.payload, ...state.items];
        saveItems(state.items);
      })
      .addCase(generateItemDescription.fulfilled, (state, action) => {
        state.generateDescriptionLoading = false;
        state.generatedDescription = action.payload.description;
      });
  },
});
const selectSlice = (state: any): AuctionItemsState => state.auctionItems || initialState;

export const selectAuctionItems = (state: any) => selectSlice(state).items;
export const selectAuctionItemsLoading = (state: any) => selectSlice(state).loading;
export const selectAuctionItemsError = (state: any) => selectSlice(state).error;

export const selectAuctionItemCreateLoading = (state: any) => selectSlice(state).createLoading;
export const selectAuctionItemCreateError = (state: any) => selectSlice(state).createError;
export const selectCreateAuctionItemLoading = selectAuctionItemCreateLoading;
export const selectCreateAuctionItemError = selectAuctionItemCreateError;

export const selectGenerateDescriptionLoading = (state: any) => selectSlice(state).generateDescriptionLoading;
export const selectGenerateDescriptionError = (state: any) => selectSlice(state).generateDescriptionError;
export const selectGeneratedDescription = (state: any) => selectSlice(state).generatedDescription;
export const generateAuctionItemDescription = generateItemDescription;

export const selectAuctionItemsByEventId = (eventId: any) => (state: any) => {
  const target = String(eventId ?? '');
  return selectAuctionItems(state).filter((item: Item) =>
    [item.event, item.event_id, item.auction_event, item.auctionEvent].some((value) => String(value) === target)
  );
};

export const selectAuctionItemById = (id: any) => (state: any) => {
  const target = String(id ?? '');
  return selectAuctionItems(state).find((item: Item) => String(item.id) === target);
};

export const { clearAuctionItemsError, clearAuctionItemError, resetAuctionItems } = auctionItemsSlice.actions;
export const clearGenerateDescriptionError = clearAuctionItemsError;

export default auctionItemsSlice.reducer;
