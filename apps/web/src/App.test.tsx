// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('shows the C2PA upload form', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'メディアに C2PA 署名を付与' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'C2PA 署名ジョブを開始' }),
    ).toBeDisabled()
  })
})
