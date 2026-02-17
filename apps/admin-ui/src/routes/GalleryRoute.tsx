import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FilterBar } from '../components/layout/FilterBar';
import { PageHeader } from '../components/layout/PageHeader';
import {
  deleteGalleryImage,
  fetchGalleryImages,
  type GalleryImage,
  updateGalleryImage,
  uploadGalleryImage
} from '../lib/api';

export function GalleryRoute() {
  const [filter, setFilter] = useState({ query: '', tag: '', source: '' });
  const [uploading, setUploading] = useState(false);

  const gallery = useQuery({
    queryKey: ['gallery-images'],
    queryFn: fetchGalleryImages
  });

  const uploadMutation = useMutation({
    mutationFn: uploadGalleryImage,
    onSuccess: () => void gallery.refetch()
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: FormData }) => updateGalleryImage(id, data),
    onSuccess: () => void gallery.refetch()
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGalleryImage,
    onSuccess: () => void gallery.refetch()
  });

  const rows = useMemo(() => {
    const q = filter.query.trim().toLowerCase();
    if (!q) return gallery.data || [];
    return (gallery.data || []).filter((row) => {
      return [row.title_en, row.title_zh, row.alt_en, row.alt_zh, row.pet_type, row.tags.join(',')]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [gallery.data, filter.query]);

  return (
    <>
      <PageHeader
        title="Gallery Manager"
        description={`Total ${gallery.data?.length || 0} images`}
        primaryActionLabel="Refresh"
        onPrimaryAction={() => {
          void gallery.refetch();
        }}
      />

      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold text-ink">Upload Image</h2>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            setUploading(true);
            try {
              await uploadMutation.mutateAsync(data);
              form.reset();
            } finally {
              setUploading(false);
            }
          }}
        >
          <input required name="image" type="file" accept="image/*" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input required name="title_en" placeholder="Title EN" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input name="title_zh" placeholder="Title ZH" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input required name="alt_en" placeholder="Alt EN" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input name="alt_zh" placeholder="Alt ZH" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input name="tags" placeholder="Tags (comma separated)" className="h-11 rounded-lg border border-stone-300 px-3" />
          <input name="pet_type" placeholder="Pet Type" className="h-11 rounded-lg border border-stone-300 px-3" />
          <label className="flex items-center gap-2 text-sm text-stone-700"><input name="before_after" type="checkbox" /> Before/After</label>
          <label className="flex items-center gap-2 text-sm text-stone-700"><input name="featured" type="checkbox" /> Featured</label>
          <label className="flex items-center gap-2 text-sm text-stone-700"><input defaultChecked name="is_published" type="checkbox" /> Published</label>
          <button
            className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60 md:col-span-2"
            disabled={uploading || uploadMutation.isPending}
            type="submit"
          >
            {uploading || uploadMutation.isPending ? 'Uploading...' : 'Upload'}
          </button>
        </form>
      </section>

      <FilterBar query={filter.query} tag={filter.tag} source={filter.source} onChange={setFilter} />

      <section className="space-y-3">
        {rows.map((row) => (
          <GalleryCard
            key={row.id}
            row={row}
            onSave={async (id, data) => {
              await updateMutation.mutateAsync({ id, data });
            }}
            onDelete={async (id) => {
              await deleteMutation.mutateAsync(id);
            }}
          />
        ))}
      </section>
    </>
  );
}

function GalleryCard({
  row,
  onSave,
  onDelete
}: {
  row: GalleryImage;
  onSave: (id: number, data: FormData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">#{row.id} {row.title_en}</h3>
          <p className="text-xs text-stone-500">{row.created_at}</p>
        </div>
        <div className="text-xs text-stone-600">
          {row.is_published ? 'Published' : 'Draft'} / {row.featured ? 'Featured' : 'Normal'}
        </div>
      </div>

      {row.thumb_url ? (
        <img
          alt={row.alt_en}
          className="mb-3 h-44 w-full rounded-lg border border-stone-200 object-cover"
          src={row.thumb_url}
        />
      ) : null}

      <form
        className="grid gap-2 md:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          setSaving(true);
          try {
            await onSave(row.id, data);
          } finally {
            setSaving(false);
          }
        }}
      >
        <input defaultValue={row.title_en} name="title_en" required className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <input defaultValue={row.title_zh} name="title_zh" className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <input defaultValue={row.alt_en} name="alt_en" required className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <input defaultValue={row.alt_zh} name="alt_zh" className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <input defaultValue={row.tags.join(', ')} name="tags" className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <input defaultValue={row.pet_type} name="pet_type" className="h-10 rounded-lg border border-stone-300 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm text-stone-700"><input defaultChecked={Boolean(row.before_after)} name="before_after" type="checkbox" /> Before/After</label>
        <label className="flex items-center gap-2 text-sm text-stone-700"><input defaultChecked={Boolean(row.featured)} name="featured" type="checkbox" /> Featured</label>
        <label className="flex items-center gap-2 text-sm text-stone-700"><input defaultChecked={Boolean(row.is_published)} name="is_published" type="checkbox" /> Published</label>
        <div className="flex gap-2 md:col-span-2">
          <button className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-white" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            className="h-10 rounded-lg border border-stone-300 px-4 text-sm"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDelete(row.id);
              } finally {
                setDeleting(false);
              }
            }}
            type="button"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </form>
    </article>
  );
}
