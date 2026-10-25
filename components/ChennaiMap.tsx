import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Linking, Platform, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { CHENNAI_PHARMACIES, CHENNAI_CENTER } from '../constants/pharmacies';
import { Colors } from '../constants/theme';
import { quotaGuard, QuotaStatus } from '../services/quotaGuardService';
import { ShieldCheck } from 'lucide-react-native';

interface ChennaiMapProps {
  selectedPharmacy?: string;
}

const ChennaiMap: React.FC<ChennaiMapProps> = ({ selectedPharmacy }) => {
  const mapRef = useRef<MapView>(null);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    (async () => {
      // Check quota status & record session request if allowed
      const status = await quotaGuard.getQuotaStatus();
      setQuota(status);

      if (!status.isSafeguardActive) {
        // Record lightweight usage unit (0.2 credit per interactive session)
        const updated = await quotaGuard.recordUsage(0.2);
        setQuota(updated);
      }
    })();
  }, []);

  useEffect(() => {
    if (selectedPharmacy && mapRef.current) {
      const pharm = CHENNAI_PHARMACIES.find((p) => p.id === selectedPharmacy);
      if (pharm) {
        mapRef.current.animateToRegion(
          {
            latitude: pharm.coordinates.latitude,
            longitude: pharm.coordinates.longitude,
            latitudeDelta: 0.03,
            longitudeDelta: 0.02,
          },
          500
        );
      }
    }
  }, [selectedPharmacy]);

  const openMapsWithDirections = (latitude: number, longitude: number) => {
    let url = '';

    if (Platform.OS === 'ios') {
      url = `maps:?ll=${latitude},${longitude}`;
    } else {
      url = `google.navigation:q=${latitude},${longitude}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        return Linking.openURL(webUrl);
      })
      .catch((error) => console.error('Error opening maps:', error));
  };

  // If safeguard is active (>= 80% of credits used), do not use PROVIDER_GOOGLE to prevent charges
  const useGoogleProvider = Platform.OS === 'android' && !quota?.isSafeguardActive;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={useGoogleProvider ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: CHENNAI_CENTER.latitude,
          longitude: CHENNAI_CENTER.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {CHENNAI_PHARMACIES.map((pharmacy) => {
          const isSelected = selectedPharmacy === pharmacy.id;
          return (
            <Marker
              key={pharmacy.id}
              coordinate={pharmacy.coordinates}
              title={pharmacy.name}
              description={pharmacy.address}
              pinColor={isSelected ? Colors.danger : Colors.primary}
              onPress={() =>
                openMapsWithDirections(
                  pharmacy.coordinates.latitude,
                  pharmacy.coordinates.longitude
                )
              }
            />
          );
        })}
      </MapView>

      {/* Credit Safeguard Pill (Visible when 80% threshold reached) */}
      {quota?.isSafeguardActive && (
        <View style={styles.safeguardBanner}>
          <ShieldCheck size={14} color="#059669" />
          <Text style={styles.safeguardText}>
            80% Credit Safeguard Active ({quota.usedCredits}/{quota.totalBudget} credits) • Zero-Billing Mode
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  safeguardBanner: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 99,
  },
  safeguardText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
});

export default ChennaiMap;
