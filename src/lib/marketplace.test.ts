import { describe, expect, it } from 'vitest'
import { demoProducts } from './catalog'
import { filterCatalog, summarizeCart } from './marketplace'

describe('filterCatalog', () => {
  it('filters demo products by category and area', () => {
    const result = filterCatalog(demoProducts, {
      category: 'مونة', area: 'قطنا', storeId: '', query: '',
    })
    expect(result.map((product) => product.name)).toEqual(['خلطة زعتر بلدي', 'زيت زيتون بلدي'])
  })

  it('searches Arabic names, stores, and categories without surrounding spaces', () => {
    const result = filterCatalog(demoProducts, {
      category: 'الكل', area: 'كل المناطق', storeId: '', query: '  صابون  ',
    })
    expect(result).toHaveLength(1)
    expect(result[0]?.name).toBe('صابون غار طبيعي')
  })

  it('filters products by their store in demo mode too', () => {
    expect(filterCatalog(demoProducts, {
      category: 'الكل', area: 'كل المناطق', storeId: 'demo-pantry', query: '',
    }).map((product) => product.id)).toEqual(['demo-3', 'demo-5'])
  })
})

describe('summarizeCart', () => {
  it('counts each cart line and sums integer SYP amounts', () => {
    const summary = summarizeCart([demoProducts[0]!, demoProducts[0]!, demoProducts[1]!])
    expect(summary).toEqual({ itemCount: 3, subtotal: 155000 })
  })

  it('handles an empty cart', () => {
    expect(summarizeCart([])).toEqual({ itemCount: 0, subtotal: 0 })
  })
})
