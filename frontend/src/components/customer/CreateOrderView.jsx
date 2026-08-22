import { useState, useMemo } from 'react'
import { orderApi } from '../../api/orderApi'

const DEFAULT_ZONES = [
  { id: 1, name: 'Zone 1 â€” North Zone' },
  { id: 2, name: 'Zone 2 â€” South Zone' },
  { id: 3, name: 'Zone 3 â€” East Zone' },
  { id: 4, name: 'Zone 4 â€” West Zone' },
  { id: 5, name: 'Zone 5 â€” Central Zone' },
]

export function CreateOrderView({ onOrderCreated }) {
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

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Client-side estimate of volumetric weight: (L * W * H) / 5000
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
      lengthCm: Number(lengthCm),
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      actualWeightKg: Number(actualWeightKg),
      orderType,
      paymentType,
    }

    try {
      const created = await orderApi.createOrder(payload)
      setSuccess(created)
      setPickupAddress('')
      setDropAddress('')
      if (onOrderCreated) {
        onOrderCreated(created)
      }
    } catch (err) {
      setError(err.message || 'Failed to create order. Please check zone rates and parcel inputs.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel create-order-panel">
      <div className="heading">
        <div>
          <p className="eyebrow">DISPATCH DESK</p>
          <h2>Book a New Delivery</h2>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="alert alert-success">
          <strong>Order #{success.id} created successfully!</strong> Total estimated charge:{' '}
          <strong>â‚¹{success.finalCharge != null ? Number(success.finalCharge).toFixed(2) : '0.00'}</strong>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-row">
          <label>
            Pickup Address
            <textarea
              rows={2}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="e.g. 101 Innovation Park, Warehouse #4"
              required
            />
          </label>
          <label>
            Drop Address
            <textarea
              rows={2}
              value={dropAddress}
              onChange={(e) => setDropAddress(e.target.value)}
              placeholder="e.g. Flat 304, Green Horizon Towers"
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
              {DEFAULT_ZONES.map((z) => (
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
              {DEFAULT_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="parcel-specs-box">
          <p className="box-title">Parcel Dimensions & Weight Specs</p>
          <div className="form-grid-4">
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
              Actual Weight (kg)
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
            <span>Volumetric Weight (LÃ—WÃ—H / 5000): <strong>{estimatedVolumetricWeight} kg</strong></span>
            <span>Billable Weight: <strong>{estimatedChargeableWeight} kg</strong></span>
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

        <div className="form-actions">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Booking Dispatchâ€¦' : 'Confirm & Book Delivery'}
          </button>
        </div>
      </form>
    </div>
  )
}
