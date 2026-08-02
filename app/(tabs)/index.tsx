import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert as RNAlert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn, Layout } from 'react-native-reanimated';
import {
  Search,
  Bell,
  CircleAlert as AlertCircle,
  Pill,
  Calendar,
  Package,
  Clock,
  X,
  Plus,
  ChevronRight,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import { useMedicineContext } from '../../context/MedicineContext';
import MedicineCard from '../../components/MedicineCard';
import { router } from 'expo-router';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadow,
} from '../../constants/theme';

type FilterTab = 'all' | 'low_stock' | 'expiring' | 'interactions';

export default function HomeScreen() {
  const {
    medicines,
    filteredMedicines: contextFilteredMeds,
    alerts,
    loadMedicines,
    markAlertAsRead,
    familyMembers,
    selectedMemberId,
    setSelectedMemberId,
    addFamilyMember,
    activeUser,
    isSyncing,
  } = useMedicineContext();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [showAlerts, setShowAlerts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState<
    'Spouse' | 'Child' | 'Parent' | 'Grandparent' | 'Other'
  >('Parent');

  useEffect(() => {
    (async () => {
      await loadMedicines();
      setIsLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMedicines();
    setRefreshing(false);
  };

  const unreadAlerts = alerts.filter((a) => !a.read);
  const alertsToDisplay = showAlerts ? alerts : unreadAlerts;

  const handleAlertPress = (alertId: string) => {
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return;

    if (Platform.OS === 'web') {
      if (window.confirm(`${alert.title}\n\n${alert.description}\n\nMark this alert as read?`)) {
        markAlertAsRead(alertId);
      }
      return;
    }

    RNAlert.alert(alert.title, alert.description, [
      { text: 'Keep', style: 'default' },
      { text: 'Dismiss', onPress: () => markAlertAsRead(alertId), style: 'cancel' },
    ]);
  };

  // Filter logic based on active family member + active search/tabs
  const filteredMedicines = contextFilteredMeds.filter((m) => {
    // 1. Search text
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!m.name.toLowerCase().includes(q) && !m.dosage.toLowerCase().includes(q)) {
        return false;
      }
    }

    // 2. Tab filters
    if (activeFilter === 'low_stock') {
      return m.totalQuantity > 0 && m.currentQuantity / m.totalQuantity <= 0.2;
    }
    if (activeFilter === 'expiring') {
      const expiryDate = new Date(m.expiryDate);
      if (isNaN(expiryDate.getTime())) return false;
      const d = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
      return d > 0 && d <= 30;
    }
    if (activeFilter === 'interactions') {
      return m.interactions && m.interactions.length > 0;
    }

    return true;
  });

  // Quick stats scoped to currently selected family member
  const totalMeds = contextFilteredMeds.length;
  const expiringCount = contextFilteredMeds.filter((m) => {
    const expiryDate = new Date(m.expiryDate);
    if (isNaN(expiryDate.getTime())) return false;
    const d = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
    return d > 0 && d <= 30;
  }).length;
  const lowStockCount = contextFilteredMeds.filter(
    (m) => m.totalQuantity > 0 && m.currentQuantity / m.totalQuantity <= 0.2
  ).length;
  const interactionCount = contextFilteredMeds.filter(
    (m) => m.interactions && m.interactions.length > 0
  ).length;

  const todayDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your medicine cabinet…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.greetingSection}>
          <Text style={styles.dateBadge}>{todayDateFormatted}</Text>
          <Text style={styles.title}>
            Good {getTimeOfDay()},{' '}
            <Text style={{ color: Colors.primary }}>
              {activeUser ? activeUser.name.split(' ')[0] : 'there'}
            </Text>
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setShowAlerts(!showAlerts)}
          >
            <Bell size={20} color={unreadAlerts.length > 0 ? Colors.primaryDark : Colors.textSecondary} />
            {unreadAlerts.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Family Member Filter Bar */}
      <View style={styles.familyBarWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.familyScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.familyPill,
              selectedMemberId === 'all' && styles.familyPillActive,
            ]}
            onPress={() => setSelectedMemberId('all')}
          >
            <Users
              size={13}
              color={selectedMemberId === 'all' ? Colors.white : Colors.primary}
            />
            <Text
              style={[
                styles.familyPillText,
                selectedMemberId === 'all' && styles.familyPillTextActive,
              ]}
            >
              All Family ({medicines.length})
            </Text>
          </TouchableOpacity>

          {familyMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
            const count = medicines.filter(
              (m) => (m.patientId || 'self') === member.id
            ).length;
            return (
              <TouchableOpacity
                key={member.id}
                style={[
                  styles.familyPill,
                  isSelected && styles.familyPillActive,
                ]}
                onPress={() => setSelectedMemberId(member.id)}
              >
                <UserIcon
                  size={13}
                  color={
                    isSelected ? Colors.white : member.avatarColor || Colors.primary
                  }
                />
                <Text
                  style={[
                    styles.familyPillText,
                    isSelected && styles.familyPillTextActive,
                  ]}
                >
                  {member.name} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addFamilyPill}
            onPress={() => setShowAddMemberModal(true)}
          >
            <Plus size={13} color={Colors.primary} />
            <Text style={styles.addFamilyPillText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Today's Health Pulse Banner */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.pulseCard}>
          <View style={styles.pulseHeader}>
            <View style={styles.pulseTitleRow}>
              <View style={styles.sparkleWrap}>
                <Sparkles size={16} color={Colors.primary} />
              </View>
              <Text style={styles.pulseTitle}>Medicine Overview</Text>
            </View>
            <TouchableOpacity
              style={styles.scheduleLink}
              onPress={() => router.push('/(tabs)/schedule')}
            >
              <Text style={styles.scheduleLinkText}>Today's Doses</Text>
              <ChevronRight size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.pulseStatsRow}>
            <View style={styles.pulseStatItem}>
              <Text style={styles.pulseStatNum}>{totalMeds}</Text>
              <Text style={styles.pulseStatLabel}>Active Prescriptions</Text>
            </View>

            <View style={styles.pulseDivider} />

            <View style={styles.pulseStatItem}>
              <Text
                style={[
                  styles.pulseStatNum,
                  { color: lowStockCount > 0 ? Colors.warningDark : Colors.success },
                ]}
              >
                {lowStockCount}
              </Text>
              <Text style={styles.pulseStatLabel}>Needs Refill</Text>
            </View>

            <View style={styles.pulseDivider} />

            <View style={styles.pulseStatItem}>
              <Text
                style={[
                  styles.pulseStatNum,
                  { color: expiringCount > 0 ? Colors.danger : Colors.textPrimary },
                ]}
              >
                {expiringCount}
              </Text>
              <Text style={styles.pulseStatLabel}>Expiring Soon</Text>
            </View>
          </View>
        </Animated.View>

        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by medicine name or dosage…"
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filtersWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                All ({totalMeds})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'low_stock' && styles.filterChipActiveWarning,
              ]}
              onPress={() => setActiveFilter('low_stock')}
            >
              <Package size={14} color={activeFilter === 'low_stock' ? Colors.warningDark : Colors.textTertiary} />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'low_stock' && styles.filterChipTextActiveWarning,
                ]}
              >
                Low Stock ({lowStockCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'expiring' && styles.filterChipActiveDanger,
              ]}
              onPress={() => setActiveFilter('expiring')}
            >
              <Calendar size={14} color={activeFilter === 'expiring' ? Colors.danger : Colors.textTertiary} />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'expiring' && styles.filterChipTextActiveDanger,
                ]}
              >
                Expiring ({expiringCount})
              </Text>
            </TouchableOpacity>

            {interactionCount > 0 && (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  activeFilter === 'interactions' && styles.filterChipActiveDanger,
                ]}
                onPress={() => setActiveFilter('interactions')}
              >
                <ShieldAlert size={14} color={activeFilter === 'interactions' ? Colors.danger : Colors.textTertiary} />
                <Text
                  style={[
                    styles.filterChipText,
                    activeFilter === 'interactions' && styles.filterChipTextActiveDanger,
                  ]}
                >
                  Interactions ({interactionCount})
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Alerts Box */}
        {(showAlerts || unreadAlerts.length > 0) && alertsToDisplay.length > 0 && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.alertsContainer}
          >
            <View style={styles.alertsHeader}>
              <View style={styles.alertsTitleGroup}>
                <AlertCircle size={17} color={Colors.danger} />
                <Text style={styles.alertsMainTitle}>
                  Notifications & Safety{' '}
                  <Text style={styles.alertUnreadBadge}>({unreadAlerts.length} new)</Text>
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowAlerts(!showAlerts)}>
                <Text style={styles.alertsToggleBtn}>
                  {showAlerts ? 'Hide Read' : 'View All'}
                </Text>
              </TouchableOpacity>
            </View>

            {alertsToDisplay.slice(0, 4).map((alert) => (
              <TouchableOpacity
                key={alert.id}
                style={[styles.alertItem, alert.read && styles.alertItemRead]}
                onPress={() => handleAlertPress(alert.id)}
                activeOpacity={0.7}
              >
                <View style={styles.alertItemContent}>
                  <Text style={styles.alertItemTitle} numberOfLines={1}>
                    {alert.title}
                  </Text>
                  <Text style={styles.alertItemDesc} numberOfLines={2}>
                    {alert.description}
                  </Text>
                </View>
                <ChevronRight size={15} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Medicines Section */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeading}>
              {activeFilter === 'all'
                ? 'Medicine Cabinet'
                : activeFilter === 'low_stock'
                ? 'Medicines Running Low'
                : activeFilter === 'expiring'
                ? 'Expiring Prescriptions'
                : 'Interaction Alerts'}
            </Text>

            <TouchableOpacity
              style={styles.addSmallBtn}
              onPress={() => router.push('/(tabs)/add')}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addSmallBtnText}>Add</Text>
            </TouchableOpacity>
          </View>

          {medicines.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Pill size={40} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>Cabinet is empty</Text>
              <Text style={styles.emptyDesc}>
                Add your medicines to get automatic refill alerts, expiration tracking, and interaction warnings.
              </Text>
              <TouchableOpacity
                style={styles.emptyCta}
                onPress={() => router.push('/(tabs)/add')}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.emptyCtaText}>Add First Medicine</Text>
              </TouchableOpacity>
            </Animated.View>
          ) : filteredMedicines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Search size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No matching medicines</Text>
              <Text style={styles.emptyDesc}>
                No medicines found for your current search or filter.
              </Text>
            </View>
          ) : (
            <Animated.View layout={Layout.springify()}>
              {filteredMedicines.map((medicine) => (
                <MedicineCard key={medicine.id} medicine={medicine} />
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Add Family Member Modal */}
      <Modal visible={showAddMemberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.inlineModalBox}>
            <View style={styles.inlineModalHeader}>
              <Text style={styles.inlineModalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Member Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.modalTextInput}
                placeholder="e.g. Sister, Grandpa, Kid"
                placeholderTextColor={Colors.textMuted}
                value={newMemberName}
                onChangeText={setNewMemberName}
              />
            </View>

            <Text style={[styles.modalLabel, { marginTop: Spacing.sm }]}>Relationship</Text>
            <View style={styles.relPillsRow}>
              {(['Spouse', 'Child', 'Parent', 'Grandparent', 'Other'] as const).map((rel) => (
                <TouchableOpacity
                  key={rel}
                  style={[styles.relPill, newMemberRel === rel && styles.relPillActive]}
                  onPress={() => setNewMemberRel(rel)}
                >
                  <Text
                    style={[
                      styles.relPillText,
                      newMemberRel === rel && styles.relPillTextActive,
                    ]}
                  >
                    {rel}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCreateBtn}
              onPress={async () => {
                if (!newMemberName.trim()) return;
                const created = await addFamilyMember({
                  name: newMemberName.trim(),
                  relationship: newMemberRel,
                });
                setSelectedMemberId(created.id);
                setNewMemberName('');
                setShowAddMemberModal(false);
              }}
            >
              <Text style={styles.modalCreateBtnText}>Add & View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  greetingSection: {
    flex: 1,
  },
  dateBadge: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Health Overview Card
  pulseCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  pulseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pulseTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sparkleWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  scheduleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scheduleLinkText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  pulseStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  pulseStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  pulseStatNum: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  pulseStatLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  },
  pulseDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  // Search
  searchSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
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
  // Filter Tabs
  filtersWrapper: {
    marginTop: Spacing.md,
  },
  filtersScroll: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  filterChipActiveWarning: {
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warning,
  },
  filterChipActiveDanger: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  filterChipTextActive: {
    color: Colors.primaryDark,
  },
  filterChipTextActiveWarning: {
    color: Colors.warningDark,
  },
  filterChipTextActiveDanger: {
    color: Colors.dangerDark,
  },
  // Alerts Box
  alertsContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    ...Shadow.sm,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  alertsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  alertsMainTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  alertUnreadBadge: {
    color: Colors.danger,
    fontSize: FontSize.xs,
  },
  alertsToggleBtn: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '700',
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  alertItemRead: {
    opacity: 0.5,
  },
  alertItemContent: {
    flex: 1,
  },
  alertItemTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.dangerDark,
  },
  alertItemDesc: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 1,
  },
  // List Section
  listSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionHeading: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  addSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    ...Shadow.xs,
  },
  addSmallBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: Spacing.sm,
    ...Shadow.xs,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  emptyDesc: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.xl,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },

  // Family Member Filter Bar
  familyBarWrap: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: Spacing.sm,
  },
  familyScrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xs,
  },
  familyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  familyPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  familyPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  familyPillTextActive: {
    color: '#FFFFFF',
  },
  addFamilyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  addFamilyPillText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  inlineModalBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 380,
    ...Shadow.lg,
  },
  inlineModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  inlineModalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: Spacing.md,
    height: 44,
    justifyContent: 'center',
  },
  modalTextInput: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  relPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  relPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  relPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  relPillText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  relPillTextActive: {
    color: Colors.white,
  },
  modalCreateBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalCreateBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
