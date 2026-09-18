import React from 'react';
// @ts-ignore
import fieldImage from '../assets/images/field_large.jpg';

const InteractiveField: React.FC = () => {
  return (
    <div
      className="card-apple"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: 0,
        minHeight: 'clamp(300px, 42vw, 480px)',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>

      {/* Background Image */}
      <img
        src={fieldImage}
        alt="Field Analysis"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          position: 'absolute',
          top: 0,
          left: 0,
          filter: 'brightness(0.85) contrast(1.15)',
        }}
      />

      {/* Grid Overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(16,185,129,0.06) 1px, transparent 1px), linear-gradient(0deg, rgba(16,185,129,0.06) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }}
      />

      {/* Scanning Laser Line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '2px',
          background: '#10b981',
          boxShadow: '0 0 15px #10b981, 0 0 30px #10b981',
          animation: 'scan 4s ease-in-out infinite',
          zIndex: 10,
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '12px',
            top: '-26px',
            background: 'rgba(0,0,0,0.85)',
            color: '#10b981',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            border: '1px solid #10b981',
            whiteSpace: 'nowrap',
          }}
        >
          Analyzing Soil Health…
        </div>
      </div>

      {/* Interactive Point 1: Moisture */}
      <div style={{ position: 'absolute', top: '28%', left: '30%', zIndex: 5 }}>
        <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px #10b981' }} />
        <div style={{ position: 'absolute', inset: -6, border: '1px solid #10b981', borderRadius: '50%', animation: 'pulse-ring 2s infinite' }} />
        <div
          style={{
            position: 'absolute',
            left: '16px',
            top: '-12px',
            background: 'rgba(10,10,12,0.9)',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(16,185,129,0.4)',
            minWidth: '110px',
            maxWidth: '140px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontSize: '9px', color: '#a1a1a6', fontWeight: 600, letterSpacing: '0.05em' }}>MOISTURE</div>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '12px' }}>Optimal (62%)</div>
        </div>
      </div>

      {/* Interactive Point 2: NPK */}
      <div style={{ position: 'absolute', top: '65%', right: '28%', zIndex: 5 }}>
        <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%', boxShadow: '0 0 10px #f59e0b' }} />
        <div style={{ position: 'absolute', inset: -6, border: '1px solid #f59e0b', borderRadius: '50%', animation: 'pulse-ring 2s infinite 1s' }} />
        <div
          style={{
            position: 'absolute',
            right: '16px',
            top: '-12px',
            background: 'rgba(10,10,12,0.9)',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            minWidth: '110px',
            maxWidth: '140px',
            backdropFilter: 'blur(6px)',
          }}
        >
          <div style={{ fontSize: '9px', color: '#a1a1a6', fontWeight: 600, letterSpacing: '0.05em' }}>N-P-K DIAGNOSTIC</div>
          <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '12px' }}>Optimal Balance</div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveField;
