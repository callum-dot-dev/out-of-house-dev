import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BUILD_TYPES, CARE_MONTHLY, SCOPE_LABELS, computeQuote, addonsFor,
  getBuildType, formatGBP, CALCULATOR_GUARD,
} from './data/pricing';

const STORAGE_KEY = 'ooh.calculator.v2';

const loadInitial = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch { return null; }
};

const readBuildParam = () => {
  try { return new URLSearchParams(window.location.search).get('build'); } catch { return null; }
};

const PricingCalculator = () => {
  const persisted = loadInitial();
  // A ?build=<type> param (from a service page price-anchor) presets the type.
  const preset = getBuildType(readBuildParam())?.id;
  const [type, setType] = useState(preset || persisted?.type || 'website');
  const [units, setUnits] = useState(
    preset ? (getBuildType(preset)?.min || 1) : (persisted?.units || 1),
  );
  const [addons, setAddons] = useState(persisted?.addons || { care: true });

  const buildType = getBuildType(type) || BUILD_TYPES[0];
  const visibleAddons = addonsFor(type);

  const { oneOff, monthly } = useMemo(
    () => computeQuote({ type, units, addons }),
    [type, units, addons],
  );

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ type, units, addons }));
    } catch { /* ignore */ }
  }, [type, units, addons]);

  const toggleAddon = (id) => setAddons((prev) => ({ ...prev, [id]: !prev[id] }));

  const handleTypeChange = (id) => {
    setType(id);
    setUnits(getBuildType(id)?.min || 1);
  };

  const selectedAddons = visibleAddons.filter((a) => addons[a.id]);

  const applyQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set('utm_source', 'calculator');
    params.set('quote_type', type);
    params.set('quote_units', String(units));
    params.set('quote_oneoff', String(oneOff));
    if (monthly > 0) params.set('quote_monthly', String(monthly));
    return params.toString();
  }, [type, units, oneOff, monthly]);

  return (
    <div className="calculator">
      <p className="guard-note calc-guard">{CALCULATOR_GUARD}</p>

      <div className="calc-controls">
        <div className="calc-group">
          <div className="calc-label">What are we building?</div>
          <div className="calc-options">
            {BUILD_TYPES.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`calc-option ${type === b.id ? 'active' : ''}`}
                onClick={() => handleTypeChange(b.id)}
              >
                {b.label}
                <span className="calc-option-sub">{b.sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="calc-group">
          <div className="calc-label">Scope: {SCOPE_LABELS[type](units)}</div>
          <div className="calc-slider-row">
            <input
              type="range"
              min={buildType.min}
              max={buildType.max}
              step="1"
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="calc-slider"
              aria-label="Scope size"
            />
            <span className="calc-slider-value">{units}</span>
          </div>
        </div>

        <div className="calc-group">
          <div className="calc-label">Add-ons</div>
          <div className="calc-checks">
            {visibleAddons.map((a) => {
              const monthlyPrice = a.care ? CARE_MONTHLY[type] : (a.monthly || 0);
              return (
                <label key={a.id} className={`calc-check ${addons[a.id] ? 'active' : ''}`}>
                  <input type="checkbox" checked={!!addons[a.id]} onChange={() => toggleAddon(a.id)} />
                  <div className="calc-check-text">
                    <strong>{a.label}</strong>
                    <span>
                      {a.detail}
                      {' · '}
                      {a.oneOff > 0 && <>+{formatGBP(a.oneOff)}</>}
                      {a.oneOff > 0 && monthlyPrice > 0 && ' and '}
                      {monthlyPrice > 0 && <>+{formatGBP(monthlyPrice)}/m</>}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="calc-result">
        <div className="calc-result-label">Estimate</div>
        <div className="calc-result-price">{formatGBP(oneOff)}</div>
        {monthly > 0 && (
          <div className="calc-result-monthly">
            + <strong>{formatGBP(monthly)}/m</strong> ongoing
          </div>
        )}
        <div className="calc-result-summary">
          {buildType.label.toLowerCase()} build, {SCOPE_LABELS[type](units)}
          {selectedAddons.length > 0 && (
            <>, with {selectedAddons.map((a) => a.label.toLowerCase()).join(', ')}</>
          )}.
          {' '}Final quote confirmed within 24 hours of a call.
        </div>
        <div className="calc-result-actions">
          <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
            <button type="button" className="primary-btn"><span>Lock in this quote</span></button>
          </a>
          <Link to={`/apply?${applyQuery}`}>
            <button type="button" className="secondary-btn"><span>Apply with this scope</span></button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PricingCalculator;
