import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Don't retry 4xx (not found, forbidden, validation): they won't succeed on retry.
      retry: (count, err) => count < 2 && !(err?.response?.status >= 400 && err.response.status < 500),
      refetchOnWindowFocus: false,
    },
  },
});
