import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { LatLng, Icon, Map as LeafletMap, LatLngBounds } from 'leaflet';
import { Plus, Minus, Layers, X } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Pin } from '../../lib/supabase';
import PinPopup from './PinPopup';

// Custom pin icon
const createPinIcon = (color: string = '#FFFC00') => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 42 16 42S32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
    </svg>
  `)}`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

// Temporary pin icon for first click
const createTemporaryPinIcon = () => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 42 16 42S32 28 32 16C32 7.163 24.837 0 16 0Z" fill="#60A5FA" stroke="#3B82F6" stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
      <circle cx="16" cy="16" r="3" fill="#3B82F6"/>
    </svg>
  `)}`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

// Custom cluster icon function
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let size = 'small';
  let color = '#FFFC00';
  
  if (count < 10) {
    size = 'small';
    color = '#FFFC00';
  } else if (count < 100) {
    size = 'medium';
    color = '#FFA500';
  } else {
    size = 'large';
    color = '#FF6B6B';
  }

  const iconSize = size === 'small' ? 40 : size === 'medium' ? 50 : 60;
  const fontSize = size === 'small' ? '14px' : size === 'medium' ? '16px' : '18px';

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${iconSize/2}" cy="${iconSize/2}" r="${iconSize/2 - 2}" fill="${color}" stroke="white" stroke-width="3"/>
        <text x="${iconSize/2}" y="${iconSize/2}" text-anchor="middle" dominant-baseline="central" 
              fill="black" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold"
              stroke="white" stroke-width="3" paint-order="stroke fill">
          ${count}
        </text>
      </svg>
    `)}`,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize/2, iconSize/2],
  });
};

interface MapEventsProps {
  onMapClick: (latlng: LatLng) => void;
  isPinPopupOpen: boolean;
}

