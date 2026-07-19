import React from "react";

interface ProductPlaceholderImageProps {
  sku: string;
  name: string;
  category?: string;
  className?: string;
}

export const ProductPlaceholderImage: React.FC<ProductPlaceholderImageProps> = ({
  sku,
  name,
  category = "Electrical Instrument",
  className = "w-full h-full",
}) => {
  // Generate some deterministic design paths/values based on SKU
  const hash = sku.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Decide waveform style based on SKU
  const isSine = hash % 2 === 0;
  const isSquare = hash % 3 === 0;
  
  let wavePath = "";
  if (isSine) {
    // Sine wave path
    wavePath = "M 20 60 Q 45 10, 70 60 T 120 60 T 170 60 T 220 60 T 270 60 T 320 60 T 375 60";
  } else if (isSquare) {
    // Square/pulse wave path
    wavePath = "M 20 80 L 40 80 L 40 30 L 80 30 L 80 80 L 120 80 L 120 30 L 160 30 L 160 80 L 200 80 L 200 30 L 240 30 L 240 80 L 280 80 L 280 30 L 320 30 L 320 80 L 375 80";
  } else {
    // Triangular/sawtooth wave path
    wavePath = "M 20 80 L 60 30 L 100 80 L 140 30 L 180 80 L 220 30 L 260 80 L 300 30 L 340 80 L 375 30";
  }

  // Dial angles
  const dialAngle1 = 45 + (hash % 180);
  const dialAngle2 = 10 + ((hash * 3) % 180);

  return (
    <div className={`relative overflow-hidden bg-slate-900 flex items-center justify-center ${className}`}>
      {/* SVG Blueprint grid background */}
      <svg
        viewBox="0 0 400 225"
        className="w-full h-full text-slate-700/35 select-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
          <pattern id="subgrid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="currentColor" strokeWidth="0.2" />
          </pattern>
        </defs>

        {/* Grids */}
        <rect width="100%" height="100%" fill="none" />
        <rect width="100%" height="100%" fill="url(#subgrid)" opacity="0.4" />
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Technical Border Accent */}
        <rect x="5" y="5" width="390" height="215" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 5" opacity="0.6" />
        <path d="M 5 20 L 20 5 M 380 5 L 395 20 M 395 205 L 380 220 M 20 220 L 5 205" stroke="currentColor" strokeWidth="1" opacity="0.6" />

        {/* Schematic Circuit Line elements */}
        <g stroke="currentColor" strokeWidth="1" fill="none" opacity="0.5">
          <circle cx="50" cy="170" r="4" />
          <line x1="54" y1="170" x2="80" y2="170" />
          <rect x="80" y="162" width="24" height="16" strokeWidth="1.5" />
          <text x="86" y="174" fill="currentColor" fontSize="8" fontFamily="monospace" stroke="none">R1</text>
          <line x1="104" y1="170" x2="130" y2="170" />
          <line x1="130" y1="170" x2="140" y2="155" />
          <line x1="140" y1="155" x2="150" y2="185" />
          <line x1="150" y1="185" x2="160" y2="170" />
          <line x1="160" y1="170" x2="185" y2="170" />
          <circle cx="189" cy="170" r="4" fill="currentColor" />
        </g>

        {/* Instrument Dial 1 */}
        <g transform="translate(330, 160)" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7">
          <circle cx="0" cy="0" r="22" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="2" fill="currentColor" />
          {/* Dial tick marks */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i * 360) / 8;
            const rad = (angle * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={Math.cos(rad) * 16}
                y1={Math.sin(rad) * 16}
                x2={Math.cos(rad) * 20}
                y2={Math.sin(rad) * 20}
              />
            );
          })}
          {/* Indicator Hand */}
          <line
            x1="0"
            y1="0"
            x2={Math.cos((dialAngle1 * Math.PI) / 180) * 16}
            y2={Math.sin((dialAngle1 * Math.PI) / 180) * 16}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <text x="-12" y="32" fill="currentColor" fontSize="7" fontFamily="monospace" stroke="none" textAnchor="middle">COARSE</text>
        </g>

        {/* Instrument Dial 2 */}
        <g transform="translate(330, 75)" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.7">
          <circle cx="0" cy="0" r="15" strokeWidth="1.5" />
          <circle cx="0" cy="0" r="1.5" fill="currentColor" />
          {/* Indicator Hand */}
          <line
            x1="0"
            y1="0"
            x2={Math.cos((dialAngle2 * Math.PI) / 180) * 11}
            y2={Math.sin((dialAngle2 * Math.PI) / 180) * 11}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <text x="-12" y="24" fill="currentColor" fontSize="7" fontFamily="monospace" stroke="none" textAnchor="middle">FINE</text>
        </g>

        {/* Active Signal Waveform Display (Oscilloscope Viewport) */}
        <g transform="translate(10, 10)">
          {/* Display border */}
          <rect x="15" y="15" width="280" height="90" fill="#0f172a" fillOpacity="0.8" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Oscilloscope Grid Lines */}
          <line x1="15" y1="60" x2="295" y2="60" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          <line x1="155" y1="15" x2="155" y2="105" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
          
          {/* Waveform graph path */}
          <path
            d={wavePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-blue-500"
          />

          {/* Glowing dot representing current beam */}
          <circle cx="375" cy="60" r="3" fill="#3b82f6" opacity="0.8" className="animate-pulse" />

          {/* On-screen Telemetry Text */}
          <text x="22" y="32" fill="#3b82f6" fontSize="8" fontFamily="monospace" fontWeight="bold">CH1: 2.50V/DIV</text>
          <text x="22" y="44" fill="#3b82f6" fontSize="8" fontFamily="monospace" fontWeight="bold">T: 12.5ms/DIV</text>
          <text x="22" y="100" fill="#10b981" fontSize="8" fontFamily="monospace" fontWeight="bold">● LIVE SIGNAL</text>
          <text x="240" y="32" fill="#64748b" fontSize="8" fontFamily="monospace">AUTO</text>
        </g>

        {/* Technical Product Metadata Overlays */}
        <text x="20" y="200" fill="currentColor" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.9">
          DESMO TEST CORP.
        </text>
        <text x="20" y="212" fill="currentColor" fontSize="8" fontFamily="monospace" opacity="0.6">
          SYS REF: {category.toUpperCase()} // MODEL: {sku}
        </text>
      </svg>

      {/* Decorative corners */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-slate-500 opacity-60"></div>
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-slate-500 opacity-60"></div>
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-slate-500 opacity-60"></div>
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-slate-500 opacity-60"></div>
    </div>
  );
};
