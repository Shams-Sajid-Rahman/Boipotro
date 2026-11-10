import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const get = (url, params) => api.get(url, { params }).then((r) => r.data);

// ---------- Public catalogue ----------

export const useSiteContent = () =>
  useQuery({ queryKey: ['site-content'], queryFn: () => get('/site-content').then((d) => d.data), staleTime: 10 * 60_000 });

export const useCategories = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => get('/categories').then((d) => d.data), staleTime: 10 * 60_000 });

export const useUniversities = () =>
  useQuery({ queryKey: ['universities'], queryFn: () => get('/universities').then((d) => d.data), staleTime: 10 * 60_000 });

// Viewer id in keys: wishlist hearts differ per user.
export function useListings(params) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listings', params, user?.id],
    queryFn: () => get('/listings', params),
    placeholderData: keepPreviousData,
  });
}

export function useFeaturedListings(by = 'popular') {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listings', 'featured', by, user?.id],
    queryFn: () => get('/listings/featured', { by }).then((d) => d.data),
  });
}

export function useListing(id) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['listing', String(id), user?.id],
    queryFn: () => get(`/listings/${id}`).then((d) => d.listing),
    enabled: Boolean(id),
    // Each fetch counts as a view; don't refetch on every remount.
    staleTime: 5 * 60_000,
  });
}

export const useSellerReviews = (sellerId) =>
  useQuery({
    queryKey: ['reviews', sellerId],
    queryFn: () => get(`/users/${sellerId}/reviews`).then((d) => d.data),
    enabled: Boolean(sellerId),
  });

// ---------- My listings ----------

export const useMyListings = () =>
  useQuery({ queryKey: ['my-listings'], queryFn: () => get('/users/me/listings').then((d) => d.data) });

/** Invalidate everything that shows listings after a change. */
function useInvalidateListings() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ['listings', 'listing', 'my-listings', 'wishlist', 'offers'].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}

export function useSaveListing(id) {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (formData) =>
      (id ? api.patch(`/listings/${id}`, formData) : api.post('/listings', formData)).then((r) => r.data.listing),
    onSuccess: invalidate,
  });
}

export function useUpdateListingStatus() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/listings/${id}/status`, { status }).then((r) => r.data.listing),
    onSuccess: invalidate,
  });
}

export function useDeleteListing() {
  const invalidate = useInvalidateListings();
  return useMutation({ mutationFn: (id) => api.delete(`/listings/${id}`), onSuccess: invalidate });
}

// ---------- Wishlist ----------

export const useWishlist = () =>
  useQuery({ queryKey: ['wishlist'], queryFn: () => get('/wishlist').then((d) => d.data) });

export function useToggleWishlist() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ listingId, add }) =>
      add ? api.post(`/wishlist/${listingId}`) : api.delete(`/wishlist/${listingId}`),
    onSuccess: invalidate,
  });
}

// ---------- Offers / reviews / reports ----------

export const useOffers = (direction) =>
  useQuery({ queryKey: ['offers', direction], queryFn: () => get(`/offers/${direction}`).then((d) => d.data) });

export function useMakeOffer(listingId) {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: (body) => api.post(`/listings/${listingId}/offers`, body).then((r) => r.data.offer),
    onSuccess: invalidate,
  });
}

export function useUpdateOffer() {
  const invalidate = useInvalidateListings();
  return useMutation({
    mutationFn: ({ id, status }) => api.patch(`/offers/${id}`, { status }).then((r) => r.data.offer),
    onSuccess: invalidate,
  });
}

export function useCreateReview(listingId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body) => api.post(`/listings/${listingId}/reviews`, body).then((r) => r.data.review),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['listing'] });
      qc.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export const useReportListing = (listingId) =>
  useMutation({ mutationFn: (body) => api.post(`/listings/${listingId}/reports`, body) });

// ---------- Profile / contact ----------

export function useUpdateProfile() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (body) => api.patch('/users/me', body).then((r) => r.data.user),
    onSuccess: setUser,
  });
}

export const useSendContact = () => useMutation({ mutationFn: (body) => api.post('/contact', body) });

// ---------- Conversations ----------

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['unread'],
    queryFn: () => get('/conversations/unread-count').then((d) => d.unread),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
}

export const useConversations = () =>
  useQuery({ queryKey: ['conversations'], queryFn: () => get('/conversations').then((d) => d.data) });

/** Pages go newest -> oldest; pass the oldest id as `before` to load more. */
export const useMessages = (conversationId) =>
  useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: ({ pageParam }) => get(`/conversations/${conversationId}/messages`, { before: pageParam, limit: 30 }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore ? last.data[0]?.id : undefined),
    enabled: Boolean(conversationId),
  });

export function useStartConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (listingId) => api.post('/conversations', { listingId }).then((r) => r.data.conversation),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversations'] }),
  });
}

// ---------- Admin ----------

export const useAdminStats = () =>
  useQuery({ queryKey: ['admin', 'stats'], queryFn: () => get('/admin/stats').then((d) => d.stats) });

export const useAdminList = (resource, params) =>
  useQuery({
    queryKey: ['admin', resource, params],
    queryFn: () => get(`/admin/${resource}`, params),
    placeholderData: keepPreviousData,
  });

export function useAdminAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ method, url, body }) => api.request({ method, url: `/admin${url}`, data: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] });
      qc.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}