const MapEvents: React.FC<MapEventsProps> = ({ onMapClick, isPinPopupOpen }) => {
  useMapEvents({
    click: (e) => {
      // Only create a pin if no popup is currently open
      if (!isPinPopupOpen) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

interface MapComponentProps {
  pins: Pin[];
  onAddPin: (lat: number, lng: number) => void;
  onDeletePin: (pinId: string) => void;
  onLikePin: (pinId: string, imageIndex: number) => void;
  onCommentPin: (pinId: string, comment: string) => void;
  onOpenUserProfile: (username: string) => void;
  onEditPin: (pin: Pin) => void;
  currentUser: string;
  isAdmin?: boolean;
  pinToOpenOnMap?: string | null;
  onPinOpened?: () => void;
  firstClickLocation?: { lat: number; lng: number } | null;
  onCancelFirstClick?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  pins,
  onAddPin,
  onDeletePin,
  onLikePin,
  onCommentPin,
  onOpenUserProfile,
  onEditPin,
  currentUser,
  isAdmin = false,
  pinToOpenOnMap,
  onPinOpened,
  firstClickLocation,
  onCancelFirstClick,
}) => {
  const mapRef = useRef<LeafletMap>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  const [isPinPopupOpen, setIsPinPopupOpen] = useState(false);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Define world bounds to prevent infinite scrolling
  const worldBounds = new LatLngBounds([-90, -180], [90, 180]);

  // Map tile layer configurations
  const tileLayerConfig = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  const handleMapClick = (latlng: LatLng) => {
    onAddPin(latlng.lat, latlng.lng);
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleToggleMapType = () => {
    setMapType(prev => prev === 'osm' ? 'satellite' : 'osm');
  };

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
    setIsPinPopupOpen(true);
  };

  const handlePopupClose = () => {
    setSelectedPin(null);
    setIsPinPopupOpen(false);
  };

  // Force close popup when clicking the close button
  const handleForceClosePopup = () => {
    setSelectedPin(null);
    setIsPinPopupOpen(false);
    // Force close the Leaflet popup
    if (mapRef.current) {
      mapRef.current.closePopup();
    }
  };

  const handleEditPin = (pin: Pin) => {
    onEditPin(pin);
    handleForceClosePopup(); // Close the pin popup when opening edit modal
  };

  // Handle opening specific pin from profile
  useEffect(() => {
    if (pinToOpenOnMap && mapRef.current) {
      const pinToOpen = pins.find(pin => pin.id === pinToOpenOnMap);
      if (pinToOpen) {
        // Center map on the pin
        mapRef.current.setView([pinToOpen.lat, pinToOpen.lng], 15);
        
        // Set the selected pin to open its popup
        setSelectedPin(pinToOpen);
        setIsPinPopupOpen(true);
        
        // Find and open the marker's popup
        const marker = markersRef.current[pinToOpen.id];
        if (marker) {
          setTimeout(() => {
            marker.openPopup();
          }, 500); // Small delay to ensure map has centered
        }
        
        // Clear the pin to open
        if (onPinOpened) {
          onPinOpened();
        }
      }
    }
  }, [pinToOpenOnMap, pins, onPinOpened]);

  return (
    <div className="h-screen w-full relative">
      <MapContainer
        center={[40.7128, -74.0060]} // NYC coordinates
        zoom={13}
        minZoom={1} // Prevent zooming out beyond world view
        maxBounds={worldBounds} // Restrict panning to world bounds
        maxBoundsViscosity={1.0} // Make bounds enforcement strict
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution={tileLayerConfig[mapType].attribution}
          url={tileLayerConfig[mapType].url}
          noWrap={true} // Prevent tile wrapping
        />
        <MapEvents onMapClick={handleMapClick} isPinPopupOpen={isPinPopupOpen} />
        
        {/* Clustered pins */}
        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterCustomIcon}
          maxClusterRadius={50}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
          zoomToBoundsOnClick={true}
          spiderfyDistanceMultiplier={1.5}
          removeOutsideVisibleBounds={true}
          animate={true}
          animateAddingMarkers={true}
          disableClusteringAtZoom={18}
        >
          {pins.map((pin) => (
            <Marker
              key={pin.id}
              position={[pin.lat, pin.lng]}
              icon={createPinIcon(pin.pin_color || '#FFFC00')}
              ref={(ref) => {
                if (ref) {
                  markersRef.current[pin.id] = ref;
                }
              }}
              eventHandlers={{
                click: () => handlePinClick(pin),
              }}
            >
              <Popup
                closeButton={false}
                className="custom-popup"
                minWidth={320}
                maxWidth={400}
                eventHandlers={{
                  remove: () => handlePopupClose(),
                }}
              >
                <PinPopup
                  pin={pin}
                  currentUser={currentUser}
                  isAdmin={isAdmin}
                  onDelete={() => {
                    onDeletePin(pin.id);
                    handlePopupClose();
                  }}
                  onLike={onLikePin}
                  onComment={onCommentPin}
                  onOpenUserProfile={onOpenUserProfile}
                  onClose={handleForceClosePopup}
                  onEdit={handleEditPin}
                />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>

        {/* Temporary pin for first click */}
        {firstClickLocation && (
          <Marker
            position={[firstClickLocation.lat, firstClickLocation.lng]}
            icon={createTemporaryPinIcon()}
          >
            <Popup
              closeButton={false}
              className="custom-popup"
              minWidth={250}
              maxWidth={300}
            >
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-blue-800">Confirm Location</h3>
                  <button
                    onClick={onCancelFirstClick}
                    className="p-1 hover:bg-blue-200 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-blue-600" />
                  </button>
                </div>
                <p className="text-blue-700 text-sm mb-4">
                  Click anywhere on the map again to confirm this pin location, or click cancel to start over.
                </p>
                <div className="text-xs text-blue-600 font-mono">
                  {firstClickLocation.lat.toFixed(4)}, {firstClickLocation.lng.toFixed(4)}
                </div>
                <button
                  onClick={onCancelFirstClick}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-3">
        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title="Zoom In"
        >
          <Plus className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title="Zoom Out"
        >
          <Minus className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>

        {/* Map Type Toggle Button */}
        <button
          onClick={handleToggleMapType}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title={mapType === 'osm' ? 'Switch to Satellite' : 'Switch to Map'}
        >
          <Layers className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>
      </div>
    </div>
  );
};

export default MapComponent;