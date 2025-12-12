import React, { useEffect, useRef } from 'react';
import { AssetDeclaration, Language } from '../types';
import { TEXTS } from '../constants';

// We declare L (Leaflet) as any because it is loaded via CDN
declare const L: any;

interface Props {
  assets: AssetDeclaration[];
  lang: Language;
}

const AssetMap: React.FC<Props> = ({ assets, lang }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (typeof L === 'undefined' || !mapRef.current) return;

    if (!mapInstance.current) {
      // Initialize map centered on Mauritania
      mapInstance.current = L.map(mapRef.current).setView([20.2540, -13.2554], 6);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
            mapInstance.current.removeLayer(layer);
        }
    });

    // Add Markers
    assets.forEach(asset => {
      if (asset.coordinates?.lat && asset.coordinates?.lng) {
        const marker = L.marker([asset.coordinates.lat, asset.coordinates.lng]).addTo(mapInstance.current);
        
        const popupContent = `
          <div style="font-family: sans-serif; text-align: ${lang === 'ar' ? 'right' : 'left'}">
            <h3 style="font-weight: bold; margin-bottom: 5px;">${asset.reference}</h3>
            <p><b>${lang === 'fr' ? 'Type' : 'النوع'}:</b> ${asset.type}</p>
            <p><b>${lang === 'fr' ? 'Lieu' : 'الموقع'}:</b> ${asset.locationDetails}</p>
            <p><b>${lang === 'fr' ? 'Wilaya' : 'الولاية'}:</b> ${asset.wilaya}</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });

    // Clean up on unmount is tricky with Leaflet in React without cleanup, 
    // but we reuse the instance so it's fine.

  }, [assets, lang]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
       <div className="mb-4">
           <h2 className="text-xl font-bold text-gray-900">{TEXTS.map[lang]}</h2>
           <p className="text-sm text-gray-500">
             {lang === 'fr' 
               ? "Visualisation géographique du patrimoine de l'État." 
               : "التصور الجغرافي لممتلكات الدولة."}
           </p>
       </div>
       <div 
         ref={mapRef} 
         className="flex-1 w-full min-h-[500px] rounded-lg z-0 border border-gray-200"
       />
    </div>
  );
};

export default AssetMap;