import React, { useRef, forwardRef } from 'react'
import './Invoice.css'

const Invoice = forwardRef(({ invoiceData, businessInfo }, ref) => {
  const {
    invoiceNumber,
    invoiceDate,
    dueDate,
    customer,
    lineItems,
    subtotal,
    taxRate,
    taxAmount,
    discount,
    total,
    notes,
    paymentTerms,
    status
  } = invoiceData

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
      month: 'long',
      day: 'numeric'
    })
  }

  const formatPaymentTerms = () => {
    // If paymentTerms is provided as a string, use it
    if (paymentTerms && typeof paymentTerms === 'string') {
      return paymentTerms
    }

    // Otherwise, generate from customer payment terms data
    if (customer) {
      const termsType = customer.payment_terms_type
      
      if (termsType === 'due_on_receipt') {
        return 'Due on Receipt'
      } else if (termsType === 'net_days') {
        const days = customer.payment_net_days || 30
        return `Net ${days} - Payment due within ${days} days`
      } else if (termsType === 'discount') {
        const discountPercent = customer.payment_discount_percent || 0
        const discountDays = customer.payment_discount_days || 0
        const netDays = customer.payment_net_days || 30
        return `${discountPercent}/${discountDays} Net ${netDays} - ${discountPercent}% discount if paid within ${discountDays} days, otherwise due in ${netDays} days`
      } else if (termsType === 'specific_dates') {
        const dates = customer.payment_specific_dates || ''
        return `Payment due on the ${dates} of each month`
      }
    }

    // Default fallback
    if (dueDate) {
      return `Payment is due by ${formatDate(dueDate)}`
    }
    
    return 'Net 30 - Payment due within 30 days'
  }

  return (
    <div className="invoice-container" ref={ref}>
      <div className="invoice-page">
        {/* Header */}
        <div className="invoice-header">
          <div className="company-info">
            <h1 className="company-name">{businessInfo?.businessName || 'Your Business Name'}</h1>
            {businessInfo?.address && <p>{businessInfo.address}</p>}
            {businessInfo?.city && businessInfo?.state && businessInfo?.zip && (
              <p>{businessInfo.city}, {businessInfo.state} {businessInfo.zip}</p>
            )}
            {businessInfo?.phone && <p>Phone: {businessInfo.phone}</p>}
            {businessInfo?.email && <p>Email: {businessInfo.email}</p>}
          </div>
          <div className="invoice-title-section">
            <h2 className="invoice-title">INVOICE</h2>
            <div className="invoice-meta">
              <div className="meta-row">
                <span className="meta-label">Invoice #:</span>
                <span className="meta-value">{invoiceNumber || 'N/A'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">Date:</span>
                <span className="meta-value">{formatDate(invoiceDate)}</span>
              </div>
              {dueDate && (
                <div className="meta-row">
                  <span className="meta-label">Due Date:</span>
                  <span className="meta-value">{formatDate(dueDate)}</span>
                </div>
              )}
              {status && (
                <div className="meta-row">
                  <span className="meta-label">Status:</span>
                  <span className={`status-badge status-${status.toLowerCase()}`}>
                    {status.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="invoice-parties">
          <div className="bill-to">
            <h3>Bill To:</h3>
            <div className="customer-details">
              <p className="customer-name">
                {customer?.first_name} {customer?.last_name}
              </p>
              {customer?.company && <p>{customer.company}</p>}
              {customer?.address && <p>{customer.address}</p>}
              {customer?.city && customer?.state && customer?.zip && (
                <p>{customer.city}, {customer.state} {customer.zip}</p>
              )}
              {customer?.email && <p>Email: {customer.email}</p>}
              {customer?.phone && <p>Phone: {customer.phone}</p>}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="invoice-items">
          <table className="items-table">
            <thead>
              <tr>
                <th className="item-description">Description</th>
                <th className="item-quantity">Quantity</th>
                <th className="item-price">Unit Price</th>
                <th className="item-total">Amount</th>
              </tr>
            </thead>
            <tbody>
              {lineItems && lineItems.length > 0 ? (
                lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="item-description">
                      <div className="item-name">{item.name || item.description}</div>
                      {item.details && <div className="item-details">{item.details}</div>}
                    </td>
                    <td className="item-quantity">{item.quantity}</td>
                    <td className="item-price">{formatCurrency(item.unit_price)}</td>
                    <td className="item-total">{formatCurrency(item.total_price)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-items">No items</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="invoice-totals">
          <div className="totals-table">
            <div className="total-row">
              <span className="total-label">Subtotal:</span>
              <span className="total-value">{formatCurrency(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="total-row">
                <span className="total-label">Discount:</span>
                <span className="total-value">-{formatCurrency(discount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="total-row">
                <span className="total-label">Tax ({taxRate}%):</span>
                <span className="total-value">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="total-row grand-total">
              <span className="total-label">Total:</span>
              <span className="total-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes and Payment Terms */}
        <div className="invoice-footer">
          {notes && (
            <div className="invoice-notes">
              <h4>Notes:</h4>
              <p>{notes}</p>
            </div>
          )}
          <div className="payment-terms">
            <h4>Payment Terms:</h4>
            <p>{formatPaymentTerms()}</p>
            {customer?.payment_terms_notes && (
              <p className="payment-terms-notes"><em>{customer.payment_terms_notes}</em></p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-bottom">
          <p className="thank-you">Thank you for your business!</p>
        </div>
      </div>
    </div>
  )
})

Invoice.displayName = 'Invoice'

export default Invoice
