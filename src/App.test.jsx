import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App.jsx'

// Both cases below reproduce defects that shipped to main. They fail against
// the previous version of QuotePage and pass against the current one.

const openQuoteForm = async (user) => {
  render(<App />)
  await user.click(screen.getByRole('button', { name: 'Get a Quote' }))
}

const fillRequiredFields = async (user) => {
  await user.type(screen.getByPlaceholderText('Your name'), 'Dana Earley')
  await user.type(screen.getByPlaceholderText('you@email.com'), 'dana@example.com')
  await user.type(screen.getByPlaceholderText('(949) 555-0000'), '9495550123')
  await user.type(screen.getByLabelText(/Event Date/i), '2026-09-12')
}

describe('quote form', () => {
  it('keeps the whole value and the caret while typing', async () => {
    // QuotePage used to declare its input component inside its own render
    // body, so React remounted the field on every keystroke and only the
    // first character survived.
    const user = userEvent.setup()
    await openQuoteForm(user)

    const name = screen.getByPlaceholderText('Your name')
    await user.click(name)
    await user.keyboard('Dana')

    expect(name).toHaveValue('Dana')
    expect(name).toHaveFocus()
  })

  it('refuses to submit while a required field is empty', async () => {
    // An entirely blank form used to POST to Formspree, fire the lead
    // conversion, and show the customer a confirmation screen.
    const user = userEvent.setup()
    await openQuoteForm(user)

    await user.click(screen.getByRole('button', { name: /Submit Quote Request/i }))

    expect(window.fetch).not.toHaveBeenCalled()
    expect(window.gtag).not.toHaveBeenCalled()
    expect(window.gtag_report_conversion).not.toHaveBeenCalled()
    expect(screen.queryByText(/Quote Request Submitted/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Please tell us your name/i)).toBeInTheDocument()
  })

  it('clears the error summary once every field is corrected', async () => {
    const user = userEvent.setup()
    await openQuoteForm(user)

    await user.click(screen.getByRole('button', { name: /Submit Quote Request/i }))
    expect(screen.getByText(/Please fill in the highlighted fields/i)).toBeInTheDocument()

    await fillRequiredFields(user)

    expect(screen.queryByText(/Please fill in the highlighted fields/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Please tell us your name/i)).not.toBeInTheDocument()
  })

  it('rejects an email that is present but malformed', async () => {
    const user = userEvent.setup()
    await openQuoteForm(user)

    await fillRequiredFields(user)
    await user.clear(screen.getByPlaceholderText('you@email.com'))
    await user.type(screen.getByPlaceholderText('you@email.com'), 'dana@example')
    await user.click(screen.getByRole('button', { name: /Submit Quote Request/i }))

    expect(window.fetch).not.toHaveBeenCalled()
    expect(screen.getByText(/doesn't look right/i)).toBeInTheDocument()
  })

  it('submits a complete form and reports the lead once', async () => {
    const user = userEvent.setup()
    await openQuoteForm(user)

    await fillRequiredFields(user)
    await user.click(screen.getByRole('button', { name: /Submit Quote Request/i }))

    expect(window.fetch).toHaveBeenCalledTimes(1)
    const [url, options] = window.fetch.mock.calls[0]
    expect(url).toContain('formspree.io')
    expect(JSON.parse(options.body)).toMatchObject({
      name: 'Dana Earley',
      email: 'dana@example.com',
      phone: '9495550123',
      eventDate: '2026-09-12',
    })
    expect(window.gtag_report_conversion).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Quote Request Submitted/i)).toBeInTheDocument()
  })
})
