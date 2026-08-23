import { useState, useEffect, useMemo } from 'react'
import { orderApi } from '../../api/orderApi'
import { rateApi } from '../../api/rateApi'
import { formatCurrency } from '../../utils/formatters'

export function CreateOrderView({ onOrderCreated, isAdmin = false }) {
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
  const [serverEstimate, setServerEstimate] = useState(null)
  const [estimating, setEstimating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Load available zones
  useEffect(() => {
    rateApi.getZones().then((data) => {
      if (data && data.length > 0) {
        setZones(data)
        setPickupZoneId((prev) => (data.some((z) => z.id === prev) ? prev : data[0].id))
        setDropZoneId((prev) => (data.some((z) => z.id === prev) ? prev : (data[1]?.id || data[0].id)))
      }
    }).catch(() => {})
  }, [])

  // Volumetric weight: (L * W * H) / 5000 (with sanity caps: length/width/height 1-500cm, weight 0.05-1000kg)
  const safeLength = useMemo(() => Math.min(Math.max(Number(lengthCm) || 0, 0), 500), [lengthCm])
  const safeWidth = useMemo(() => Math.min(Math.max(Number(widthCm) || 0, 0), 500), [widthCm])
  const safeHeight = useMemo(() => Math.min(Math.max(Number(heightCm) || 0, 0), 500), [heightCm])
  const safeWeight = useMemo(() => Math.min(Math.max(Number(actualWeightKg) || 0, 0), 1000), [actualWeightKg])

  const estimatedVolumetricWeight = useMemo(() => {
    if (safeLength > 0 && safeWidth > 0 && safeHeight > 0) {
      return ((safeLength * safeWidth * safeHeight) / 5000).toFixed(3)
    }
    return '0.000'
  }, [safeLength, safeWidth, safeHeight])

  const estimatedChargeableWeight = useMemo(() => {
    const vol = Number(estimatedVolumetricWeight) || 0
    return Math.max(safeWeight, vol).toFixed(3)
  }, [safeWeight, estimatedVolumetricWeight])

  // Instant local calculated estimate
  const fallbackEstimate = useMemo(() => {
    const chargeable = Math.max(Number(estimatedChargeableWeight) || 0.5, 0.1)
    const isIntraZone = pickupZoneId === dropZoneId
    const ratePerKg = orderType === 'B2B' ? (isIntraZone ? 30 : 45) : (isIntraZone ? 40 : 55)
    const minCharge = orderType === 'B2B' ? (isIntraZone ? 70 : 100) : (isIntraZone ? 50 : 80)
    const baseCharge = Math.max(chargeable * ratePerKg, minCharge)
    const codSurcharge = paymentType === 'COD' ? (orderType === 'B2B' ? 40 : 25) : 0
    const finalCharge = baseCharge + codSurcharge

    return {
      chargeableWeightKg: chargeable,
      ratePerKg,
      minimumCharge: minCharge,
      baseCharge,
      codSurcharge,
      finalCharge,
      orderType,
      paymentType,
    }
  }, [estimatedChargeableWeight, pickupZoneId, dropZoneId, orderType, paymentType])

  const estimate = serverEstimate || fallbackEstimate

  // Live pre-booking calculation estimate
  useEffect(() => {
    if (!pickupZoneId || !dropZoneId) return

    const timer = setTimeout(async () => {
      setEstimating(true)
      try {
        const est = await rateApi.estimateRate({
          pickupZoneId: Number(pickupZoneId),
          dropZoneId: Number(dropZoneId),
          lengthCm: Number(safeLength) || 10,
          widthCm: Number(safeWidth) || 10,
          heightCm: Number(safeHeight) || 10,
          actualWeightKg: Number(safeWeight) || 0.5,
          orderType,
          paymentType,
        })
        if (est && est.finalCharge) {
          setServerEstimate(est)
        }
      } catch {
        setServerEstimate(null)
      } finally {
        setEstimating(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [pickupZoneId, dropZoneId, safeLength, safeWidth, safeHeight, safeWeight, orderType, paymentType])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setSuccess(null)

    const payload = {
      pickupAddress: pickupAddress.trim(),
      dropAddress: dropAddress.trim(),
      pickupZoneId: Number(pickupZoneId),
      dropZoneId: Number(dropZoneId),
      lengthCm: Number(safeLength) || 10,
      widthCm: Number(safeWidth) || 10,
      heightCm: Number(safeHeight) || 10,
      actualWeightKg: Number(safeWeight) || 0.5,
      orderType,
      paymentType,
      ...(isAdmin && targetCustomerId ? { customerId: Number(targetCustomerId) } : {}),
    }

    try {
      const created = await orderApi.createOrder(payload)
      setSuccess(created)
      setPickupAddress('')
      setDropAddress('')
      setTargetCustomerId('')
      if (onOrderCreated) {
        onOrderCreated(created)
      }
    } catch (err) {
      setError(err.message || 'Failed to create order. Please check zone rates and parcel inputs.')
    } finally {
      setBusy(false)
    }
  }

  const zoneOptions = zones.length > 0 ? zones : [
    { id: 1, name: 'Zone 1 - North Zone' },
    { id: 2, name: 'Zone 2 - South Zone' },
    { id: 3, name: 'Zone 3 - East Zone' },
    { id: 4, name: 'Zone 4 - West Zone' },
  ]

  return (
    <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="heading">
        <div>
          <span className="eyebrow">DISPATCH DESK</span>
          <h2>Book a New Delivery</h2>
          <p className="subtitle">Specify route locations, parcel dimensions, and billing options.</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          Order <strong>#{success.id}</strong> booked successfully! Base fare: {formatCurrency(success.baseCharge)}, Total: {formatCurrency(success.finalCharge)}
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        {isAdmin && (
          <label>
            Customer User ID *
            <input
              type="number"
              value={targetCustomerId}
              onChange={(e) => setTargetCustomerId(e.target.value)}
              placeholder="e.g. 2 (Customer user ID)"
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
              placeholder="Full pickup location address, landmark, PIN"
              required
            />
          </label>
          <label>
            Delivery Address
            <textarea
              rows={2}
              value={dropAddress}
              onChange={(e) => setDropAddress(e.target.value)}
              placeholder="Full destination address, recipient contact, PIN"
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
                min="1"
                max="500"
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
                min="1"
                max="500"
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
                min="1"
                max="500"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                required
              />
            </label>
            <label>
              Actual Weight (kg)
              <input
                type="number"
                step="0.01"
                min="0.05"
                max="1000"
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
        <div className="fare-calculation-box" style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-border)', borderRadius: 'var(--radius-md)', padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <span className="eyebrow" style={{ color: 'var(--primary)', marginBottom: '2px' }}>AUTO-CALCULATED FARE ENGINE</span>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {estimating ? 'Calculating rate from engine...' : estimate ? (
                  <span>
                    Base: {formatCurrency(estimate.baseCharge)} (Rate: {formatCurrency(estimate.ratePerKg)}/kg, Min: {formatCurrency(estimate.minimumCharge)})
                    {estimate.codSurcharge > 0 ? ` + COD Surcharge: ${formatCurrency(estimate.codSurcharge)}` : ''}
                  </span>
                ) : 'Select pickup/drop zones and package weight'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block' }}>Total Billable Amount</span>
              <strong style={{ fontSize: '1.35rem', color: 'var(--text-main)' }}>
                {estimate ? formatCurrency(estimate.finalCharge) : 'Calculating...'}
              </strong>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={busy || estimating} className="btn-primary">
            {busy ? 'Booking Dispatch...' : 'Confirm & Book Delivery'}
          </button>
        </div>
      </form>
    </div>
  )
}
