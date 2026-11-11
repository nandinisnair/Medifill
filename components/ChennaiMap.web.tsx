import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { CHENNAI_PHARMACIES, CHENNAI_CENTER } from '../constants/pharmacies';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { MapPin, Navigation } from 'lucide-react-native';

interface ChennaiMapProps {
  selectedPharmacy?: string;
}

const ChennaiMap: React.FC<ChennaiMapProps> = ({ selectedPharmacy }) => {
  const selectedObj = CHENNAI_PHARMACIES.find((p) => p.id === selectedPharmacy) || CHENNAI_PHARMACIES[0];
  const lat = selectedObj ? selectedObj.coordinates.latitude : CHENNAI_CENTER.latitude;
  const lng = selectedObj ? selectedObj.coordinates.longitude : CHENNAI_CENTER.longitude;

  const bbox = `${lng - 0.025}%2C${lat - 0.018}%2C${lng + 0.025}%2C${lat + 0.018}`;
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedObj.name}, ${selectedObj.address}`)}`;
    window.open(url, '_blank');
  };

  return (
    <View style={styles.container}>
      <iframe
        title="Chennai Pharmacy Map"
        src={embedUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 14,
        }}
        loading="lazy"
      />

      {/* Floating clinical card */}
      <View style={styles.floatingCard}>
        <View style={styles.floatingLeft}>
          <View style={styles.iconCircle}>
            <MapPin size={16} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.floatingTitle} numberOfLines={1}>
              {selectedObj.name}
            </Text>
            <Text style={styles.floatingSub} numberOfLines={1}>
              {selectedObj.address} • {selectedObj.distance}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.directionBtn} onPress={openGoogleMaps} activeOpacity={0.85}>
          <Navigation size={13} color="#FFFFFF" />
          <Text style={styles.directionBtnText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floatingCard: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  floatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
    gap: Spacing.sm,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  floatingSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  directionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    gap: 5,
  },
  directionBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
});

export default ChennaiMap;
