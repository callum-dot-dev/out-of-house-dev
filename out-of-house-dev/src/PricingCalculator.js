import React, { useMemo, useState } from 'react';

const BUILD_TYPES = [
  { id: 'website',   label: 'Website',         base: 500,  unit: 'page',    perUnit: 150, sub: 'from £500' },
  { id: 'automation', label: 'AI Automation',  base: 750,  unit: 'workflow', perUnit: 400, sub: 'from £750' },
  { id: 'webapp',    label: 'Web App / MVP',   base: 2500, unit: 'feature', perUnit: 600, sub: 'from £2,500' },
  { id: 'custom',    label: 'Custom Software', base: 3500, unit: 'module',  perUnit: 800, sub: 'from £3,500' },
];

const ADDONS = [
  { id: 'hosting',  label: 'Hosting & maintenance',  detail: 'We host on IONOS + keep it patched, fast, and live', oneOff: 0,    monthly: 100 },
  { id: 'ai',       label: 'Built-in AI features',    detail: 'AI-powered features built into the product',     oneOff: 600,  monthly: 0 },
  { id: 'auth',     label: 'Auth & payments',          detail: 'User accounts, Stripe checkout, subscriptions',       oneOff: 900,  monthly: 0 },
  { id: 'cms',      label: 'CMS / content editing',    detail: 'You update copy and images without us',               oneOff: 400,  monthly: 0 },
];

const SCOPE_LABELS = {
  website:    n => `${n} page${n === 1 ? '' : 's'}`,
  automation: n => `${n} workflow${n === 1 ? '' : 's'}`,
  webapp:     n => `${n} core feature${n === 1 ? '' : 's'}`,
  custom:     n => `${n} module${n === 1 ? '' : 's'}`,
};

const fmt = n => '£' + n.toLocaleString('en-GB');

const PricingCalculator = () => {
  const [type, setType] = useState('website');
  const [units, setUnits] = useState(1);
  const [addons, setAddons] = useState({ hosting: true });

  const buildType = BUILD_TYPES.find(b => b.id === type);

  const { oneOff, monthly } = useMemo(() => {
    const base = buildType.base + Math.max(0, units - 1) * buildType.perUnit;
    let oneOffSum = base;
    let monthlySum = 0;
    ADDONS.forEach(a => {
      if (addons[a.id]) {
        oneOffSum += a.oneOff;
        monthlySum += a.monthly;
      }
    });
    return { oneOff: oneOffSum, monthly: monthlySum };
  }, [buildType, units, addons]);

  const toggleAddon = id => setAddons(prev => ({ ...prev, [id]: !prev[id] }));

  const handleTypeChange = id => {
    setType(id);
    setUnits(1);
  };

  return (
    <div className="calculator">
      <div className="calc-controls">
        <div className="calc-group">
          <div className="calc-label">What are we building?</div>
          <div className="calc-options">
            {BUILD_TYPES.map(b => (
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
          <div className="calc-label">Scope &mdash; {SCOPE_LABELS[type](units)}</div>
          <div className="calc-slider-row">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={units}
              onChange={e => setUnits(Number(e.target.value))}
              className="calc-slider"
              aria-label="Scope size"
            />
            <span className="calc-slider-value">{units}</span>
          </div>
        </div>

        <div className="calc-group">
          <div className="calc-label">Add-ons</div>
          <div className="calc-checks">
            {ADDONS.map(a => (
              <label
                key={a.id}
                className={`calc-check ${addons[a.id] ? 'active' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={!!addons[a.id]}
                  onChange={() => toggleAddon(a.id)}
                />
                <div className="calc-check-text">
                  <strong>{a.label}</strong>
                  <span>
                    {a.detail}
                    {' · '}
                    {a.oneOff > 0 && <>+{fmt(a.oneOff)}</>}
                    {a.oneOff > 0 && a.monthly > 0 && ' & '}
                    {a.monthly > 0 && <>+{fmt(a.monthly)}/m</>}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="calc-result">
        <div className="calc-result-label">Estimate</div>
        <div className="calc-result-price">{fmt(oneOff)}</div>
        {monthly > 0 && (
          <div className="calc-result-monthly">
            + <strong>{fmt(monthly)}/m</strong> ongoing
          </div>
        )}
        <div className="calc-result-summary">
          {buildType.label.toLowerCase()} build, {SCOPE_LABELS[type](units)}
          {Object.values(addons).some(Boolean) && (
            <>, with {ADDONS.filter(a => addons[a.id]).map(a => a.label.toLowerCase()).join(', ')}</>
          )}.
          {' '}Final quote confirmed within 24 hours of a call.
        </div>
        <a href="https://cal.com/out-of-house.dev" target="_blank" rel="noopener noreferrer">
          <button type="button">Lock in this quote →</button>
        </a>
      </div>
    </div>
  );
};

export default PricingCalculator;
