import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  FadeIn,
  Layout,
  SlideOutLeft,
} from 'react-native-reanimated';
import {
  Pill,
  CircleAlert as AlertCircle,
  Calendar,
  Trash2,
  Edit3,
  X,
  Save,
  Clock,
  ChevronRight,
  TrendingDown,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react-native';
import { Medicine, useMedicineContext } from '../context/MedicineContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';

interface MedicineCardProps {
  medicine: Medicine;
}

const MedicineCard: React.FC<MedicineCardProps> = ({ medicine }) => {
  const { deleteMedicine, updateMedicine, familyMembers } = useMedicineContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: medicine.name,
    dosage: medicine.dosage,
    currentQuantity: String(medicine.currentQuantity),
    notes: medicine.notes || '',
    patientId: medicine.patientId || 'self',
  });

  const getPatientColor = () => {
    const rel = medicine.patientRelationship;
    if (rel === 'Spouse') return Colors.familySpouse;
    if (rel === 'Child') return Colors.familyChild;
    if (rel === 'Parent') return Colors.familyParent;
    if (rel === 'Grandparent') return Colors.familyGrandparent;
    return Colors.familySelf;
  };

  const getPatientBadgeBg = () => {
    const rel = medicine.patientRelationship;
    if (rel === 'Spouse') return Colors.pinkLight;
    if (rel === 'Child') return Colors.warningLight;
    if (rel === 'Parent') return Colors.purpleLight;
    if (rel === 'Grandparent') return Colors.successLight;
    return Colors.primaryLight;
  };

  const daysUntilExpiry = () => {
    const expiryDate = new Date(medicine.expiryDate);
    if (isNaN(expiryDate.getTime())) return 999;
    const today = new Date();
    return Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const percentageRemaining = () => {
    if (!medicine.totalQuantity || medicine.totalQuantity <= 0) return 0;
    return Math.round((medicine.currentQuantity / medicine.totalQuantity) * 100);
  };

  const daysLeft = daysUntilExpiry();
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
  const pct = percentageRemaining();
  const isRunningLow = pct <= 20;
  const hasInteractions = medicine.interactions && medicine.interactions.length > 0;

  const handleDelete = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${medicine.name}?`)) {
        deleteMedicine(medicine.id);
      }
      return;
    }

    Alert.alert(
      'Delete Medicine',
      `Remove ${medicine.name} from your medicine cabinet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => deleteMedicine(medicine.id),
          style: 'destructive',
        },
      ]
    );
  };

  const handleSaveEdit = () => {
    const qty = Number(editData.currentQuantity);
    if (isNaN(qty) || qty < 0 || qty > medicine.totalQuantity) {
      const msg = `Quantity must be between 0 and total quantity (${medicine.totalQuantity}).`;
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Invalid', msg);
      }
      return;
    }

    const chosen = familyMembers.find((m) => m.id === editData.patientId) || familyMembers[0];

    updateMedicine({
      ...medicine,
      name: editData.name.trim() || medicine.name,
      dosage: editData.dosage.trim() || medicine.dosage,
      currentQuantity: qty,
      notes: editData.notes,
      patientId: editData.patientId,
      patientName: chosen?.name || 'Myself',
      patientRelationship: chosen?.relationship || 'Self',
    });
    setIsEditing(false);
  };

  // Color coding
  const getStatusColor = () => {
    if (isExpired) return Colors.danger;
    if (isExpiringSoon || isRunningLow) return Colors.warning;
    return Colors.primary;
  };

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={SlideOutLeft.duration(200)}
      layout={Layout.springify()}
      style={styles.cardWrapper}
    >
      <View style={[styles.card, isExpired && styles.cardExpired]}>
        {/* Top Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.avatarWrap,
              { backgroundColor: isExpired ? Colors.dangerLight : Colors.primaryLight },
            ]}
          >
            <Pill
              size={20}
              color={isExpired ? Colors.danger : Colors.primary}
              strokeWidth={2.2}
            />
          </View>

          <View style={styles.titleArea}>
            <View style={styles.nameRow}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {medicine.name}
              </Text>
              {isExpired ? (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>EXPIRED</Text>
                </View>
              ) : isRunningLow ? (
                <View style={styles.lowStockBadge}>
                  <Text style={styles.lowStockBadgeText}>LOW STOCK</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.dosagePatientRow}>
              <Text style={styles.dosageSubtext}>
                {medicine.dosage} • {medicine.frequency}
              </Text>
              <View style={[styles.patientBadge, { backgroundColor: getPatientBadgeBg() }]}>
                <UserIcon size={10} color={getPatientColor()} />
                <Text style={[styles.patientBadgeText, { color: getPatientColor() }]}>
                  {medicine.patientName || 'Myself'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                setEditData({
                  name: medicine.name,
                  dosage: medicine.dosage,
                  currentQuantity: String(medicine.currentQuantity),
                  notes: medicine.notes || '',
                  patientId: medicine.patientId || 'self',
                });
                setIsEditing(true);
              }}
            >
              <Edit3 size={15} color={Colors.textTertiary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnDanger} onPress={handleDelete}>
              <Trash2 size={15} color={Colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stock Gauge */}
        <View style={styles.stockSection}>
          <View style={styles.stockLabelRow}>
            <Text style={styles.stockLabel}>Remaining Supply</Text>
            <Text
              style={[
                styles.stockValue,
                { color: getStatusColor() },
              ]}
            >
              {medicine.currentQuantity} of {medicine.totalQuantity} units ({pct}%)
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.max(4, Math.min(pct, 100))}%`,
                  backgroundColor: getStatusColor(),
                },
              ]}
            />
          </View>
        </View>

        {/* Schedule Chips & Meta */}
        <View style={styles.footerRow}>
          {medicine.timeToTake && medicine.timeToTake.length > 0 ? (
            <View style={styles.timeChipsContainer}>
              <Clock size={13} color={Colors.textTertiary} style={{ marginRight: 4 }} />
              {medicine.timeToTake.map((time, idx) => (
                <View key={idx} style={styles.timeChip}>
                  <Text style={styles.timeChipText}>{formatTime(time)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.expiryBadge}>
            <Calendar size={12} color={isExpired ? Colors.danger : isExpiringSoon ? Colors.warning : Colors.textMuted} />
            <Text
              style={[
                styles.expiryText,
                isExpired && { color: Colors.danger, fontWeight: '700' },
                isExpiringSoon && { color: Colors.warningDark, fontWeight: '600' },
              ]}
            >
              {isExpired ? 'Expired' : `${daysLeft}d left`}
            </Text>
          </View>
        </View>

        {/* Interactions warning pill */}
        {hasInteractions && (
          <View style={styles.interactionWarning}>
            <ShieldAlert size={14} color={Colors.danger} />
            <Text style={styles.interactionText} numberOfLines={1}>
              Interacts with: {medicine.interactions?.join(', ')}
            </Text>
          </View>
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={isEditing} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Details</Text>
                <Text style={styles.modalSubtitle}>{medicine.name}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsEditing(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Medicine Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.name}
                onChangeText={(v) => setEditData({ ...editData, name: v })}
                placeholder="Name"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Prescribed For</Text>
              <View style={styles.modalFamilyRow}>
                {familyMembers.map((m) => {
                  const isSelected = (editData.patientId || 'self') === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[
                        styles.modalFamilyChip,
                        isSelected && styles.modalFamilyChipActive,
                      ]}
                      onPress={() => setEditData({ ...editData, patientId: m.id })}
                    >
                      <UserIcon
                        size={12}
                        color={isSelected ? Colors.white : m.avatarColor || Colors.primary}
                      />
                      <Text
                        style={[
                          styles.modalFamilyChipText,
                          isSelected && styles.modalFamilyChipTextActive,
                        ]}
                      >
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Dosage</Text>
              <TextInput
                style={styles.modalInput}
                value={editData.dosage}
                onChangeText={(v) => setEditData({ ...editData, dosage: v })}
                placeholder="e.g., 500mg"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>
                Current Units Remaining (max {medicine.totalQuantity})
              </Text>
              <TextInput
                style={styles.modalInput}
                value={editData.currentQuantity}
                onChangeText={(v) => setEditData({ ...editData, currentQuantity: v })}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Notes & Instructions</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={editData.notes}
                onChangeText={(v) => setEditData({ ...editData, notes: v })}
                placeholder="Take with food, side effects..."
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

function formatTime(t: string): string {
  if (!t || !t.includes(':')) return t;
  const [hStr, mStr] = t.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return t;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: Spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadow.sm,
  },
  cardExpired: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFDFD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  titleArea: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  medicineName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  expiredBadge: {
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  expiredBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.danger,
    letterSpacing: 0.5,
  },
  lowStockBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  lowStockBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.warningDark,
    letterSpacing: 0.5,
  },
  dosagePatientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  dosageSubtext: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  patientBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalFamilyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  modalFamilyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalFamilyChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modalFamilyChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  modalFamilyChipTextActive: {
    color: Colors.white,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockSection: {
    marginTop: Spacing.md,
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 2,
  },
  stockLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stockLabel: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  stockValue: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  timeChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  timeChip: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  timeChipText: {
    fontSize: 11,
    color: Colors.primaryDark,
    fontWeight: '600',
  },
  expiryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  interactionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dangerLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  interactionText: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    paddingBottom: Spacing.xxxxl,
    ...Shadow.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalField: {
    marginBottom: Spacing.md,
  },
  modalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    ...Shadow.sm,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});

export default MedicineCard;
