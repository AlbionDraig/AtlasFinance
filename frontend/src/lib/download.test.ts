import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadBlobFile } from './download'

describe('downloadBlobFile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a downloadable object URL and revokes it after clicking', () => {
    const clickSpy = vi.fn()
    const anchor = {
      click: clickSpy,
      href: '',
      download: '',
    } as unknown as HTMLAnchorElement
    const createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:transactions')
    const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(anchor)

    downloadBlobFile(new Blob(['id,name\n1,Alice']), 'transactions.csv')

    expect(createElementSpy).toHaveBeenCalledWith('a')
    expect(createObjectURLSpy).toHaveBeenCalledOnce()
    expect(anchor.href).toBe('blob:transactions')
    expect(anchor.download).toBe('transactions.csv')
    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:transactions')
  })
})