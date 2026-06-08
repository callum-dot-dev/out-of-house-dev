import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const CertificateVerify = () => {
  const { code } = useParams();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('certificate_verifications')
          .select('*')
          .eq('certificate_code', code)
          .maybeSingle();
        if (cancelled) return;
        if (error) throw error;
        if (!data) {
          setState({ status: 'unknown' });
          return;
        }
        if (data.revoked_at) {
          setState({ status: 'revoked', cert: data });
          return;
        }
        setState({ status: 'valid', cert: data });
      } catch (e) {
        if (!cancelled) setState({ status: 'error', message: e.message });
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="cert-verify">
      <div className="cert-verify-card">
        <Link to="/" className="service-back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          out-of-house.dev
        </Link>
        <div className="cert-verify-eyebrow">Certificate verification</div>
        <div className="cert-verify-code">{code}</div>

        {state.status === 'loading' && <p className="cert-verify-state">Checking…</p>}
        {state.status === 'unknown' && <p className="cert-verify-state cert-verify-state-bad">No certificate found with this code.</p>}
        {state.status === 'revoked' && (
          <p className="cert-verify-state cert-verify-state-bad">
            This certificate was revoked on {formatDate(state.cert.revoked_at)}.
          </p>
        )}
        {state.status === 'error' && <p className="cert-verify-state cert-verify-state-bad">{state.message}</p>}
        {state.status === 'valid' && (
          <div className="cert-verify-valid">
            <div className="cert-verify-badge">Valid</div>
            <h1>{state.cert.recipient_name || 'Anonymous'}</h1>
            <p className="cert-verify-prog">{state.cert.programme_name}</p>
            <p className="cert-verify-meta">
              {state.cert.duration_weeks}-week programme · {state.cert.programme_audience} · Grade {state.cert.grade || 'Pass'} ·
              Issued {formatDate(state.cert.issued_at)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (iso) => {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};

export default CertificateVerify;
