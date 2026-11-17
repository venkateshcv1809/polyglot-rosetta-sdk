import { PROSETTA_CATALOG_ARCHIVE_SUFFIX } from '../../config/constants';
import { parseJsonBytes } from '../../shared/json';
import { type CatalogManifest } from './manifest';

export type CatalogCategory = {
  id: string;
  title: string;
  description: string;
  downloaded: boolean;
};

export type CatalogListing = {
  id: string;
  title: string;
  description: string;
  categories: CatalogCategory[];
};

export function catalogIdFromArchive(path: string): string {
  return path.endsWith(PROSETTA_CATALOG_ARCHIVE_SUFFIX)
    ? path.slice(0, -PROSETTA_CATALOG_ARCHIVE_SUFFIX.length)
    : path;
}

export function archivePathFromCatalogId(id: string): string {
  return `${id}${PROSETTA_CATALOG_ARCHIVE_SUFFIX}`;
}

export function listingFromIndex(
  indexBytes: Uint8Array,
  manifest: CatalogManifest,
  downloaded: ReadonlySet<string>,
): CatalogListing {
  const parsed = parseJsonBytes(indexBytes, 'catalog index') as {
    id?: string;
    title?: string;
    description?: string;
    categories?: Array<{ id?: string; title?: string; description?: string }>;
  };

  const metadata = new Map(
    (parsed.categories ?? [])
      .filter((category): category is { id: string; title?: string; description?: string } =>
        typeof category.id === 'string',
      )
      .map((category) => [category.id, category]),
  );

  return {
    id: parsed.id ?? 'root',
    title: parsed.title ?? '',
    description: parsed.description ?? '',
    categories: manifest.categories.map((asset) => {
      const id = catalogIdFromArchive(asset.path);
      const category = metadata.get(id);

      return {
        id,
        title: category?.title ?? id,
        description: category?.description ?? '',
        downloaded: downloaded.has(asset.path),
      };
    }),
  };
}
