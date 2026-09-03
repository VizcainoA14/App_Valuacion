import type { JSX } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { queryClient } from '../ipc/consultas';
import { router } from './router';
import { LimiteError } from './LimiteError';

export function App(): JSX.Element {
  return (
    <LimiteError>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </LimiteError>
  );
}
