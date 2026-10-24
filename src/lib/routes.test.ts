import { describe, expect, it } from 'vitest'
import { accountHash, parseMarketplaceHash, productHash, storeHash } from './routes'

describe('marketplace routes', () => {
  it('parses shareable product and store hashes', () => {
    expect(parseMarketplaceHash(productHash('product-1'))).toEqual({ type: 'product', id: 'product-1' })
    expect(parseMarketplaceHash(storeHash('store-1'))).toEqual({ type: 'store', id: 'store-1' })
  })

  it('parses the account page route', () => {
    expect(parseMarketplaceHash(accountHash())).toEqual({ type: 'account' })
  })

  it('encodes and decodes non-ascii identifiers safely', () => {
    const hash = storeHash('متجر محلي')
    expect(hash).toContain('%')
    expect(parseMarketplaceHash(hash)).toEqual({ type: 'store', id: 'متجر محلي' })
  })

  it('treats section links and malformed hashes as the home page', () => {
    expect(parseMarketplaceHash('#products')).toEqual({ type: 'home' })
    expect(parseMarketplaceHash('#product/%E0%A4%A')).toEqual({ type: 'home' })
    expect(parseMarketplaceHash('#store/')).toEqual({ type: 'home' })
  })
})
