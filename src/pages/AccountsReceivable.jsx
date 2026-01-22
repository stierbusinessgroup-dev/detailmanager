import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import InvoiceViewer from '../components/InvoiceViewer'
import './AccountsReceivable.css'

function AccountsReceivable() {
  const [view, setView] = useState('list') // 'list' or 'payment'
  const [arLedger, setArLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [selectedAR, setSelectedAR] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [agingSummary, setAgingSummary] = useState([])
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: '',
    payment_method: 'cash',
    reference_number: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // Filter state
  const [filter, setFilter] = useState('all') // 'all', 'open', 'overdue', 'paid'

  // Invoice viewer state
  const [showInvoice, setShowInvoice] = useState(false)
  const [selectedInvoiceData, setSelectedInvoiceData] = useState(null)
  const [businessInfo, setBusinessInfo] = useState(null)

  useEffect(() => {
    fetchARLedger()
    fetchAgingSummary()
  }, [])

  const fetchARLedger = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('ar_ledger')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            state,
            zip_code,
            payment_terms_type,
            payment_net_days,
            payment_discount_percent,
            payment_discount_days,
            payment_specific_dates,
            payment_terms_notes
          ),
          sales (
            sale_number,
            sale_date,
            total_amount,
            status
          )
        `)
        .eq('user_id', user.id)
        .order('invoice_date', { ascending: false })

      if (error) throw error
      setArLedger(data || [])
    } catch (error) {
      console.error('Error fetching AR ledger:', error)
      setMessage({ type: 'error', text: 'Failed to load AR ledger' })
    } finally {
      setLoading(false)
    }
  }

  const fetchAgingSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .rpc('get_ar_aging_summary', { user_id_param: user.id })

      if (error) throw error
      setAgingSummary(data || [])
    } catch (error) {
      console.error('Error fetching aging summary:', error)
    }
  }

  const fetchPaymentHistory = async (arLedgerId) => {
    try {
      const { data, error } = await supabase
        .from('ar_payment_history')
        .select('*')
        .eq('ar_ledger_id', arLedgerId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      setPaymentHistory(data || [])
    } catch (error) {
      console.error('Error fetching payment history:', error)
    }
  }

  const handleRecordPayment = async (e) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!selectedAR) {
        setMessage({ type: 'error', text: 'No AR record selected' })
        return
      }

      const paymentAmount = parseFloat(paymentForm.payment_amount)
      
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        setMessage({ type: 'error', text: 'Please enter a valid payment amount' })
        return
      }

      if (paymentAmount > selectedAR.amount_due) {
        setMessage({ type: 'error', text: 'Payment amount exceeds amount due' })
        return
      }

      // Call the record_ar_payment function
      const { data, error } = await supabase.rpc('record_ar_payment', {
        ar_ledger_id_param: selectedAR.id,
        payment_amount_param: paymentAmount,
        payment_method_param: paymentForm.payment_method,
        reference_number_param: paymentForm.reference_number || null,
        payment_date_param: paymentForm.payment_date ? new Date(paymentForm.payment_date).toISOString() : null,
        notes_param: paymentForm.notes || null
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Payment recorded successfully!' })
      resetPaymentForm()
      fetchARLedger()
      fetchAgingSummary()
      setView('list')
      setSelectedAR(null)
    } catch (error) {
      console.error('Error recording payment:', error)
      setMessage({ type: 'error', text: 'Failed to record payment: ' + error.message })
    }
  }

  const handleViewPayments = async (arRecord) => {
    setSelectedAR(arRecord)
    await fetchPaymentHistory(arRecord.id)
    setView('payment')
  }

  const fetchBusinessInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching business info:', error)
      return null
    }
  }

  const handleViewInvoice = async (arRecord) => {
    try {
      // Fetch business info if not already loaded
      let bizInfo = businessInfo
      if (!bizInfo) {
        bizInfo = await fetchBusinessInfo()
        setBusinessInfo(bizInfo)
      }

      // Fetch sale details with line items
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            id,
            item_type,
            item_name,
            item_description,
            quantity,
            unit_price,
            line_total,
            discount_amount,
            notes
          )
        `)
        .eq('id', arRecord.sale_id)
        .single()

      if (saleError) throw saleError

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: arRecord.invoice_number,
        invoiceDate: arRecord.invoice_date,
        dueDate: arRecord.due_date,
        status: arRecord.status,
        customer: arRecord.customers,
        lineItems: saleData.sale_items?.map(item => ({
          name: item.item_name || 'Item',
          description: item.item_description || '',
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.line_total
        })) || [],
        subtotal: saleData.subtotal || 0,
        taxRate: saleData.tax_rate || 0,
        taxAmount: saleData.tax_amount || 0,
        discount: saleData.discount_amount || 0,
        total: arRecord.original_amount,
        notes: saleData.notes || '',
        paymentTerms: null // Will be generated from customer data
      }

      setSelectedInvoiceData(invoiceData)
      setShowInvoice(true)
    } catch (error) {
      console.error('Error preparing invoice:', error)
      setMessage({ type: 'error', text: 'Failed to load invoice data: ' + (error.message || 'Unknown error') })
    }
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      payment_amount: '',
      payment_method: 'cash',
      reference_number: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const calculateDaysOutstanding = (invoiceDate) => {
    if (!invoiceDate) return 0
    const now = new Date()
    const invoice = new Date(invoiceDate)
    const diffTime = Math.abs(now - invoice)
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const calculateAgingBucket = (invoiceDate) => {
    const days = calculateDaysOutstanding(invoiceDate)
    if (days <= 30) return 'current'
    if (days <= 60) return '31-60'
    if (days <= 90) return '61-90'
    return 'over_90'
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return 'status-badge status-paid'
      case 'open':
        return 'status-badge status-open'
      case 'partial':
        return 'status-badge status-partial'
      case 'overdue':
        return 'status-badge status-overdue'
      case 'written_off':
        return 'status-badge status-written-off'
      case 'cancelled':
        return 'status-badge status-cancelled'
      default:
        return 'status-badge'
    }
  }

  const getAgingBadgeClass = (bucket) => {
    switch (bucket) {
      case 'current':
        return 'aging-badge aging-current'
      case '31-60':
        return 'aging-badge aging-30-60'
      case '61-90':
        return 'aging-badge aging-60-90'
      case 'over_90':
        return 'aging-badge aging-over-90'
      default:
        return 'aging-badge'
    }
  }

  const getAgingLabel = (bucket) => {
    switch (bucket) {
      case 'current':
        return '0-30 Days'
      case '31-60':
        return '31-60 Days'
      case '61-90':
        return '61-90 Days'
      case 'over_90':
        return 'Over 90 Days'
      default:
        return bucket
    }
  }

  const filteredARLedger = arLedger.filter(ar => {
    if (filter === 'all') return true
    if (filter === 'open') return ar.status === 'open' || ar.status === 'partial'
    if (filter === 'overdue') return ar.status === 'overdue'
    if (filter === 'paid') return ar.status === 'paid'
    return true
  })

  // Calculate summary statistics
  const totalOutstanding = arLedger
    .filter(ar => ar.status !== 'paid' && ar.status !== 'cancelled')
    .reduce((sum, ar) => sum + parseFloat(ar.amount_due || 0), 0)
  
  const totalOverdue = arLedger
    .filter(ar => ar.status === 'overdue')
    .reduce((sum, ar) => sum + parseFloat(ar.amount_due || 0), 0)
  
  const totalPaid = arLedger
    .filter(ar => ar.status === 'paid')
    .reduce((sum, ar) => sum + parseFloat(ar.original_amount || 0), 0)

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navigation />
        <main className="main-content">
          <div className="loading">Loading accounts receivable...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Navigation />

      <main className="main-content">
        <div className="ar-container">
          <div className="ar-header">
            <div>
              <h1>Accounts Receivable</h1>
              <p>Track invoices, payments, and outstanding balances</p>
            </div>
            {view === 'payment' && (
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setView('list')
                  setSelectedAR(null)
                  resetPaymentForm()
                }}
              >
                ← Back to List
              </button>
            )}
          </div>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {view === 'list' ? (
            <>
              {/* Summary Cards */}
              <div className="ar-summary-grid">
                <div className="ar-summary-card">
                  <h3>Total Outstanding</h3>
                  <div className="summary-value">{formatCurrency(totalOutstanding)}</div>
                  <div className="summary-label">
                    {arLedger.filter(ar => ar.status !== 'paid' && ar.status !== 'cancelled').length} invoices
                  </div>
                </div>
                <div className="ar-summary-card overdue">
                  <h3>Overdue</h3>
                  <div className="summary-value">{formatCurrency(totalOverdue)}</div>
                  <div className="summary-label">
                    {arLedger.filter(ar => ar.status === 'overdue').length} invoices
                  </div>
                </div>
                <div className="ar-summary-card paid">
                  <h3>Total Collected</h3>
                  <div className="summary-value">{formatCurrency(totalPaid)}</div>
                  <div className="summary-label">
                    {arLedger.filter(ar => ar.status === 'paid').length} invoices
                  </div>
                </div>
              </div>

              {/* Aging Summary */}
              {agingSummary.length > 0 && (
                <div className="card aging-summary-card">
                  <h2>Aging Summary</h2>
                  <div className="aging-summary-grid">
                    {agingSummary.map((bucket) => (
                      <div key={bucket.aging_bucket} className="aging-bucket">
                        <div className={getAgingBadgeClass(bucket.aging_bucket)}>
                          {getAgingLabel(bucket.aging_bucket)}
                        </div>
                        <div className="aging-amount">{formatCurrency(bucket.total_amount)}</div>
                        <div className="aging-count">{bucket.count} invoice{bucket.count !== 1 ? 's' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Buttons */}
              <div className="ar-filters">
                <button 
                  className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter('all')}
                >
                  All ({arLedger.length})
                </button>
                <button 
                  className={filter === 'open' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter('open')}
                >
                  Open ({arLedger.filter(ar => ar.status === 'open' || ar.status === 'partial').length})
                </button>
                <button 
                  className={filter === 'overdue' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter('overdue')}
                >
                  Overdue ({arLedger.filter(ar => ar.status === 'overdue').length})
                </button>
                <button 
                  className={filter === 'paid' ? 'filter-btn active' : 'filter-btn'}
                  onClick={() => setFilter('paid')}
                >
                  Paid ({arLedger.filter(ar => ar.status === 'paid').length})
                </button>
              </div>

              {/* AR Ledger Table */}
              {filteredARLedger.length === 0 ? (
                <div className="empty-state">
                  <h2>No Receivables Yet</h2>
                  <p>When you complete sales, they will appear here for payment tracking.</p>
                </div>
              ) : (
                <div className="card">
                  <div className="table-container">
                    <table className="ar-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Customer</th>
                          <th>Invoice Date</th>
                          <th>Due Date</th>
                          <th>Original Amount</th>
                          <th>Amount Paid</th>
                          <th>Amount Due</th>
                          <th>Days Out</th>
                          <th>Aging</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredARLedger.map((ar) => {
                          const daysOut = calculateDaysOutstanding(ar.invoice_date)
                          const agingBucket = calculateAgingBucket(ar.invoice_date)
                          return (
                          <tr key={ar.id}>
                            <td className="invoice-number">{ar.invoice_number}</td>
                            <td>
                              <div className="customer-info">
                                <div className="customer-name">
                                  {ar.customers?.first_name} {ar.customers?.last_name}
                                </div>
                                {ar.customers?.email && (
                                  <div className="customer-email">{ar.customers.email}</div>
                                )}
                              </div>
                            </td>
                            <td>{formatDate(ar.invoice_date)}</td>
                            <td>{formatDate(ar.due_date)}</td>
                            <td className="amount">{formatCurrency(ar.original_amount)}</td>
                            <td className="amount paid">{formatCurrency(ar.amount_paid)}</td>
                            <td className="amount due">{formatCurrency(ar.amount_due)}</td>
                            <td>{daysOut} days</td>
                            <td>
                              <span className={getAgingBadgeClass(agingBucket)}>
                                {getAgingLabel(agingBucket)}
                              </span>
                            </td>
                            <td>
                              <span className={getStatusBadgeClass(ar.status)}>
                                {ar.status}
                              </span>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => handleViewInvoice(ar)}
                                  title="View Invoice"
                                >
                                  📄 Invoice
                                </button>
                                {ar.status !== 'paid' && ar.status !== 'cancelled' && (
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={() => handleViewPayments(ar)}
                                  >
                                    Record Payment
                                  </button>
                                )}
                                {ar.status === 'paid' && (
                                  <button
                                    className="btn btn-sm btn-secondary"
                                    onClick={() => handleViewPayments(ar)}
                                  >
                                    View History
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Payment Form View */
            <div className="payment-view">
              <div className="payment-grid">
                {/* Invoice Details */}
                <div className="card invoice-details">
                  <h2>Invoice Details</h2>
                  <div className="detail-row">
                    <span className="detail-label">Invoice Number:</span>
                    <span className="detail-value">{selectedAR?.invoice_number}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Customer:</span>
                    <span className="detail-value">
                      {selectedAR?.customers?.first_name} {selectedAR?.customers?.last_name}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Invoice Date:</span>
                    <span className="detail-value">{formatDate(selectedAR?.invoice_date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Due Date:</span>
                    <span className="detail-value">{formatDate(selectedAR?.due_date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Original Amount:</span>
                    <span className="detail-value">{formatCurrency(selectedAR?.original_amount)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Amount Paid:</span>
                    <span className="detail-value paid">{formatCurrency(selectedAR?.amount_paid)}</span>
                  </div>
                  <div className="detail-row highlight">
                    <span className="detail-label">Amount Due:</span>
                    <span className="detail-value due">{formatCurrency(selectedAR?.amount_due)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span className={getStatusBadgeClass(selectedAR?.status)}>
                      {selectedAR?.status}
                    </span>
                  </div>
                </div>

                {/* Payment Form */}
                {selectedAR?.status !== 'paid' && selectedAR?.status !== 'cancelled' && (
                  <div className="card payment-form-card">
                    <h2>Record Payment</h2>
                    <form onSubmit={handleRecordPayment} className="payment-form">
                      <div className="form-group">
                        <label htmlFor="payment_amount">Payment Amount *</label>
                        <input
                          type="number"
                          id="payment_amount"
                          step="0.01"
                          min="0.01"
                          max={selectedAR?.amount_due}
                          value={paymentForm.payment_amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_amount: e.target.value })}
                          required
                        />
                        <small>Maximum: {formatCurrency(selectedAR?.amount_due)}</small>
                      </div>

                      <div className="form-group">
                        <label htmlFor="payment_method">Payment Method</label>
                        <select
                          id="payment_method"
                          value={paymentForm.payment_method}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                        >
                          <option value="cash">Cash</option>
                          <option value="check">Check</option>
                          <option value="credit_card">Credit Card</option>
                          <option value="debit_card">Debit Card</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="paypal">PayPal</option>
                          <option value="venmo">Venmo</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="reference_number">Reference Number</label>
                        <input
                          type="text"
                          id="reference_number"
                          placeholder="Check #, Transaction ID, etc."
                          value={paymentForm.reference_number}
                          onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="payment_date">Payment Date</label>
                        <input
                          type="date"
                          id="payment_date"
                          value={paymentForm.payment_date}
                          onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="notes">Notes</label>
                        <textarea
                          id="notes"
                          rows="3"
                          placeholder="Additional payment notes..."
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        />
                      </div>

                      <button type="submit" className="btn btn-primary btn-block">
                        Record Payment
                      </button>
                    </form>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="card payment-history-card">
                <h2>Payment History</h2>
                {paymentHistory.length === 0 ? (
                  <p className="no-payments">No payments recorded yet.</p>
                ) : (
                  <div className="table-container">
                    <table className="payment-history-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id}>
                            <td>{formatDate(payment.payment_date)}</td>
                            <td className="amount paid">{formatCurrency(payment.payment_amount)}</td>
                            <td>
                              <span className="payment-method">
                                {payment.payment_method?.replace('_', ' ') || 'N/A'}
                              </span>
                            </td>
                            <td>{payment.reference_number || '-'}</td>
                            <td>{payment.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Invoice Viewer Modal */}
      {showInvoice && selectedInvoiceData && (
        <InvoiceViewer
          invoiceData={selectedInvoiceData}
          businessInfo={businessInfo}
          onClose={() => setShowInvoice(false)}
        />
      )}
    </div>
  )
}

export default AccountsReceivable
