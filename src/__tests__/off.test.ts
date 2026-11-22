import { fetchProductByBarcode, isValidBarcode, OffError, searchProducts } from '../lib/openfoodfacts';

const json = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) } as Response);

describe('Open Food Facts client', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('validates barcodes', () => {
    expect(isValidBarcode('4000417025005')).toBe(true);
    expect(isValidBarcode('12ab')).toBe(false);
  });

  it('loads a product by barcode', async () => {
    globalThis.fetch = jest.fn(() =>
      json(200, { status: 1, product: { code: '123456789', product_name: 'Müsli', nutriments: { 'energy-kcal_100g': 380, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 8 } } }),
    ) as unknown as typeof fetch;
    const f = await fetchProductByBarcode('123456789');
    expect(f.name).toBe('Müsli');
    expect(f.per100.kcal).toBe(380);
  });

  it('reports unknown products', async () => {
    globalThis.fetch = jest.fn(() => json(404, {})) as unknown as typeof fetch;
    await expect(fetchProductByBarcode('99999999')).rejects.toMatchObject({ kind: 'notfound' });
    globalThis.fetch = jest.fn(() => json(200, { status: 0 })) as unknown as typeof fetch;
    await expect(fetchProductByBarcode('99999999')).rejects.toBeInstanceOf(OffError);
  });

  it('reports network errors', async () => {
    globalThis.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await expect(fetchProductByBarcode('4000417025005')).rejects.toMatchObject({ kind: 'network' });
  });

  it('searches with the new API and falls back to the classic API', async () => {
    const hit = { code: '1', product_name: 'Skyr', brands: ['Arla'], nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11 } };
    globalThis.fetch = jest.fn(() => json(200, { hits: [hit, hit] })) as unknown as typeof fetch;
    const r = await searchProducts('skyr');
    expect(r).toHaveLength(1);
    expect(r[0].brand).toBe('Arla');

    const calls: string[] = [];
    globalThis.fetch = jest.fn((url: string) => {
      calls.push(url);
      if (url.includes('search.openfoodfacts.org')) return json(503, {});
      return json(200, { products: [{ ...hit, brands: 'Arla, X' }] });
    }) as unknown as typeof fetch;
    const r2 = await searchProducts('skyr');
    expect(r2).toHaveLength(1);
    expect(calls.some((c) => c.includes('cgi/search.pl'))).toBe(true);
    expect(await searchProducts('a')).toEqual([]);
  });
});
