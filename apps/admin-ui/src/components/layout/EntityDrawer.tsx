import * as Dialog from '@radix-ui/react-dialog';

type Props = {
  open: boolean;
  title: string;
  detail: Record<string, unknown> | null;
  onOpenChange: (open: boolean) => void;
};

export function EntityDrawer({ open, title, detail, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed right-0 top-0 h-full w-full max-w-lg overflow-auto bg-white p-6 shadow-2xl">
          <Dialog.Title className="font-display text-2xl text-ink">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-stone-600">Entity details from `/api/docs/:id`</Dialog.Description>
          <pre className="mt-4 overflow-auto rounded-lg border border-stone-200 bg-stone-50 p-4 text-xs leading-5 text-ink">
            {detail ? JSON.stringify(detail, null, 2) : 'No data'}
          </pre>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
