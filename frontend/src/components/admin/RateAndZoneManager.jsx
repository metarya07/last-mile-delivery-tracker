import { useState, useEffect } from 'react'
import { rateApi } from '../../api/rateApi'
import { formatCurrency } from '../../utils/formatters'
import { IconPlus, IconRefresh, IconCheck, IconAlert } from '../common/Icons'

export function RateAndZoneManager() {
  const [activeSubTab, setActiveSubTab] = useState('rate-cards') // 'rate-cards' | 'cod-charges' | 'zones'
  const [rateCards, setRateCards] = useState([])
  const [codCharges, setCodCharges] = useState([])
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Rate card edit/create form state
  const [pickupZoneId, setPickupZoneId] = useState(1)
  const [dropZoneId, setDropZoneId] = useState(1)
  const [orderType, setOrderType] = useState('B2C')
  const [ratePerKg, setRatePerKg] = useState(25)
  const [minimumCharge, setMinimumCharge] = useState(50)
  const [savingRate, setSavingRate] = useState(false)

  // COD edit form state
  const [codOrderType, setCodOrderType] = useState('B2C')
  const [codSurcharge, setCodSurcharge] = useState(30)
  const [savingCod, setSavingCod] = useState(false)

  // Zone create state
  const [newZoneName, setNewZoneName] = useState('')
  const [savingZone, setSavingZone] = useState(false)

  // Add area state
  const [targetZoneId, setTargetZoneId] = useState(1)
  const [newAreaName, setNewAreaName] = useState('')
  const [savingArea, setSavingArea] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [cardsData, codData, zonesData] = await Promise.all([
        rateApi.getRateCards().catch(() => []),
        rateApi.getCodCharges().catch(() => []),
        rateApi.getZones().catch(() => []),
      ])
      setRateCards(cardsData || [])
      setCodCharges(codData || [])
      setZones(zonesData || [])
      if (zonesData && zonesData.length > 0) {
        setPickupZoneId(zonesData[0].id)
        setDropZoneId(zonesData[0].id)
        setTargetZoneId(zonesData[0].id)
      }
    } catch (err) {
      setError(err.message || 'Failed to load rate configurations.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const [cardsData, codData, zonesData] = await Promise.all([
          rateApi.getRateCards().catch(() => []),
          rateApi.getCodCharges().catch(() => []),
          rateApi.getZones().catch(() => []),
        ])
        if (isMounted) {
          setRateCards(cardsData || [])
          setCodCharges(codData || [])
          setZones(zonesData || [])
          if (zonesData && zonesData.length > 0) {
            setPickupZoneId(zonesData[0].id)
            setDropZoneId(zonesData[0].id)
            setTargetZoneId(zonesData[0].id)
          }
          setError('')
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load rate configurations.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [])

  const handleSaveRateCard = async (e) => {
    e.preventDefault()
    setSavingRate(true)
    setError('')
    setSuccess('')
    try {
      await rateApi.saveRateCard({
        pickupZoneId: Number(pickupZoneId),
        dropZoneId: Number(dropZoneId),
        orderType,
        ratePerKg: Number(ratePerKg),
        minimumCharge: Number(minimumCharge),
      })
      setSuccess('Rate card saved successfully!')
      loadData()
    } catch (err) {
      setError(err.message || 'Failed to save rate card.')
    } finally {
      setSavingRate(false)
    }
  }

  const handleSaveCod = async (e) => {
    e.preventDefault()
    setSavingCod(true)
    setError('')
    setSuccess('')
    try {
      await rateApi.saveCodCharge({
        orderType: codOrderType,
        surcharge: Number(codSurcharge),
      })
      setSuccess(`COD surcharge for ${codOrderType} updated successfully!`)
      loadData()
    } catch (err) {
      setError(err.message || 'Failed to save COD surcharge.')
    } finally {
      setSavingCod(false)
    }
  }

  const handleCreateZone = async (e) => {
    e.preventDefault()
    if (!newZoneName.trim()) return
    setSavingZone(true)
    setError('')
    setSuccess('')
    try {
      await rateApi.createZone({ name: newZoneName.trim() })
      setSuccess(`Zone "${newZoneName}" created successfully!`)
      setNewZoneName('')
      loadData()
    } catch (err) {
      setError(err.message || 'Failed to create zone.')
    } finally {
      setSavingZone(false)
    }
  }

  const handleAddArea = async (e) => {
    e.preventDefault()
    if (!newAreaName.trim()) return
    setSavingArea(true)
    setError('')
    setSuccess('')
    try {
      await rateApi.addAreaToZone(targetZoneId, { areaName: newAreaName.trim() })
      setSuccess(`Area "${newAreaName}" assigned to zone successfully!`)
      setNewAreaName('')
      loadData()
    } catch (err) {
      setError(err.message || 'Failed to add area.')
    } finally {
      setSavingArea(false)
    }
  }

  return (
    <div className="rate-zone-manager">
      <div className="section-toolbar" style={{ marginBottom: '16px' }}>
        <div>
          <h2>Rate Cards & Zone Hierarchy</h2>
          <p className="subtitle">Configure B2B/B2C zone rates, COD surcharges, and geographic area assignments.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={loadData} disabled={loading}>
          <IconRefresh size={14} />
          <span>{loading ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          <IconAlert size={16} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="alert alert-success" style={{ marginBottom: '16px' }}>
          <IconCheck size={16} />
          <span>{success}</span>
        </div>
      )}

      {/* Sub tabs */}
      <div className="order-tabs" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`order-tab ${activeSubTab === 'rate-cards' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('rate-cards')}
        >
          Rate Cards ({rateCards.length})
        </button>
        <button
          type="button"
          className={`order-tab ${activeSubTab === 'cod-charges' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('cod-charges')}
        >
          COD Surcharges ({codCharges.length})
        </button>
        <button
          type="button"
          className={`order-tab ${activeSubTab === 'zones' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('zones')}
        >
          Zones & Areas ({zones.length})
        </button>
      </div>

      {/* SUB TAB 1: RATE CARDS */}
      {activeSubTab === 'rate-cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Rate Card Form */}
          <div className="panel">
            <div className="heading">
              <div>
                <p className="eyebrow">RATE CARD CONFIGURATION</p>
                <h3>Add / Update Intra & Inter-Zone Rate Card</h3>
              </div>
            </div>

            <form onSubmit={handleSaveRateCard} className="modal-form">
              <div className="form-grid-2">
                <label>
                  Pickup Zone
                  <select
                    value={pickupZoneId}
                    onChange={(e) => setPickupZoneId(Number(e.target.value))}
                    required
                  >
                    {zones.map((z) => (
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
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="dimensions-grid">
                <label>
                  Order Type
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)} required>
                    <option value="B2C">B2C</option>
                    <option value="B2B">B2B</option>
                  </select>
                </label>
                <label>
                  Rate Per Kg (₹)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={ratePerKg}
                    onChange={(e) => setRatePerKg(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Minimum Charge (₹)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={minimumCharge}
                    onChange={(e) => setMinimumCharge(e.target.value)}
                    required
                  />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={savingRate} className="btn-primary" style={{ width: '100%', height: '42px' }}>
                    {savingRate ? 'Saving...' : 'Save Rate Card'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Rate Cards Registry Table */}
          <div className="panel">
            <div className="heading">
              <div>
                <p className="eyebrow">ACTIVE RATE REGISTRY</p>
                <h3>All Configured Rate Cards ({rateCards.length})</h3>
              </div>
            </div>

            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Route (Pickup &rarr; Drop)</th>
                    <th>Order Type</th>
                    <th>Rate / Kg</th>
                    <th>Minimum Charge</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {rateCards.map((rc) => {
                    const isIntra = rc.pickupZoneId === rc.dropZoneId
                    return (
                      <tr key={rc.id}>
                        <td>
                          <strong>{rc.pickupZoneName} &rarr; {rc.dropZoneName}</strong>
                        </td>
                        <td>
                          <span className="badge-meta">{rc.orderType}</span>
                        </td>
                        <td>
                          <strong>{formatCurrency(rc.ratePerKg)} / kg</strong>
                        </td>
                        <td>
                          <span>{formatCurrency(rc.minimumCharge)}</span>
                        </td>
                        <td>
                          <span className={isIntra ? 'badge-agent-assigned' : 'badge-meta'}>
                            {isIntra ? 'Intra-Zone' : 'Inter-Zone'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 2: COD SURCHARGES */}
      {activeSubTab === 'cod-charges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel">
            <div className="heading">
              <div>
                <p className="eyebrow">COD PRICING RULES</p>
                <h3>Configure COD Surcharge per Order Type</h3>
              </div>
            </div>

            <form onSubmit={handleSaveCod} className="modal-form">
              <div className="form-grid-2">
                <label>
                  Order Type
                  <select value={codOrderType} onChange={(e) => setCodOrderType(e.target.value)} required>
                    <option value="B2C">B2C (Business to Consumer)</option>
                    <option value="B2B">B2B (Business to Business)</option>
                  </select>
                </label>
                <label>
                  COD Surcharge (₹)
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={codSurcharge}
                    onChange={(e) => setCodSurcharge(e.target.value)}
                    required
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" disabled={savingCod} className="btn-primary">
                  {savingCod ? 'Saving...' : 'Update COD Surcharge'}
                </button>
              </div>
            </form>
          </div>

          <div className="panel">
            <div className="heading">
              <div>
                <p className="eyebrow">ACTIVE SURCHARGE RULES</p>
                <h3>Current COD Surcharges</h3>
              </div>
            </div>

            <div className="orders-table-wrapper">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order Type</th>
                    <th>COD Surcharge</th>
                  </tr>
                </thead>
                <tbody>
                  {codCharges.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.orderType}</strong></td>
                      <td><strong>{formatCurrency(c.surcharge)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB TAB 3: ZONES & AREAS */}
      {activeSubTab === 'zones' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Create Zone & Add Area Forms */}
          <div className="form-grid-2">
            <div className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">ZONE CREATION</p>
                  <h3>Create New Delivery Zone</h3>
                </div>
              </div>
              <form onSubmit={handleCreateZone} className="modal-form">
                <label>
                  Zone Name
                  <input
                    type="text"
                    value={newZoneName}
                    onChange={(e) => setNewZoneName(e.target.value)}
                    placeholder="e.g. Zone 6 - Airport & Port Corridor"
                    required
                  />
                </label>
                <button type="submit" disabled={savingZone || !newZoneName.trim()} className="btn-primary">
                  <IconPlus size={15} />
                  <span>{savingZone ? 'Creating...' : 'Create Zone'}</span>
                </button>
              </form>
            </div>

            <div className="panel">
              <div className="heading">
                <div>
                  <p className="eyebrow">AREA ASSIGNMENT</p>
                  <h3>Assign Area to Zone</h3>
                </div>
              </div>
              <form onSubmit={handleAddArea} className="modal-form">
                <label>
                  Select Zone
                  <select
                    value={targetZoneId}
                    onChange={(e) => setTargetZoneId(Number(e.target.value))}
                    required
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Area Name / Neighborhood / Pincode
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="e.g. Indiranagar, 560038"
                    required
                  />
                </label>
                <button type="submit" disabled={savingArea || !newAreaName.trim()} className="btn-primary">
                  <IconPlus size={15} />
                  <span>{savingArea ? 'Adding...' : 'Assign Area to Zone'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Zones and Area Directory */}
          <div className="panel">
            <div className="heading">
              <div>
                <p className="eyebrow">ZONE COVERAGE DIRECTORY</p>
                <h3>All Zones & Assigned Areas ({zones.length})</h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {zones.map((zone) => (
                <div key={zone.id} className="detail-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, color: 'var(--primary)' }}>{zone.name}</h4>
                    <span className="badge-meta">ID #{zone.id}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Covered Areas ({zone.areas?.length || 0}):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {zone.areas && zone.areas.length > 0 ? (
                      zone.areas.map((area) => (
                        <span key={area.id} className="badge-meta" style={{ background: '#ffffff' }}>
                          {area.areaName}
                        </span>
                      ))
                    ) : (
                      <small style={{ color: 'var(--text-faint)' }}>No specific areas assigned yet.</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
