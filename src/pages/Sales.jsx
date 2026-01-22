import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'
import InvoiceViewer from '../components/InvoiceViewer'
import './Sales.css'

function Sales() {
  const [view, setView] = useState('list') // 'list' or 'form'
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [services, setServices] = useState([])
  const [products, setProducts] = useState([])
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showInvoice, setShowInvoice] = useState(false)
  const [selectedSaleForInvoice, setSelectedSaleForInvoice] = useState(null)
  const [businessInfo, setBusinessInfo] = useState(null)

  // Sale form state
  const [saleForm, setSaleForm] = useState({
    customer_id: '',
    sale_date: new Date().toISOString().split('T')[0],
    notes: '',
    internal_notes: '',
    tax_rate: 0,
    discount_amount: 0,
    payment_due_date: ''
  })

  const [lineItems, setLineItems] = useState([])
  const [inventoryReservations, setInventoryReservations] = useState([])
  const [inventoryStatus, setInventoryStatus] = useState([])

  // Add item form state
  const [addItemForm, setAddItemForm] = useState({
    item_type: 'service',
    service_id: '',
    product_id: '',
    quantity: 1
  })

  useEffect(() => {
    fetchSales()
    fetchCustomers()
    fetchServices()
    fetchProducts()
    fetchBusinessInfo()
  }, [])

  useEffect(() => {
    if (lineItems.length > 0) {
      checkInventoryAvailability()
    } else {
      setInventoryStatus([])
    }
  }, [lineItems])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (error) {
      console.error('Error fetching sales:', error)
      setMessage({ type: 'error', text: 'Failed to load sales' })
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchServices = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProducts(data || [])
    } catch (error) {
      console.error('Error fetching products:', error)
    }
  }

  const fetchBusinessInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('business_name, phone, address')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setBusinessInfo({
        businessName: data?.business_name || 'Your Business',
        phone: data?.phone || '',
        address: data?.address || '',
        email: user.email || ''
      })
    } catch (error) {
      console.error('Error fetching business info:', error)
    }
  }

  const handleAddLineItem = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let newItem = null

      if (addItemForm.item_type === 'service') {
        const service = services.find(s => s.id === addItemForm.service_id)
        if (!service) {
          setMessage({ type: 'error', text: 'Please select a service' })
          return
        }

        // Fetch service products to calculate inventory needs
        const { data: serviceProducts, error: spError } = await supabase
          .from('service_products')
          .select(`
            *,
            products (
              id,
              name,
              quantity_in_stock,
              cost
            )
          `)
          .eq('service_id', service.id)

        if (spError) throw spError

        newItem = {
          id: `temp-${Date.now()}`,
          item_type: 'service',
          service_id: service.id,
          product_id: null,
          item_name: service.name,
          item_description: service.description,
          quantity: parseFloat(addItemForm.quantity),
          unit_price: parseFloat(service.base_price || 0),
          unit_cost: parseFloat(service.cost || 0),
          line_total: parseFloat(addItemForm.quantity) * parseFloat(service.base_price || 0),
          line_cost: parseFloat(addItemForm.quantity) * parseFloat(service.cost || 0),
          discount_amount: 0,
          service_products: serviceProducts || []
        }
      } else {
        const product = products.find(p => p.id === addItemForm.product_id)
        if (!product) {
          setMessage({ type: 'error', text: 'Please select a product' })
          return
        }

        newItem = {
          id: `temp-${Date.now()}`,
          item_type: 'product',
          service_id: null,
          product_id: product.id,
          item_name: product.name,
          item_description: product.description,
          quantity: parseFloat(addItemForm.quantity),
          unit_price: parseFloat(product.price || 0),
          unit_cost: parseFloat(product.cost || 0),
          line_total: parseFloat(addItemForm.quantity) * parseFloat(product.price || 0),
          line_cost: parseFloat(addItemForm.quantity) * parseFloat(product.cost || 0),
          discount_amount: 0,
          service_products: []
        }
      }

      setLineItems([...lineItems, newItem])
      setAddItemForm({
        item_type: 'service',
        service_id: '',
        product_id: '',
        quantity: 1
      })
      setMessage({ type: 'success', text: 'Item added to sale' })
    } catch (error) {
      console.error('Error adding line item:', error)
      setMessage({ type: 'error', text: 'Failed to add item' })
    }
  }

  const handleRemoveLineItem = (itemId) => {
    setLineItems(lineItems.filter(item => item.id !== itemId))
  }

  const handleUpdateQuantity = (itemId, newQuantity) => {
    const quantity = parseFloat(newQuantity) || 0
    setLineItems(lineItems.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          quantity,
          line_total: quantity * item.unit_price,
          line_cost: quantity * item.unit_cost
        }
      }
      return item
    }))
  }

  const checkInventoryAvailability = async () => {
    try {
      const inventoryNeeds = {}

      // Calculate total inventory needs from all line items
      for (const item of lineItems) {
        if (item.item_type === 'service' && item.service_products) {
          // For services, calculate product needs based on service_products
          for (const sp of item.service_products) {
            const productId = sp.products?.id || sp.product_id
            const quantityNeeded = sp.quantity_used * item.quantity
            
            if (inventoryNeeds[productId]) {
              inventoryNeeds[productId].quantity_needed += quantityNeeded
            } else {
              inventoryNeeds[productId] = {
                product_id: productId,
                product_name: sp.products?.name || 'Unknown Product',
                quantity_needed: quantityNeeded,
                quantity_available: sp.products?.quantity_in_stock || 0
              }
            }
          }
        } else if (item.item_type === 'product') {
          // For standalone products
          const productId = item.product_id
          const product = products.find(p => p.id === productId)
          
          if (inventoryNeeds[productId]) {
            inventoryNeeds[productId].quantity_needed += item.quantity
          } else {
            inventoryNeeds[productId] = {
              product_id: productId,
              product_name: item.item_name,
              quantity_needed: item.quantity,
              quantity_available: product?.quantity_in_stock || 0
            }
          }
        }
      }

      // Convert to array and add sufficiency check
      const statusArray = Object.values(inventoryNeeds).map(item => ({
        ...item,
        is_sufficient: item.quantity_available >= item.quantity_needed
      }))

      setInventoryStatus(statusArray)
    } catch (error) {
      console.error('Error checking inventory:', error)
    }
  }

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.line_total - (item.discount_amount || 0)), 0)
    const totalCost = lineItems.reduce((sum, item) => sum + (item.line_cost || 0), 0)
    const taxAmount = (subtotal - (saleForm.discount_amount || 0)) * ((saleForm.tax_rate || 0) / 100)
    const total = subtotal - (saleForm.discount_amount || 0) + taxAmount
    const profit = total - totalCost
    const profitMargin = total > 0 ? (profit / total) * 100 : 0

    return {
      subtotal,
      totalCost,
      taxAmount,
      total,
      profit,
      profitMargin
    }
  }

  const handleSaveDraft = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (!saleForm.customer_id) {
        setMessage({ type: 'error', text: 'Please select a customer' })
        return
      }

      if (lineItems.length === 0) {
        setMessage({ type: 'error', text: 'Please add at least one item to the sale' })
        return
      }

      const totals = calculateTotals()

      // Generate sale number
      const { data: saleNumberData, error: saleNumberError } = await supabase
        .rpc('generate_sale_number', { user_id_param: user.id })

      if (saleNumberError) throw saleNumberError

      // Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          user_id: user.id,
          customer_id: saleForm.customer_id,
          sale_number: saleNumberData,
          sale_date: saleForm.sale_date,
          subtotal: totals.subtotal,
          tax_rate: saleForm.tax_rate || 0,
          tax_amount: totals.taxAmount,
          discount_amount: saleForm.discount_amount || 0,
          total_amount: totals.total,
          total_cost: totals.totalCost,
          profit_margin: totals.profit,
          status: 'draft',
          payment_status: 'unpaid',
          amount_paid: 0,
          amount_due: totals.total,
          payment_due_date: saleForm.payment_due_date || null,
          notes: saleForm.notes,
          internal_notes: saleForm.internal_notes
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items and inventory reservations
      for (const item of lineItems) {
        const { data: saleItemData, error: itemError } = await supabase
          .from('sale_items')
          .insert({
            sale_id: saleData.id,
            user_id: user.id,
            item_type: item.item_type,
            service_id: item.service_id,
            product_id: item.product_id,
            item_name: item.item_name,
            item_description: item.item_description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit_cost: item.unit_cost,
            line_total: item.line_total,
            line_cost: item.line_cost,
            discount_amount: item.discount_amount || 0
          })
          .select()
          .single()

        if (itemError) throw itemError

        // Create inventory reservations
        if (item.item_type === 'service' && item.service_products) {
          for (const sp of item.service_products) {
            await supabase
              .from('sale_inventory_reservations')
              .insert({
                sale_id: saleData.id,
                sale_item_id: saleItemData.id,
                product_id: sp.products?.id || sp.product_id,
                user_id: user.id,
                quantity_reserved: sp.quantity_used * item.quantity,
                status: 'reserved'
              })
          }
        } else if (item.item_type === 'product') {
          await supabase
            .from('sale_inventory_reservations')
            .insert({
              sale_id: saleData.id,
              sale_item_id: saleItemData.id,
              product_id: item.product_id,
              user_id: user.id,
              quantity_reserved: item.quantity,
              status: 'reserved'
            })
        }
      }

      setMessage({ type: 'success', text: `Sale ${saleNumberData} saved as draft!` })
      resetForm()
      fetchSales()
      setView('list')
    } catch (error) {
      console.error('Error saving sale:', error)
      setMessage({ type: 'error', text: 'Failed to save sale: ' + error.message })
    }
  }

  const handleCompleteSale = async (saleId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update sale status to completed
      const { error: saleError } = await supabase
        .from('sales')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', saleId)
        .eq('user_id', user.id)

      if (saleError) throw saleError

      // Commit inventory (deduct from stock)
      const { error: inventoryError } = await supabase
        .rpc('commit_sale_inventory', { sale_id_param: saleId })

      if (inventoryError) throw inventoryError

      // Create AR ledger entry
      const { error: arError } = await supabase
        .rpc('create_ar_from_sale', { sale_id_param: saleId })

      if (arError) throw arError

      setMessage({ type: 'success', text: 'Sale completed and added to Accounts Receivable!' })
      fetchSales()
    } catch (error) {
      console.error('Error completing sale:', error)
      setMessage({ type: 'error', text: 'Failed to complete sale: ' + error.message })
    }
  }

  const handleViewInvoice = async (sale) => {
    try {
      // Fetch sale line items
      const { data: saleItems, error: itemsError } = await supabase
        .from('sale_items')
        .select(`
          *,
          services (name, description),
          products (name, description)
        `)
        .eq('sale_id', sale.id)

      if (itemsError) throw itemsError

      // Format line items for invoice
      const lineItems = saleItems.map(item => ({
        name: item.item_type === 'service' 
          ? item.services?.name 
          : item.products?.name,
        description: item.item_type === 'service'
          ? item.services?.description
          : item.products?.description,
        details: item.item_type === 'service' ? 'Service' : 'Product',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      }))

      // Prepare invoice data
      const invoiceData = {
        invoiceNumber: sale.sale_number,
        invoiceDate: sale.sale_date,
        dueDate: sale.payment_due_date,
        customer: sale.customers,
        lineItems: lineItems,
        subtotal: sale.subtotal,
        taxRate: sale.tax_rate,
        taxAmount: sale.tax_amount,
        discount: sale.discount_amount,
        total: sale.total_amount,
        notes: sale.notes,
        status: sale.status,
        paymentTerms: sale.payment_due_date 
          ? `Payment due by ${new Date(sale.payment_due_date).toLocaleDateString()}`
          : 'Payment due upon receipt'
      }

      setSelectedSaleForInvoice(invoiceData)
      setShowInvoice(true)
    } catch (error) {
      console.error('Error preparing invoice:', error)
      setMessage({ type: 'error', text: 'Failed to load invoice data' })
    }
  }

  const resetForm = () => {
    setSaleForm({
      customer_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      notes: '',
      internal_notes: '',
      tax_rate: 0,
      discount_amount: 0,
      payment_due_date: ''
    })
    setLineItems([])
    setInventoryStatus([])
    setAddItemForm({
      item_type: 'service',
      service_id: '',
      product_id: '',
      quantity: 1
    })
  }

  const totals = calculateTotals()
  const hasInventoryIssues = inventoryStatus.some(item => !item.is_sufficient)

  if (loading) {
    return (
      <div className="dashboard-container">
        <Navigation />
        <main className="main-content">
          <div className="loading">Loading sales...</div>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <Navigation />

      <main className="main-content">
        <div className="sales-container">
          <div className="sales-header">
            <div>
              <h1>Sales Management</h1>
              <p>Create sales, track inventory, and prepare for AR</p>
            </div>
            <div className="sales-actions">
              {view === 'list' ? (
                <button className="btn btn-primary" onClick={() => setView('form')}>
                  + New Sale
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={() => {
                  setView('list')
                  resetForm()
                }}>
                  ← Back to List
                </button>
              )}
            </div>
          </div>

          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {view === 'list' ? (
            // Sales List View
            sales.length === 0 ? (
              <div className="empty-state">
                <h2>No Sales Yet</h2>
                <p>Start tracking your detailing business sales. Create your first sale to get started!</p>
                <button className="btn btn-primary" onClick={() => setView('form')}>
                  Create First Sale
                </button>
              </div>
            ) : (
              <div className="sales-list">
                <table className="sales-table">
                  <thead>
                    <tr>
                      <th>Sale #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map(sale => (
                      <tr key={sale.id}>
                        <td><strong>{sale.sale_number}</strong></td>
                        <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                        <td>
                          {sale.customers?.first_name} {sale.customers?.last_name}
                        </td>
                        <td>${parseFloat(sale.total_amount).toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${sale.status}`}>
                            {sale.status}
                          </span>
                        </td>
                        <td>
                          <span className={`payment-badge ${sale.payment_status}`}>
                            {sale.payment_status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {sale.status === 'draft' && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleCompleteSale(sale.id)}
                                title="Complete sale and add to AR"
                              >
                                Complete Sale
                              </button>
                            )}
                            {sale.status === 'completed' && (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleViewInvoice(sale)}
                                title="View and print invoice"
                              >
                                📄 View Invoice
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // Sale Form View
            <div className="sale-form">
              {/* Customer Selection */}
              <div className="sale-form-section">
                <h3>Customer Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Customer *</label>
                    <select
                      value={saleForm.customer_id}
                      onChange={(e) => setSaleForm({ ...saleForm, customer_id: e.target.value })}
                      required
                    >
                      <option value="">Select a customer...</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.first_name} {customer.last_name}
                          {customer.vehicle_make && ` - ${customer.vehicle_make} ${customer.vehicle_model}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Sale Date *</label>
                    <input
                      type="date"
                      value={saleForm.sale_date}
                      onChange={(e) => setSaleForm({ ...saleForm, sale_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Due Date</label>
                    <input
                      type="date"
                      value={saleForm.payment_due_date}
                      onChange={(e) => setSaleForm({ ...saleForm, payment_due_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="sale-form-section">
                <div className="line-items-header">
                  <h3>Items</h3>
                </div>

                {/* Add Item Section */}
                <div className="add-item-section">
                  <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add Item</h4>
                  <div className="add-item-controls">
                    <div className="form-group">
                      <label>Item Type</label>
                      <select
                        value={addItemForm.item_type}
                        onChange={(e) => setAddItemForm({ ...addItemForm, item_type: e.target.value })}
                      >
                        <option value="service">Service</option>
                        <option value="product">Product</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>
                        {addItemForm.item_type === 'service' ? 'Select Service' : 'Select Product'}
                      </label>
                      {addItemForm.item_type === 'service' ? (
                        <select
                          value={addItemForm.service_id}
                          onChange={(e) => setAddItemForm({ ...addItemForm, service_id: e.target.value })}
                        >
                          <option value="">Choose a service...</option>
                          {services.map(service => (
                            <option key={service.id} value={service.id}>
                              {service.name} - ${parseFloat(service.base_price || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={addItemForm.product_id}
                          onChange={(e) => setAddItemForm({ ...addItemForm, product_id: e.target.value })}
                        >
                          <option value="">Choose a product...</option>
                          {products.map(product => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${parseFloat(product.price || 0).toFixed(2)}
                              {' '}(Stock: {product.quantity_in_stock})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={addItemForm.quantity}
                        onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })}
                        style={{ width: '100px' }}
                      />
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleAddLineItem}
                      style={{ alignSelf: 'flex-end' }}
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Line Items Table */}
                {lineItems.length > 0 && (
                  <table className="line-items-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map(item => (
                        <tr key={item.id}>
                          <td>
                            <span className={`item-badge ${item.item_type}`}>
                              {item.item_type}
                            </span>
                          </td>
                          <td>
                            <div className="item-name">{item.item_name}</div>
                            {item.item_description && (
                              <div className="item-description">{item.item_description}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              className="quantity-input"
                              min="0.001"
                              step="0.001"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(item.id, e.target.value)}
                            />
                          </td>
                          <td>${parseFloat(item.unit_price).toFixed(2)}</td>
                          <td><strong>${parseFloat(item.line_total).toFixed(2)}</strong></td>
                          <td>
                            <button
                              className="btn-icon"
                              onClick={() => handleRemoveLineItem(item.id)}
                              title="Remove item"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Inventory Status */}
              {inventoryStatus.length > 0 && (
                <div className="sale-form-section">
                  <div className="inventory-status">
                    <h4>Inventory Requirements</h4>
                    {inventoryStatus.map(item => (
                      <div key={item.product_id} className="inventory-item">
                        <span className="inventory-item-name">{item.product_name}</span>
                        <div className="inventory-item-quantity">
                          <span>Need: {item.quantity_needed.toFixed(2)}</span>
                          <span>Available: {item.quantity_available}</span>
                          <span className={item.is_sufficient ? 'inventory-sufficient' : 'inventory-insufficient'}>
                            {item.is_sufficient ? '✓ OK' : '✗ Insufficient'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {hasInventoryIssues && (
                      <div className="inventory-error">
                        ⚠️ Warning: Insufficient inventory for some products. Please adjust quantities or restock before completing this sale.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sale Summary */}
              {lineItems.length > 0 && (
                <div className="sale-form-section">
                  <div className="sale-summary">
                    <h4>Sale Summary</h4>
                    <div className="summary-row">
                      <span className="summary-label">Subtotal:</span>
                      <span className="summary-value">${totals.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="form-row" style={{ marginTop: '1rem' }}>
                      <div className="form-group">
                        <label>Tax Rate (%)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={saleForm.tax_rate}
                          onChange={(e) => setSaleForm({ ...saleForm, tax_rate: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Discount Amount ($)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={saleForm.discount_amount}
                          onChange={(e) => setSaleForm({ ...saleForm, discount_amount: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Discount:</span>
                      <span className="summary-value">-${(saleForm.discount_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Tax ({saleForm.tax_rate}%):</span>
                      <span className="summary-value">${totals.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="summary-row total">
                      <span className="summary-label">Total:</span>
                      <span className="summary-value">${totals.total.toFixed(2)}</span>
                    </div>

                    <div className="profit-info">
                      <div className="profit-row">
                        <span>Total Cost:</span>
                        <span>${totals.totalCost.toFixed(2)}</span>
                      </div>
                      <div className="profit-row">
                        <span>Profit:</span>
                        <span className={totals.profit >= 0 ? 'profit-positive' : 'profit-negative'}>
                          ${totals.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="profit-row">
                        <span>Profit Margin:</span>
                        <span className={totals.profitMargin >= 0 ? 'profit-positive' : 'profit-negative'}>
                          {totals.profitMargin.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="sale-form-section">
                <h3>Additional Information</h3>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Customer Notes</label>
                    <textarea
                      value={saleForm.notes}
                      onChange={(e) => setSaleForm({ ...saleForm, notes: e.target.value })}
                      placeholder="Notes visible to customer..."
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>Internal Notes</label>
                    <textarea
                      value={saleForm.internal_notes}
                      onChange={(e) => setSaleForm({ ...saleForm, internal_notes: e.target.value })}
                      placeholder="Private notes (not visible to customer)..."
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setView('list')
                    resetForm()
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveDraft}
                  disabled={!saleForm.customer_id || lineItems.length === 0}
                >
                  Save as Draft
                </button>
              </div>

              {hasInventoryIssues && (
                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                  💡 This sale is saved as a draft with inventory reserved. The inventory will not be deducted until you complete the sale. You can adjust quantities or restock products before completing.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Invoice Viewer Modal */}
      {showInvoice && selectedSaleForInvoice && (
        <InvoiceViewer
          invoiceData={selectedSaleForInvoice}
          businessInfo={businessInfo}
          onClose={() => {
            setShowInvoice(false)
            setSelectedSaleForInvoice(null)
          }}
        />
      )}
    </div>
  )
}

export default Sales
