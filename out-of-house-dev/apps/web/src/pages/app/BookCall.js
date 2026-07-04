import React from 'react';
import { InlineWidget } from 'react-calendly';
import { useAuth } from '../../lib/AuthProvider';

const BookCall = () => {
  const { profile } = useAuth();

  return (
    <div className="app-page">
      <div className="app-page-head">
        <div>
          <div className="eyebrow">Book a call</div>
          <h1 className="app-h1">Pick a time that suits you.</h1>
          <p className="app-lead">Slots open this week and next. Sub-30 minute calls, no questionnaires.</p>
        </div>
      </div>

      <div className="app-card cal-card">
        <InlineWidget
          url="https://cal.eu/out-of-house.dev"
          prefill={{
            name: profile?.full_name || '',
            email: profile?.email || '',
          }}
          styles={{ height: '780px', width: '100%' }}
        />
      </div>
    </div>
  );
};

export default BookCall;
