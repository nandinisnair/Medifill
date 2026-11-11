import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MapPin,
  Search,
  ExternalLink,
  Phone,
  Clock,
  Star,
  Navigation,
  Compass,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Location from 'expo-location';
import ChennaiMap from '../../components/ChennaiMap';
import {
  searchPharmacies,
  sortByDistance,
  sortByRating,
  Pharmacy,
} from '../../constants/pharmacies';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';

type FilterType = 'all' | '24_hours' | 'top_rated';

export default function PharmacyScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPharmacy, setSelectedPharmacy] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.log('Location error:', error);
    } finally {
      setLocationLoading(false);
    }
  };

  // Filter and sort pharmacies
  const getProcessedPharmacies = () => {
    let list = searchPharmacies(searchQuery);

    if (activeFilter === '24_hours') {
      list = list.filter((p) => p.is24Hours);
    } else if (activeFilter === 'top_rated') {
      list = sortByRating(list);
    } else {
      list = sortByDistance(list);
    }

    return list;
  };

  const pharmacies = getProcessedPharmacies();

  const handlePharmacySelect = (id: string) => {
    setSelectedPharmacy(selectedPharmacy === id ? null : id);
  };

  const openMapsWithDirections = (pharmacy: Pharmacy) => {
    const { coordinates, name, address } = pharmacy;
    const { latitude, longitude } = coordinates;

    if (Platform.OS === 'web') {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`;
      window.open(webUrl, '_blank');
      return;
    }

    let url = '';
    if (Platform.OS === 'ios') {
      url = `maps:?q=${encodeURIComponent(name)}&ll=${latitude},${longitude}`;
    } else {
      url = `geo:${latitude},${longitude}?q=${encodeURIComponent(`${name}, ${address}`)}`;
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) return Linking.openURL(url);
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        return Linking.openURL(webUrl);
      })
      .catch((error) => console.error('Error opening maps:', error));
  };

  const callPharmacy = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenSubtitle}>Nearby Care</Text>
          <Text style={styles.screenTitle}>Pharmacy Finder</Text>
        </View>

        {userLocation ? (
          <View style={styles.locationActiveBadge}>
            <Navigation size={11} color={Colors.success} />
            <Text style={styles.locationActiveText}>GPS Active</Text>
          </View>
        ) : locationLoading ? (
          <View style={styles.locationActiveBadge}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.locationActiveText}>Locating…</Text>
          </View>
        ) : null}
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <ChennaiMap selectedPharmacy={selectedPharmacy || undefined} />
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrapper}>
          <Search size={18} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by pharmacy name or area…"
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filtersRow}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Compass size={13} color={activeFilter === 'all' ? Colors.primaryDark : Colors.textTertiary} />
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            Nearest First
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === '24_hours' && styles.filterTabActive]}
          onPress={() => setActiveFilter('24_hours')}
        >
          <Clock size={13} color={activeFilter === '24_hours' ? Colors.primaryDark : Colors.textTertiary} />
          <Text style={[styles.filterTabText, activeFilter === '24_hours' && styles.filterTabTextActive]}>
            Open 24/7
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'top_rated' && styles.filterTabActive]}
          onPress={() => setActiveFilter('top_rated')}
        >
          <Star size={13} color={activeFilter === 'top_rated' ? Colors.primaryDark : Colors.textTertiary} />
          <Text style={[styles.filterTabText, activeFilter === 'top_rated' && styles.filterTabTextActive]}>
            Top Rated
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pharmacies List */}
      <ScrollView style={styles.pharmacyList} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <Text style={styles.listCounterText}>
          {pharmacies.length} verified pharmacies near you
        </Text>

        {pharmacies.length === 0 ? (
          <View style={styles.emptyCard}>
            <MapPin size={36} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No pharmacies found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search terms</Text>
          </View>
        ) : (
          pharmacies.map((pharmacy, idx) => {
            const isSelected = selectedPharmacy === pharmacy.id;
            return (
              <Animated.View
                key={pharmacy.id}
                entering={FadeInRight.delay(idx * 50).duration(300)}
              >
                <TouchableOpacity
                  style={[
                    styles.pharmacyCard,
                    isSelected && styles.pharmacyCardSelected,
                  ]}
                  onPress={() => handlePharmacySelect(pharmacy.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.pharmacyTopRow}>
                    <View style={styles.pharmacyIconWrap}>
                      <MapPin size={20} color={Colors.primary} strokeWidth={2.2} />
                    </View>

                    <View style={styles.pharmacyMainInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.pharmacyTitle} numberOfLines={1}>
                          {pharmacy.name}
                        </Text>
                        <View style={styles.ratingChip}>
                          <Star size={11} color="#F59E0B" fill="#F59E0B" />
                          <Text style={styles.ratingNumber}>{pharmacy.rating.toFixed(1)}</Text>
                        </View>
                      </View>

                      <Text style={styles.pharmacyAddress} numberOfLines={1}>
                        {pharmacy.address}
                      </Text>

                      <View style={styles.metaRow}>
                        <View style={styles.distanceBadge}>
                          <Text style={styles.distanceBadgeText}>{pharmacy.distance}</Text>
                        </View>

                        <View
                          style={[
                            styles.hoursBadge,
                            pharmacy.is24Hours && styles.hoursBadge24,
                          ]}
                        >
                          <Clock size={11} color={pharmacy.is24Hours ? Colors.success : Colors.textTertiary} />
                          <Text
                            style={[
                              styles.hoursBadgeText,
                              pharmacy.is24Hours && styles.hoursBadgeText24,
                            ]}
                          >
                            {pharmacy.hours}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Actions when selected */}
                  {isSelected && (
                    <Animated.View entering={FadeInDown.duration(200)} style={styles.actionsBar}>
                      <TouchableOpacity
                        style={styles.directionsBtn}
                        onPress={() => openMapsWithDirections(pharmacy)}
                      >
                        <ExternalLink size={15} color="#FFFFFF" />
                        <Text style={styles.directionsBtnText}>Directions</Text>
                      </TouchableOpacity>

                      {pharmacy.phone && (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => callPharmacy(pharmacy.phone)}
                        >
                          <Phone size={15} color={Colors.primary} />
                          <Text style={styles.callBtnText}>Call Pharmacy</Text>
                        </TouchableOpacity>
                      )}
                    </Animated.View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  screenSubtitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  locationActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  locationActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  mapContainer: {
    height: 180,
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterTabActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  filterTabTextActive: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  pharmacyList: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  listCounterText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pharmacyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  pharmacyCardSelected: {
    borderColor: Colors.primary,
    ...Shadow.sm,
  },
  pharmacyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pharmacyIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  pharmacyMainInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    marginRight: 6,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingNumber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  pharmacyAddress: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 8,
  },
  distanceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  distanceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  hoursBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  hoursBadge24: {
    backgroundColor: Colors.successLight,
  },
  hoursBadgeText: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  hoursBadgeText24: {
    color: Colors.successDark,
    fontWeight: '700',
  },
  actionsBar: {
    flexDirection: 'row',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: Spacing.sm,
  },
  directionsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  directionsBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  callBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
});
