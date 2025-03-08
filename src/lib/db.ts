/**
 * db.ts - IndexedDB Utility Library
 * A comprehensive set of utilities for working with IndexedDB
 */

export type PieChartData = {
  name: string; // category name
  value: number; // number of items in category
};

export type QuickReportData = {
  category: string; // category name
  percent: number; // number of items in category / total items
};

export type Activity = {
  activity: string;
  count: number;
};

export type DetailedReportData = {
  category: string; // category name
  activities: Activity[]; // list of activities in category
};

export type ReportData = {
  pieChart: PieChartData[];
  quickReport: QuickReportData[];
  detailedReport: DetailedReportData[];
};

export type StoreConfig = {
  name: string;
  keyPath: string;
  autoIncrement?: boolean;
  indices?: {
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }[];
};

export type DBConfig = {
  name: string;
  version: number;
  stores: StoreConfig[];
};

// Main DB class for handling IndexedDB operations
export class IndexedDB {
  private dbName: string;
  private dbVersion: number;
  private storeConfigs: StoreConfig[];
  private db: IDBDatabase | null = null;

  /**
   * Create a new IndexedDB instance
   * @param config Database configuration
   */
  constructor(config: DBConfig) {
    this.dbName = config.name;
    this.dbVersion = config.version;
    this.storeConfigs = config.stores;
  }

