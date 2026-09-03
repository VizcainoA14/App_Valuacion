/** Diálogo modal accesible sobre Radix: foco atrapado, Esc cierra, título obligatorio. */
import type { JSX, ReactNode } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../ui';

export function Dialogo({ abierto, onCambioAbierto, titulo, descripcion, children, ancho = 'md', pie }: { abierto: boolean; onCambioAbierto: (abierto: boolean) => void; titulo: string; descripcion?: string | undefined; children: ReactNode; ancho?: 'md' | 'lg' | 'xl' | undefined; pie?: ReactNode | undefined }): JSX.Element {
  const anchos = { md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <RadixDialog.Root open={abierto} onOpenChange={onCambioAbierto}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <RadixDialog.Content className={cn('fixed left-1/2 top-[8vh] z-50 flex max-h-[84vh] w-[calc(100%-2rem)] -translate-x-1/2 flex-col rounded-lg border border-borde bg-elevada shadow-xl', anchos[ancho])}>
          <header className="flex items-start justify-between gap-4 border-b border-borde px-5 py-3">
            <div>
              <RadixDialog.Title className="text-md font-semibold text-texto">{titulo}</RadixDialog.Title>
              {descripcion !== undefined ? <RadixDialog.Description className="text-sm text-texto-secundario">{descripcion}</RadixDialog.Description> : <RadixDialog.Description className="sr-only">{titulo}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close aria-label="Cerrar" className="inline-flex h-7 w-7 items-center justify-center rounded text-texto-secundario hover:bg-superficie">
              <X className="h-4 w-4" aria-hidden />
            </RadixDialog.Close>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {pie !== undefined && <footer className="flex justify-end gap-2 border-t border-borde px-5 py-3">{pie}</footer>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
