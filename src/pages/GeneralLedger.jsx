import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Navigation from '../components/Navigation'
import './GeneralLedger.css'

const GeneralLedger = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('chart-of-accounts')
  const [accounts, setAccounts] = useState([])
  const [journalEntries, setJournalEntries] = useState([])
  const [glSettings, setGlSettings] = useState(null)
  const [trialBalance, setTrialBalance] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Account Form State
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountFormData, setAccountFormData] = useState({
    id: null,
    account_number: '',
    account_name: '',
    account_type: 'asset',
    account_subtype: '',
    description: '',
    normal_balance: 'debit',
    is_active: true
  })

  // Journal Entry Form State
  const [showJournalForm, setShowJournalForm] = useState(false)
  const [journalFormData, setJournalFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
    lines: [
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }
    ]
  })

  // Account Ledger State
  const [selectedAccountLedger, setSelectedAccountLedger] = useState(null)
  const [accountLedgerData, setAccountLedgerData] = useState([])

  useEffect(() => {
    if (user) {
      initializeGL()
    }
  }, [user])

  const initializeGL = async () => {
    setLoading(true)
    try {
      // Check if GL is initialized
      const { data: settings, error: settingsError } = await supabase
        .from('gl_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (settingsError && settingsError.code !== 'PGRST116') {
        throw settingsError
      }

      if (!settings) {
        // Initialize default chart of accounts
        const { error: initError } = await supabase.rpc('initialize_default_chart_of_accounts', {
          p_user_id: user.id
        })

        // Ignore duplicate key errors - accounts already exist
        if (initError && initError.code !== '23505') {
          throw initError
        }
        
        if (!initError) {
          setSuccess('GL initialized with default chart of accounts!')
        }
      }

      // Fetch settings again after initialization
      const { data: updatedSettings } = await supabase
        .from('gl_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setGlSettings(updatedSettings)
      await fetchAccounts()
      await fetchJournalEntries()
      await fetchTrialBalance()
    } catch (err) {
      console.error('Error initializing GL:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('account_number')

      if (error) throw error
      setAccounts(data || [])
    } catch (err) {
      console.error('Error fetching accounts:', err)
      setError(err.message)
    }
  }

  const fetchJournalEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          *,
          journal_entry_lines (
            *,
            chart_of_accounts (account_number, account_name)
          )
        `)
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(100)

      if (error) throw error
      setJournalEntries(data || [])
    } catch (err) {
      console.error('Error fetching journal entries:', err)
      setError(err.message)
    }
  }

  const fetchTrialBalance = async () => {
    try {
      const { data, error } = await supabase.rpc('get_trial_balance', {
        p_user_id: user.id
      })

      if (error) throw error
      setTrialBalance(data || [])
    } catch (err) {
      console.error('Error fetching trial balance:', err)
      setError(err.message)
    }
  }

  const handleAccountSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      if (accountFormData.id) {
        // Update existing account
        const { error } = await supabase
          .from('chart_of_accounts')
          .update({
            account_number: accountFormData.account_number,
            account_name: accountFormData.account_name,
            account_type: accountFormData.account_type,
            account_subtype: accountFormData.account_subtype,
            description: accountFormData.description,
            normal_balance: accountFormData.normal_balance,
            is_active: accountFormData.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', accountFormData.id)

        if (error) throw error
        setSuccess('Account updated successfully!')
      } else {
        // Create new account
        const { error } = await supabase
          .from('chart_of_accounts')
          .insert([{
            user_id: user.id,
            ...accountFormData
          }])

        if (error) throw error
        setSuccess('Account created successfully!')
      }

      resetAccountForm()
      await fetchAccounts()
      await fetchTrialBalance()
    } catch (err) {
      console.error('Error saving account:', err)
      setError(err.message)
    }
  }

  const handleJournalSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      // Validate debits equal credits
      const totalDebits = journalFormData.lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0)
      const totalCredits = journalFormData.lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0)

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        setError(`Debits ($${totalDebits.toFixed(2)}) must equal Credits ($${totalCredits.toFixed(2)})`)
        return
      }

      // Create journal entry
      const { data: journalEntry, error: journalError } = await supabase
        .from('journal_entries')
        .insert([{
          user_id: user.id,
          entry_date: journalFormData.entry_date,
          description: journalFormData.description,
          notes: journalFormData.notes,
          reference_type: 'manual',
          is_posted: false
        }])
        .select()
        .single()

      if (journalError) throw journalError

      // Create journal entry lines
      const lines = journalFormData.lines
        .filter(line => line.account_id && (parseFloat(line.debit_amount) > 0 || parseFloat(line.credit_amount) > 0))
        .map((line, index) => ({
          journal_entry_id: journalEntry.id,
          account_id: line.account_id,
          description: line.description,
          debit_amount: parseFloat(line.debit_amount || 0),
          credit_amount: parseFloat(line.credit_amount || 0),
          line_number: index + 1
        }))

      const { error: linesError } = await supabase
        .from('journal_entry_lines')
        .insert(lines)

      if (linesError) throw linesError

      // Post the journal entry
      const { error: postError } = await supabase.rpc('post_journal_entry', {
        p_journal_entry_id: journalEntry.id
      })

      if (postError) throw postError

      setSuccess('Journal entry created and posted successfully!')
      resetJournalForm()
      await fetchJournalEntries()
      await fetchTrialBalance()
      await fetchAccounts()
    } catch (err) {
      console.error('Error creating journal entry:', err)
      setError(err.message)
    }
  }

  const handleEditAccount = (account) => {
    setAccountFormData({
      id: account.id,
      account_number: account.account_number,
      account_name: account.account_name,
      account_type: account.account_type,
      account_subtype: account.account_subtype || '',
      description: account.description || '',
      normal_balance: account.normal_balance,
      is_active: account.is_active
    })
    setShowAccountForm(true)
  }

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this account?')) return

    try {
      const { error } = await supabase
        .from('chart_of_accounts')
        .delete()
        .eq('id', accountId)

      if (error) throw error
      setSuccess('Account deleted successfully!')
      await fetchAccounts()
      await fetchTrialBalance()
    } catch (err) {
      console.error('Error deleting account:', err)
      setError(err.message)
    }
  }

  const resetAccountForm = () => {
    setAccountFormData({
      id: null,
      account_number: '',
      account_name: '',
      account_type: 'asset',
      account_subtype: '',
      description: '',
      normal_balance: 'debit',
      is_active: true
    })
    setShowAccountForm(false)
  }

  const resetJournalForm = () => {
    setJournalFormData({
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
      lines: [
        { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
        { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }
      ]
    })
    setShowJournalForm(false)
  }

  const addJournalLine = () => {
    setJournalFormData({
      ...journalFormData,
      lines: [...journalFormData.lines, { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }]
    })
  }

  const removeJournalLine = (index) => {
    const newLines = journalFormData.lines.filter((_, i) => i !== index)
    setJournalFormData({ ...journalFormData, lines: newLines })
  }

  const updateJournalLine = (index, field, value) => {
    const newLines = [...journalFormData.lines]
    newLines[index][field] = value
    setJournalFormData({ ...journalFormData, lines: newLines })
  }

  const viewAccountLedger = async (account) => {
    setSelectedAccountLedger(account)
    try {
      const { data, error } = await supabase.rpc('get_account_ledger', {
        p_account_id: account.id,
        p_start_date: null,
        p_end_date: new Date().toISOString().split('T')[0]
      })

      if (error) throw error
      setAccountLedgerData(data || [])
    } catch (err) {
      console.error('Error fetching account ledger:', err)
      setError(err.message)
    }
  }

  const calculateJournalTotals = () => {
    const totalDebits = journalFormData.lines.reduce((sum, line) => sum + parseFloat(line.debit_amount || 0), 0)
    const totalCredits = journalFormData.lines.reduce((sum, line) => sum + parseFloat(line.credit_amount || 0), 0)
    return { totalDebits, totalCredits, difference: totalDebits - totalCredits }
  }

  if (loading) {
    return (
      <div className="page-container">
        <Navigation />
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading General Ledger...</p>
        </div>
      </div>
    )
  }

  const totals = calculateJournalTotals()

  return (
    <div className="page-container">
      <Navigation />
      <div className="content-container">
        <div className="page-header">
          <h1>General Ledger</h1>
          <p>Manage your chart of accounts and journal entries</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="tabs">
          <button
            className={activeTab === 'chart-of-accounts' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('chart-of-accounts')}
          >
            Chart of Accounts
          </button>
          <button
            className={activeTab === 'journal-entries' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('journal-entries')}
          >
            Journal Entries
          </button>
          <button
            className={activeTab === 'trial-balance' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('trial-balance')}
          >
            Trial Balance
          </button>
        </div>

        {/* Chart of Accounts Tab */}
        {activeTab === 'chart-of-accounts' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Chart of Accounts</h2>
              <button className="btn btn-primary" onClick={() => setShowAccountForm(true)}>
                + Add Account
              </button>
            </div>

            {showAccountForm && (
              <div className="modal-overlay" onClick={() => setShowAccountForm(false)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{accountFormData.id ? 'Edit Account' : 'Add Account'}</h3>
                    <button className="close-btn" onClick={() => setShowAccountForm(false)}>×</button>
                  </div>
                  <form onSubmit={handleAccountSubmit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label>Account Number *</label>
                        <input
                          type="text"
                          value={accountFormData.account_number}
                          onChange={(e) => setAccountFormData({ ...accountFormData, account_number: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Name *</label>
                        <input
                          type="text"
                          value={accountFormData.account_name}
                          onChange={(e) => setAccountFormData({ ...accountFormData, account_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Account Type *</label>
                        <select
                          value={accountFormData.account_type}
                          onChange={(e) => setAccountFormData({
                            ...accountFormData,
                            account_type: e.target.value,
                            normal_balance: ['asset', 'expense'].includes(e.target.value) ? 'debit' : 'credit'
                          })}
                          required
                        >
                          <option value="asset">Asset</option>
                          <option value="liability">Liability</option>
                          <option value="equity">Equity</option>
                          <option value="revenue">Revenue</option>
                          <option value="expense">Expense</option>
                          <option value="contra_asset">Contra Asset</option>
                          <option value="contra_liability">Contra Liability</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Normal Balance *</label>
                        <select
                          value={accountFormData.normal_balance}
                          onChange={(e) => setAccountFormData({ ...accountFormData, normal_balance: e.target.value })}
                          required
                        >
                          <option value="debit">Debit</option>
                          <option value="credit">Credit</option>
                        </select>
                      </div>
                      <div className="form-group full-width">
                        <label>Account Subtype</label>
                        <input
                          type="text"
                          value={accountFormData.account_subtype}
                          onChange={(e) => setAccountFormData({ ...accountFormData, account_subtype: e.target.value })}
                        />
                      </div>
                      <div className="form-group full-width">
                        <label>Description</label>
                        <textarea
                          value={accountFormData.description}
                          onChange={(e) => setAccountFormData({ ...accountFormData, description: e.target.value })}
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={accountFormData.is_active}
                            onChange={(e) => setAccountFormData({ ...accountFormData, is_active: e.target.checked })}
                          />
                          Active
                        </label>
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={resetAccountForm}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        {accountFormData.id ? 'Update' : 'Create'} Account
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="accounts-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account #</th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Normal Balance</th>
                    <th>Current Balance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id}>
                      <td>{account.account_number}</td>
                      <td>{account.account_name}</td>
                      <td>
                        <span className={`badge badge-${account.account_type}`}>
                          {account.account_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{account.normal_balance}</td>
                      <td className="amount">${parseFloat(account.current_balance || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${account.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-sm btn-info"
                            onClick={() => viewAccountLedger(account)}
                            title="View Ledger"
                          >
                            📊
                          </button>
                          {!account.is_system_account && (
                            <>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => handleEditAccount(account)}
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteAccount(account.id)}
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedAccountLedger && (
              <div className="modal-overlay" onClick={() => setSelectedAccountLedger(null)}>
                <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>Account Ledger: {selectedAccountLedger.account_number} - {selectedAccountLedger.account_name}</h3>
                    <button className="close-btn" onClick={() => setSelectedAccountLedger(null)}>×</button>
                  </div>
                  <div className="ledger-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Entry #</th>
                          <th>Description</th>
                          <th>Debit</th>
                          <th>Credit</th>
                          <th>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountLedgerData.map((entry, index) => (
                          <tr key={index}>
                            <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                            <td>{entry.entry_number}</td>
                            <td>{entry.description}</td>
                            <td className="amount">
                              {entry.debit_amount > 0 ? `$${parseFloat(entry.debit_amount).toFixed(2)}` : '-'}
                            </td>
                            <td className="amount">
                              {entry.credit_amount > 0 ? `$${parseFloat(entry.credit_amount).toFixed(2)}` : '-'}
                            </td>
                            <td className="amount">${parseFloat(entry.balance).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Journal Entries Tab */}
        {activeTab === 'journal-entries' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Journal Entries</h2>
              <button className="btn btn-primary" onClick={() => setShowJournalForm(true)}>
                + New Journal Entry
              </button>
            </div>

            {showJournalForm && (
              <div className="modal-overlay" onClick={() => setShowJournalForm(false)}>
                <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>New Journal Entry</h3>
                    <button className="close-btn" onClick={() => setShowJournalForm(false)}>×</button>
                  </div>
                  <form onSubmit={handleJournalSubmit}>
                    <div className="form-group">
                      <label>Entry Date *</label>
                      <input
                        type="date"
                        value={journalFormData.entry_date}
                        onChange={(e) => setJournalFormData({ ...journalFormData, entry_date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Description *</label>
                      <input
                        type="text"
                        value={journalFormData.description}
                        onChange={(e) => setJournalFormData({ ...journalFormData, description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Notes</label>
                      <textarea
                        value={journalFormData.notes}
                        onChange={(e) => setJournalFormData({ ...journalFormData, notes: e.target.value })}
                        rows="2"
                      />
                    </div>

                    <h4>Journal Entry Lines</h4>
                    <div className="journal-lines">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Account</th>
                            <th>Description</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {journalFormData.lines.map((line, index) => (
                            <tr key={index}>
                              <td>
                                <select
                                  value={line.account_id}
                                  onChange={(e) => updateJournalLine(index, 'account_id', e.target.value)}
                                  required
                                >
                                  <option value="">Select Account</option>
                                  {accounts.filter(a => a.is_active).map((account) => (
                                    <option key={account.id} value={account.id}>
                                      {account.account_number} - {account.account_name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => updateJournalLine(index, 'description', e.target.value)}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.debit_amount}
                                  onChange={(e) => updateJournalLine(index, 'debit_amount', e.target.value)}
                                  disabled={parseFloat(line.credit_amount) > 0}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={line.credit_amount}
                                  onChange={(e) => updateJournalLine(index, 'credit_amount', e.target.value)}
                                  disabled={parseFloat(line.debit_amount) > 0}
                                />
                              </td>
                              <td>
                                {journalFormData.lines.length > 2 && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-danger"
                                    onClick={() => removeJournalLine(index)}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="2"><strong>Totals:</strong></td>
                            <td className="amount"><strong>${totals.totalDebits.toFixed(2)}</strong></td>
                            <td className="amount"><strong>${totals.totalCredits.toFixed(2)}</strong></td>
                            <td>
                              {Math.abs(totals.difference) > 0.01 && (
                                <span className="text-danger">
                                  Diff: ${Math.abs(totals.difference).toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                      <button type="button" className="btn btn-secondary" onClick={addJournalLine}>
                        + Add Line
                      </button>
                    </div>

                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary" onClick={resetJournalForm}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Create & Post Entry
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="journal-entries-list">
              {journalEntries.map((entry) => (
                <div key={entry.id} className="journal-entry-card">
                  <div className="journal-entry-header">
                    <div>
                      <strong>{entry.entry_number || 'Manual Entry'}</strong>
                      <span className="text-muted"> - {new Date(entry.entry_date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className={`badge ${entry.is_posted ? 'badge-posted' : 'badge-draft'}`}>
                        {entry.is_posted ? 'Posted' : 'Draft'}
                      </span>
                      {entry.reference_type && (
                        <span className="badge badge-reference">{entry.reference_type}</span>
                      )}
                    </div>
                  </div>
                  <p>{entry.description}</p>
                  <table className="journal-lines-table">
                    <thead>
                      <tr>
                        <th>Account</th>
                        <th>Description</th>
                        <th>Debit</th>
                        <th>Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.journal_entry_lines?.map((line) => (
                        <tr key={line.id}>
                          <td>
                            {line.chart_of_accounts?.account_number} - {line.chart_of_accounts?.account_name}
                          </td>
                          <td>{line.description}</td>
                          <td className="amount">
                            {line.debit_amount > 0 ? `$${parseFloat(line.debit_amount).toFixed(2)}` : '-'}
                          </td>
                          <td className="amount">
                            {line.credit_amount > 0 ? `$${parseFloat(line.credit_amount).toFixed(2)}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trial Balance Tab */}
        {activeTab === 'trial-balance' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>Trial Balance</h2>
              <button className="btn btn-secondary" onClick={fetchTrialBalance}>
                🔄 Refresh
              </button>
            </div>

            <div className="trial-balance-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Account #</th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th>Debit Balance</th>
                    <th>Credit Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBalance.map((account, index) => (
                    <tr key={index}>
                      <td>{account.account_number}</td>
                      <td>{account.account_name}</td>
                      <td>
                        <span className={`badge badge-${account.account_type}`}>
                          {account.account_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="amount">
                        {account.debit_balance > 0 ? `$${parseFloat(account.debit_balance).toFixed(2)}` : '-'}
                      </td>
                      <td className="amount">
                        {account.credit_balance > 0 ? `$${parseFloat(account.credit_balance).toFixed(2)}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3"><strong>Totals:</strong></td>
                    <td className="amount">
                      <strong>
                        ${trialBalance.reduce((sum, acc) => sum + parseFloat(acc.debit_balance || 0), 0).toFixed(2)}
                      </strong>
                    </td>
                    <td className="amount">
                      <strong>
                        ${trialBalance.reduce((sum, acc) => sum + parseFloat(acc.credit_balance || 0), 0).toFixed(2)}
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GeneralLedger