  /**
   * Initialize the database connection
   * @returns Promise that resolves when the database is opened
   */
  public async connect(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = (event) => {
        reject(`Error opening database: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create or update object stores based on configuration
        this.storeConfigs.forEach((storeConfig) => {
          let objectStore: IDBObjectStore;

          // Create the store if it doesn't exist
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            objectStore = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
              autoIncrement: storeConfig.autoIncrement || false,
            });
          } else {
            // Get existing store for index creation
            const transaction = (event.target as IDBOpenDBRequest).transaction;
            if (!transaction) return;
            objectStore = transaction.objectStore(storeConfig.name);
          }

          // Create indices
          if (storeConfig.indices) {
            storeConfig.indices.forEach((indexConfig) => {
              // Skip if index already exists
              if (!objectStore.indexNames.contains(indexConfig.name)) {
                objectStore.createIndex(
                  indexConfig.name,
                  indexConfig.keyPath,
                  indexConfig.options,
                );
              }
            });
          }
        });
      };
    });
  }

  /**
   * Close the database connection
   */
  public close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Delete the entire database
   * @returns Promise that resolves when the database is deleted
   */
  public deleteDatabase(): Promise<void> {
    this.close();

    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);

      request.onerror = (event) => {
        reject(
          `Error deleting database: ${(event.target as IDBRequest).error}`,
        );
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Add an item to a store
   * @param storeName Name of the store
   * @param item Item to add
   * @returns Promise that resolves with the key of the added item
   */
  public async add<T>(storeName: string, item: T): Promise<IDBValidKey> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(item);

      request.onerror = (event) => {
        reject(`Error adding item: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Add multiple items to a store in a single transaction
   * @param storeName Name of the store
   * @param items Array of items to add
   * @returns Promise that resolves when all items are added
   */
  public async addMultiple<T>(storeName: string, items: T[]): Promise<void> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);

      transaction.onerror = (event) => {
        reject(`Error in bulk add: ${(event.target as IDBTransaction).error}`);
      };

      transaction.oncomplete = () => {
        resolve();
      };

      items.forEach((item) => {
        store.add(item);
      });
    });
  }

  /**
   * Put an item in a store (add or update)
   * @param storeName Name of the store
   * @param item Item to put
   * @returns Promise that resolves with the key of the put item
   */
  public async put<T>(storeName: string, item: T): Promise<IDBValidKey> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.put(item);

      request.onerror = (event) => {
        reject(`Error putting item: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Update an item in a store
   * @param storeName Name of the store
   * @param key Key of the item to update
   * @param updateFn Function that takes the current value and returns the updated value
   * @returns Promise that resolves with the updated item
   */
  public async update<T>(
    storeName: string,
    key: IDBValidKey,
    updateFn: (currentValue: T) => T,
  ): Promise<T> {
    await this.connect();

    return new Promise(async (resolve, reject) => {
      try {
        // Get the current value
        const currentValue = await this.get<T>(storeName, key);
        if (!currentValue) {
          reject(`Item with key ${key} not found for update`);
          return;
        }

        // Apply the update function
        const updatedValue = updateFn(currentValue);

        // Put the updated value
        await this.put(storeName, updatedValue);
        resolve(updatedValue);
      } catch (error) {
        reject(`Error updating item: ${error}`);
      }
    });
  }

  /**
   * Delete an item from a store
   * @param storeName Name of the store
   * @param key Key of the item to delete
   * @returns Promise that resolves when the item is deleted
   */
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = (event) => {
        reject(`Error deleting item: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clear all items from a store
   * @param storeName Name of the store to clear
   * @returns Promise that resolves when the store is cleared
   */
  public async clear(storeName: string): Promise<void> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = (event) => {
        reject(`Error clearing store: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Get an item from a store by its key
   * @param storeName Name of the store
   * @param key Key of the item to get
   * @returns Promise that resolves with the item or undefined if not found
   */
  public async get<T>(
    storeName: string,
    key: IDBValidKey,
  ): Promise<T | undefined> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = (event) => {
        reject(`Error getting item: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Check if an item exists in a store
   * @param storeName Name of the store
   * @param key Key to check
   * @returns Promise that resolves with a boolean indicating if the item exists
   */
  public async exists(storeName: string, key: IDBValidKey): Promise<boolean> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.count(key);

      request.onerror = (event) => {
        reject(
          `Error checking existence: ${(event.target as IDBRequest).error}`,
        );
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result > 0);
      };
    });
  }

  /**
   * Get all items from a store
   * @param storeName Name of the store
   * @returns Promise that resolves with all items in the store
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = (event) => {
        reject(
          `Error getting all items: ${(event.target as IDBRequest).error}`,
        );
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Get all keys from a store
   * @param storeName Name of the store
   * @returns Promise that resolves with all keys in the store
   */
  public async getAllKeys(storeName: string): Promise<IDBValidKey[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAllKeys();

      request.onerror = (event) => {
        reject(`Error getting all keys: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Count items in a store
   * @param storeName Name of the store
   * @param query Optional key or range to count
   * @returns Promise that resolves with the count
   */
  public async count(
    storeName: string,
    query?: IDBValidKey | IDBKeyRange,
  ): Promise<number> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = query ? store.count(query) : store.count();

      request.onerror = (event) => {
        reject(`Error counting items: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Get items from a store by index
   * @param storeName Name of the store
   * @param indexName Name of the index
   * @param key Value to match in the index
   * @returns Promise that resolves with matching items
   */
  public async getByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey | IDBKeyRange,
  ): Promise<T[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(key);

      request.onerror = (event) => {
        reject(
          `Error getting items by index: ${(event.target as IDBRequest).error}`,
        );
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Get a single item from a store by index
   * @param storeName Name of the store
   * @param indexName Name of the index
   * @param key Value to match in the index
   * @returns Promise that resolves with the first matching item or undefined
   */
  public async getOneByIndex<T>(
    storeName: string,
    indexName: string,
    key: IDBValidKey | IDBKeyRange,
  ): Promise<T | undefined> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.get(key);

      request.onerror = (event) => {
        reject(
          `Error getting item by index: ${(event.target as IDBRequest).error}`,
        );
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result);
      };
    });
  }

  /**
   * Search for items in a store using a cursor
   * @param storeName Name of the store
   * @param searchParams Search configuration
   * @returns Promise that resolves with matching items
   */
  public async search<T>(
    storeName: string,
    searchParams: {
      index?: string;
      range?: IDBKeyRange;
      limit?: number;
      direction?: IDBCursorDirection;
      filter?: (item: T) => boolean;
    } = {},
  ): Promise<T[]> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const target = searchParams.index
        ? store.index(searchParams.index)
        : store;
      const results: T[] = [];

      // Default direction is 'next'
      const direction = searchParams.direction || "next";
      const request = target.openCursor(searchParams.range, direction);

      request.onerror = (event) => {
        reject(`Error searching: ${(event.target as IDBRequest).error}`);
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest)
          .result as IDBCursorWithValue;

        if (cursor) {
          const item = cursor.value as T;

          // Apply custom filter if provided
          if (!searchParams.filter || searchParams.filter(item)) {
            results.push(item);
          }

          // Check if we've reached the limit
          if (searchParams.limit && results.length >= searchParams.limit) {
            resolve(results);
          } else {
            cursor.continue();
          }
        } else {
          // No more results
          resolve(results);
        }
      };
    });
  }

  /**
   * Create a range for search queries
   */
  public static createRange = {
    /**
     * Create a range for values only equal to the given value
     * @param value Value to match
     */
    only: (value: IDBValidKey): IDBKeyRange => IDBKeyRange.only(value),

    /**
     * Create a range for values less than the given value
     * @param upper Upper bound (exclusive)
     */
    lessThan: (upper: IDBValidKey): IDBKeyRange =>
      IDBKeyRange.upperBound(upper, true),

    /**
     * Create a range for values less than or equal to the given value
     * @param upper Upper bound (inclusive)
     */
    lessThanOrEqual: (upper: IDBValidKey): IDBKeyRange =>
      IDBKeyRange.upperBound(upper, false),

    /**
     * Create a range for values greater than the given value
     * @param lower Lower bound (exclusive)
     */
    greaterThan: (lower: IDBValidKey): IDBKeyRange =>
      IDBKeyRange.lowerBound(lower, true),

    /**
     * Create a range for values greater than or equal to the given value
     * @param lower Lower bound (inclusive)
     */
    greaterThanOrEqual: (lower: IDBValidKey): IDBKeyRange =>
      IDBKeyRange.lowerBound(lower, false),

    /**
     * Create a range for values between the given bounds
     * @param lower Lower bound
     * @param upper Upper bound
     * @param lowerExclusive Whether the lower bound is exclusive
     * @param upperExclusive Whether the upper bound is exclusive
     */
    between: (
      lower: IDBValidKey,
      upper: IDBValidKey,
      lowerExclusive = false,
      upperExclusive = false,
    ): IDBKeyRange =>
      IDBKeyRange.bound(lower, upper, lowerExclusive, upperExclusive),

    /**
     * Create a range for string prefix searches
     * @param prefix String prefix to match
     */
    prefix: (prefix: string): IDBKeyRange => {
      // For prefix search, create a range from the prefix to the prefix + MAX_CHAR
      const MAX_CHAR = String.fromCharCode(0xffff);
      const upperBound = prefix + MAX_CHAR;
      return IDBKeyRange.bound(prefix, upperBound, false, true);
    },
  };

  /**
   * Full-text search implementation for indexedDB
   * @param storeName Name of the store
   * @param query Search query string
   * @param fields Fields to search in
   * @param options Search options
   * @returns Promise that resolves with matching items and their scores
   */
  public async fullTextSearch<T>(
    storeName: string,
    query: string,
    fields: string[],
    options: {
      limit?: number;
      caseSensitive?: boolean;
      matchWholeWord?: boolean;
      fuzzyMatch?: boolean;
      fuzzyMatchThreshold?: number;
    } = {},
  ): Promise<Array<{ item: T; score: number }>> {
    // Get all items from the store
    const items = await this.getAll<T>(storeName);

    if (!query || query.trim() === "") {
      return items.map((item) => ({ item, score: 0 }));
    }

    // Process query
    const processedQuery = options.caseSensitive ? query : query.toLowerCase();
    const queryTerms = processedQuery
      .split(/\s+/)
      .filter((term) => term.length > 0);

    // Score function for exact matches
    const getExactMatchScore = (text: string, term: string): number => {
      const processedText = options.caseSensitive ? text : text.toLowerCase();

      if (options.matchWholeWord) {
        // Match whole word
        const regex = new RegExp(
          `\\b${term}\\b`,
          options.caseSensitive ? "" : "i",
        );
        return regex.test(processedText) ? 1 : 0;
      } else {
        // Match anywhere in the text
        return processedText.includes(term) ? 1 : 0;
      }
    };

    // Simple Levenshtein distance implementation for fuzzy matching
    const levenshteinDistance = (a: string, b: string): number => {
      const matrix: number[][] = [];

      // Initialize matrix
      for (let i = 0; i <= a.length; i++) {
        matrix[i] = [i];
      }

      for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
      }

      // Fill matrix
      for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          matrix[i][j] = Math.min(
            matrix[i - 1][j] + 1, // deletion
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j - 1] + cost, // substitution
          );
        }
      }

      return matrix[a.length][b.length];
    };

    // Get fuzzy match score
    const getFuzzyMatchScore = (text: string, term: string): number => {
      // For very short terms, require exact match
      if (term.length <= 3) {
        return getExactMatchScore(text, term);
      }

      const processedText = options.caseSensitive ? text : text.toLowerCase();
      const words = processedText.split(/\s+/);

      let bestScore = 0;

      for (const word of words) {
        // Skip very short words for fuzzy matching
        if (word.length < 3) continue;

        const distance = levenshteinDistance(word, term);
        const maxLength = Math.max(word.length, term.length);
        const similarityScore = 1 - distance / maxLength;

        // Only consider matches above threshold
        const threshold = options.fuzzyMatchThreshold || 0.7;
        if (similarityScore >= threshold && similarityScore > bestScore) {
          bestScore = similarityScore;
        }
      }

      return bestScore;
    };

    // Calculate score for each item
    const results = items.map((item) => {
      let totalScore = 0;

      // Score each field
      for (const field of fields) {
        // Get field value (handle nested fields with dot notation)
        const fieldValue = field
          .split(".")
          .reduce(
            (obj: any, key) => (obj && obj[key] !== undefined ? obj[key] : ""),
            item as any,
          );

        // Skip if field value is not a string
        if (typeof fieldValue !== "string") continue;

        // Score each term
        for (const term of queryTerms) {
          if (options.fuzzyMatch) {
            totalScore += getFuzzyMatchScore(fieldValue, term);
          } else {
            totalScore += getExactMatchScore(fieldValue, term);
          }
        }
      }

      return { item, score: totalScore };
    });

    // Filter out items with zero score and sort by score (descending)
    const sortedResults = results
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score);

    // Apply limit if specified
    if (options.limit && options.limit > 0) {
      return sortedResults.slice(0, options.limit);
    }

    return sortedResults;
  }

  /**
   * Execute multiple operations in a single transaction
   * @param storeName Name of the store
   * @param mode Transaction mode
   * @param callback Function to execute within the transaction
   * @returns Promise that resolves with the result of the callback
   */
  public async transaction<T>(
    storeName: string | string[],
    mode: IDBTransactionMode,
    callback: (
      store: IDBObjectStore | { [name: string]: IDBObjectStore },
    ) => Promise<T>,
  ): Promise<T> {
    await this.connect();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject("Database not initialized");
        return;
      }

      const transaction = this.db.transaction(storeName, mode);

      transaction.onerror = (event) => {
        reject(`Transaction error: ${(event.target as IDBTransaction).error}`);
      };

      transaction.oncomplete = () => {
        // Resolution happens in the callback
      };

      // Create store object(s) for the callback
      let store: IDBObjectStore | { [name: string]: IDBObjectStore };

      if (Array.isArray(storeName)) {
        // Multiple stores
        store = {};
        storeName.forEach((name) => {
          (store as { [name: string]: IDBObjectStore })[name] =
            transaction.objectStore(name);
        });
      } else {
        // Single store
        store = transaction.objectStore(storeName);
      }

      // Execute callback
      callback(store).then(resolve).catch(reject);
    });
  }

  /**
   * Observe changes to the database
   * @param callback Function to call when changes occur
   * @returns Function to stop observing
   */

  public observe(
    callback: (event: {
      type: "add" | "put" | "delete" | "clear";
      storeName: string;
      key?: IDBValidKey;
      value?: any;
    }) => void,
  ): () => void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const originalMethods: {
      [key: string]: {
        add: typeof IDBObjectStore.prototype.add;
        put: typeof IDBObjectStore.prototype.put;
        delete: typeof IDBObjectStore.prototype.delete;
        clear: typeof IDBObjectStore.prototype.clear;
      };
    } = {};

    const storeNames = Array.from(this.db.objectStoreNames);

    const patchTransaction = (storeName: string, mode: IDBTransactionMode) => {
      const transaction = this.db!.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);

      if (!originalMethods[storeName]) {
        originalMethods[storeName] = {
          add: store.add.bind(store),
          put: store.put.bind(store),
          delete: store.delete.bind(store),
          clear: store.clear.bind(store),
        };
      }

      store.add = function (value: any, key?: IDBValidKey) {
        const request = originalMethods[storeName].add(value, key);
        request.onsuccess = (event) => {
          callback({
            type: "add",
            storeName,
            key: (event.target as IDBRequest).result,
            value,
          });
        };
        return request;
      };

      store.put = function (value: any, key?: IDBValidKey) {
        const request = originalMethods[storeName].put(value, key);
        request.onsuccess = (event) => {
          callback({
            type: "put",
            storeName,
            key: (event.target as IDBRequest).result,
            value,
          });
        };
        return request;
      };

      store.delete = function (key: IDBValidKey) {
        const request = originalMethods[storeName].delete(key);
        request.onsuccess = () => {
          callback({
            type: "delete",
            storeName,
            key,
          });
        };
        return request;
      };

      store.clear = function () {
        const request = originalMethods[storeName].clear();
        request.onsuccess = () => {
          callback({
            type: "clear",
            storeName,
          });
        };
        return request;
      };

      return transaction;
    };

    const transactions = storeNames.map((storeName) =>
      patchTransaction(storeName, "readwrite"),
    );

    return () => {
      storeNames.forEach((storeName) => {
        if (originalMethods[storeName]) {
          const transaction = this.db!.transaction(storeName, "readwrite");
          const store = transaction.objectStore(storeName);

          store.add = originalMethods[storeName].add;
          store.put = originalMethods[storeName].put;
          store.delete = originalMethods[storeName].delete;
          store.clear = originalMethods[storeName].clear;
        }
      });
    };
  }
  /**
   * Export the entire database to JSON
   * @returns Promise that resolves with the database contents
   */
  public async exportDatabase(): Promise<{ [storeName: string]: any[] }> {
    await this.connect();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const storeNames = Array.from(this.db.objectStoreNames);
    const result: { [storeName: string]: any[] } = {};

    // Create a single transaction for all stores
    const transaction = this.db.transaction(storeNames, "readonly");

    // Collect all promises for each store's getAll
    const promises = storeNames.map((storeName) => {
      return new Promise<void>((resolve, reject) => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
          result[storeName] = (event.target as IDBRequest).result;
          resolve();
        };

        request.onerror = (event) => {
          reject(
            `Error exporting store ${storeName}: ${(event.target as IDBRequest).error}`,
          );
        };
      });
    });

    // Wait for all stores to be exported
    await Promise.all(promises);

    return result;
  }

  /**
   * Import database from JSON
   * @param data Database contents in export format
   * @returns Promise that resolves when import is complete
   */
  public async importDatabase(data: {
    [storeName: string]: any[];
  }): Promise<void> {
    await this.connect();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    const storeNames = Object.keys(data);

    // Create a transaction for all involved stores
    const transaction = this.db.transaction(storeNames, "readwrite");

    // Collect all promises for clearing and adding data
    const promises: Promise<void>[] = [];

    for (const storeName of storeNames) {
      const items = data[storeName];
      if (!items || !Array.isArray(items)) continue;

      const store = transaction.objectStore(storeName);

      // Clear the store
      const clearPromise = new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (event) => {
          reject(
            `Error clearing store ${storeName}: ${(event.target as IDBRequest).error}`,
          );
        };
      });

      // Add all items after clearing
      const addPromise = clearPromise.then(() => {
        const addRequests = items.map((item) => {
          return new Promise<void>((resolve, reject) => {
            const request = store.add(item);
            request.onsuccess = () => resolve();
            request.onerror = (event) => {
              reject(
                `Error adding item to store ${storeName}: ${(event.target as IDBRequest).error}`,
              );
            };
          });
        });
        return Promise.all(addRequests).then(() => {});
      });

      promises.push(addPromise);
    }

    // Wait for all operations to complete
    await Promise.all(promises);

    // Wait for transaction completion
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = (event) => {
        reject(`Transaction error: ${transaction.error}`);
      };
    });
  }
}
