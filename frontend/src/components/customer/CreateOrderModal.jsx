import { useState, useEffect, useMemo } from 'react'
import { orderApi } from '../../api/orderApi'
import { rateApi } from '../../api/rateApi'
import { formatCurrency } from '../../utils/formatters'
import { Modal } from '../common/Modal'

export function CreateOrderModal({ isOpen, onClose, onOrderCreated, isAdmin = false }) {
  const [pickupAddress, setPickupAddress] = useState('')
  const [dropAddress, setDropAddress] = useState('')
  const [pickupZoneId, setPickupZoneId] = useState(1)
  const [dropZoneId, setDropZoneId] = useState(2)
  const [lengthCm, setLengthCm] = useState(20)
  const [widthCm, setWidthCm] = useState(15)
  const [heightCm, setHeightCm] = useState(10)
  const [actualWeightKg, setActualWeightKg] = useState(1.5)
  const [orderType, setOrderType] = useState('B2C')
  const [paymentType, setPaymentType] = useState('PREPAID')
  const [targetCustomerId, setTargetCustomerId] = useState('')

  const [zones, setZones] = useState([])
  const [estimate, setEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Load available zones
  useEffect(() => {
    if (!isOpen) return
    rateApi.getZones().then((data) => {
      if (data && data.length > 0) {
        setZones(data)
        if (!data.some((z) => z.id === pickupZoneId)) setPickupZoneId(data[0].id)
        if (!data.some((z) => z.id === dropZoneId)) setDropZoneId(data[data.length > 1 ? 1 : 0].id)
      }
    }).catch(() => {})
  }, [isOpen, pickupZoneId, dropZoneId])

  // Volumetric weight: (L * W * H) / 5000
  const estimatedVolumetricWeight = useMemo(() => {
    const l = Number(lengthCm) || 0
    const w = Number(widthCm) || 0
    const h = Number(heightCm) || 0
    if (l > 0 && w > 0 && h > 0) {
      return ((l * w * h) / 5000).toFixed(3)
    }
    return '0.000'
  }, [lengthCm, widthCm, heightCm])

  const estimatedChargeableWeight = useMemo(() => {
    const act = Number(actualWeightKg) || 0
    const vol = Number(estimatedVolumetricWeight) || 0
    return Math.max(act, vol).toFixed(3)
  }, [actualWeightKg, estimatedVolumetricWeight])

  // Live server-side rate calculation estimate before confirming
  useEffect(() => {
    if (!isOpen || !pickupZoneId || !dropZoneId) return

    const timer = setTimeout(async () => {
      setEstimating(true)
      try {
        const est = await rateApi.estimateRate({
          pickupZoneId: Number(pickupZoneId),
          dropZoneId: Number(dropZoneId),
          lengthCm: Number(lengthCm) || 10,
          widthCm: Number(widthCm) || 10,
          heightCm: Number(heightCm) || 10,
          actualWeightKg: Number(actualWeightKg) || 0.5,
          orderType,
          paymentType,
        })
        setEstimate(est)
      } catch {
        setEstimate(null)
      } finally {
        setEstimating(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [isOpen, pickupZoneId, dropZoneId, lengthCm, widthCm, heightCm, actualWeightKg, orderType, paymentType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')

    const payload = {
      pickupAddress: pickupAddress.trim(),
      dropAddress: dropAddress.trim(),
      pickupZoneId: Number(pickupZoneId),
      dropZoneId: Number(dropZoneId),
      lengthCm: Number(lengthCm),
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      actualWeightKg: Number(actualWeightKg),
      orderType,
      paymentType,
      ...(isAdmin && targetCustomerId ? { customerId: Number(targetCustomerId) } : {}),
    }

    try {
      const created = await orderApi.createOrder(payload)
      onOrderCreated(created)
      setPickupAddress('')
      setDropAddress('')
      setTargetCustomerId('')
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to place delivery order.')
    } finally {
      setBusy(false)
    }
  }

  const zoneOptions = zones.length > 0 ? zones : [
    { id: 1, name: 'Zone 1 - North Zone' },
    { id: 2, name: 'Zone 2 - South Zone' },
    { id: 3, name: 'Zone 3 - East Zone' },
    { id: 4, name: 'Zone 4 - West Zone' },
    { id: 5, name: 'Zone 5 - Central Zone' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isAdmin ? 'Create Order on Behalf of Customer' : 'Create New Delivery Order'}
      subtitle={isAdmin ? 'Admin Booking Console' : 'Customer Booking Desk'}
      maxWidth="640px"
    >
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit} className="modal-form">
        {isAdmin && (
          <label>
            Customer User ID *
            <input
              type="number"
              value={targetCustomerId}
              onChange={(e) => setTargetCustomerId(e.target.value)}
              placeholder="e.g. 2 (Customer account ID)"
              required
            />
          </label>
        )}

        <div className="form-grid-2">
          <label>
            Pickup Address
            <textarea
              rows={2}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="Full pickup address, landmark, PIN"
              required
            />
          </label>
          <label>
            Delivery Address
            <textarea
              rows={2}
              value={dropAddress}
              onChange={(e) => setDropAddress(e.target.value)}
              placeholder="Destination address, recipient contact, PIN"
              required
            />
          </label>
        </div>

        <div className="form-grid-2">
          <label>
            Pickup Zone
            <select
              value={pickupZoneId}
              onChange={(e) => setPickupZoneId(Number(e.target.value))}
              required
            >
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Drop Zone
            <select
              value={dropZoneId}
              onChange={(e) => setDropZoneId(Number(e.target.value))}
              required
            >
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-section">
          <p className="section-label">Package Dimensions & Weight</p>
          <div className="dimensions-grid">
            <label>
              Length (cm)
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={lengthCm}
                onChange={(e) => setLengthCm(e.target.value)}
                required
              />
            </label>
            <label>
              Width (cm)
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={widthCm}
                onChange={(e) => setWidthCm(e.target.value)}
                required
              />
            </label>
            <label>
              Height (cm)
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                required
              />
            </label>
            <label>
              Actual Wt (kg)
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={actualWeightKg}
                onChange={(e) => setActualWeightKg(e.target.value)}
                required
              />
            </label>
          </div>
          <div className="weight-estimation">
            <span>
              Volumetric (L x W x H / 5000): <strong>{estimatedVolumetricWeight} kg</strong>
            </span>
            <span>
              Billable Weight: <strong>{estimatedChargeableWeight} kg</strong>
            </span>
          </div>
        </div>

        <div className="form-grid-2">
          <label>
            Order Type
            <select value={orderType} onChange={(e) => setOrderType(e.target.value)} required>
              <option value="B2C">B2C (Business to Consumer)</option>
              <option value="B2B">B2B (Business to Business)</option>
            </select>
          </label>
          <label>
            Payment Type
            <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} required>
              <option value="PREPAID">Prepaid (Digital / Card)</option>
              <option value="COD">COD (Cash on Delivery)</option>
            </select>
          </label>
        </div>

        {/* Live Fare Calculation Engine Breakdown */}
        <div className="fare-calculation-box" style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--primary)', marginBottom: '2px' }}>AUTO-CALCULATED FARE BREAKDOWN</span>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {estimating ? 'Calculating rate...' : estimate ? (
                  <span>
                    Base: {formatCurrency(estimate.baseCharge)} (at {formatCurrency(estimate.ratePerKg)}/kg)
                    {estimate.codSurcharge > 0 ? ` + COD: ${formatCurrency(estimate.codSurcharge)}` : ''}
                  </span>
                ) : 'Select zones & weight to view fare'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>Total Estimated Charge</span>
              <strong style={{ fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {estimate ? formatCurrency(estimate.finalCharge) : 'Calculating...'}
              </strong>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" disabled={busy || estimating} className="btn-primary">
            {busy ? 'Placing Order...' : 'Confirm & Place Order'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
