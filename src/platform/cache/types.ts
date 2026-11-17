export type KeyValueCache = {
  has(key: string): Promise<boolean>;
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, bytes: Uint8Array): Promise<void>;
};

export type LoadThroughCacheOptions = {
  cacheKey: string;
  matches?: (bytes: Uint8Array) => Promise<boolean>;
  download: () => Promise<Uint8Array>;
  persist?: boolean;
};
