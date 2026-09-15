import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import {
  Camera,
  Calendar,
  Clock,
  Pill,
  Package,
  ScanLine,
  ChevronDown,
  Sparkles,
  Check,
  Plus,
  X,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import { useMedicineContext } from '../../context/MedicineContext';
import { router, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '../../components/DateTimePicker';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';

const FREQUENCY_OPTIONS = [
  'Once daily',
  'Twice daily',
  'Three times daily',
  'Every other day',
  'Once a week',
  'As needed',
];

const COMMON_DOSAGE_PRESETS = ['250mg', '500mg', '650mg', '10mg', '20mg', '5ml'];

export default function AddMedicineScreen() {
  const { addMedicine, familyMembers, selectedMemberId, addFamilyMember } = useMedicineContext();
  const params = useLocalSearchParams<{
    ocrName?: string;
    ocrDosage?: string;
    ocrExpiry?: string;
    ocrQuantity?: string;
    ocrRawText?: string;
    patientId?: string;
    patientName?: string;
  }>();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    params.patientId || (selectedMemberId !== 'all' ? selectedMemberId : 'self')
  );
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState<
    'Spouse' | 'Child' | 'Parent' | 'Grandparent' | 'Other'
  >('Parent');

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('Once daily');
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);
  const [totalQuantity, setTotalQuantity] = useState('30');
  const [currentQuantity, setCurrentQuantity] = useState('30');
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [timesToTake, setTimesToTake] = useState<string[]>(['08:00']);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [errors, setErrors] = useState({
    name: false,
    dosage: false,
    frequency: false,
    totalQuantity: false,
    currentQuantity: false,
  });

  // Apply OCR results
  useEffect(() => {
    if (params.ocrName) setName(params.ocrName);
    if (params.ocrDosage) setDosage(params.ocrDosage);
    if (params.ocrQuantity) {
      setTotalQuantity(params.ocrQuantity);
      setCurrentQuantity(params.ocrQuantity);
    }
    if (params.ocrExpiry) {
      try {
        const date = new Date(params.ocrExpiry);
        if (!isNaN(date.getTime())) {
          setExpiryDate(date);
        }
      } catch (e) {}
    }
    if (params.patientId) {
      setSelectedPatientId(params.patientId);
    }
    if (params.ocrRawText) {
      setNotes(`Scanned:\n${params.ocrRawText}`);
    }
  }, [params.ocrName, params.ocrDosage, params.ocrQuantity, params.ocrExpiry, params.ocrRawText, params.patientId]);

  const handleScanMedicine = () => {
    router.push('/camera');
  };

  const validateForm = () => {
    const totalQtyNum = Number(totalQuantity);
    const currentQtyNum = Number(currentQuantity);

    const newErrors = {
      name: !name.trim(),
      dosage: !dosage.trim(),
      frequency: !frequency.trim(),
      totalQuantity: !totalQuantity.trim() || isNaN(totalQtyNum) || totalQtyNum <= 0,
      currentQuantity:
        !currentQuantity.trim() ||
        isNaN(currentQtyNum) ||
        currentQtyNum < 0 ||
        currentQtyNum > totalQtyNum,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error);
  };

  const handleAddTimeToTake = () => {
    setTimesToTake([...timesToTake, '20:00']);
  };

  const handleRemoveTimeToTake = (index: number) => {
    const newTimes = [...timesToTake];
    newTimes.splice(index, 1);
    setTimesToTake(newTimes);
    if (currentTimeIndex >= newTimes.length) {
      setCurrentTimeIndex(Math.max(0, newTimes.length - 1));
    }
  };

  const handleTimeChange = (index: number, time: string) => {
    const newTimes = [...timesToTake];
    newTimes[index] = time;
    setTimesToTake(newTimes);
  };

  const handleTimePickerOpen = (index: number) => {
    setCurrentTimeIndex(index);
    setShowTimePicker(true);
  };

  const handleTimePickerChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime && !isNaN(selectedTime.getTime())) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      handleTimeChange(currentTimeIndex, `${hours}:${minutes}`);
    }
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const member = familyMembers.find((m) => m.id === selectedPatientId) || familyMembers[0];

    const newMedicine = {
      id: Date.now().toString(),
      name: name.trim(),
      dosage: dosage.trim(),
      frequency,
      totalQuantity: Number(totalQuantity),
      currentQuantity: Number(currentQuantity),
      expiryDate: expiryDate.toISOString(),
      notes: notes.trim(),
      timeToTake: timesToTake,
      createdAt: new Date().toISOString(),
      patientId: selectedPatientId,
      patientName: member?.name || 'Myself',
      patientRelationship: member?.relationship || 'Self',
    };

    addMedicine(newMedicine);

    if (Platform.OS === 'web') {
      window.alert('Medicine added successfully to your cabinet!');
      resetForm();
      router.navigate('/(tabs)');
    } else {
      Alert.alert('Success', 'Medicine added successfully!', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            router.navigate('/(tabs)');
          },
        },
      ]);
    }
  };

  const resetForm = () => {
    setName('');
    setDosage('');
    setFrequency('Once daily');
    setTotalQuantity('30');
    setCurrentQuantity('30');
    setExpiryDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    setNotes('');
    setTimesToTake(['08:00']);
    setErrors({
      name: false,
      dosage: false,
      frequency: false,
      totalQuantity: false,
      currentQuantity: false,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.screenSubtitle}>New Prescription</Text>
          <Text style={styles.screenTitle}>Add Medicine</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
          <View style={styles.formContainer}>
            {/* Camera / Scan Banner */}
            <TouchableOpacity style={styles.scanBanner} onPress={handleScanMedicine} activeOpacity={0.85}>
              <View style={styles.scanIconWrap}>
                <ScanLine size={24} color={Colors.primary} />
              </View>
              <View style={styles.scanBannerContent}>
                <View style={styles.scanTitleRow}>
                  <Text style={styles.scanBannerTitle}>Scan Medicine Label (OCR)</Text>
                  <View style={styles.aiBadge}>
                    <Sparkles size={11} color={Colors.primary} />
                    <Text style={styles.aiBadgeText}>AI SCAN</Text>
                  </View>
                </View>
                <Text style={styles.scanBannerDesc}>
                  Point camera at medicine bottle, box or prescription label to auto-fill details.
                </Text>
              </View>
              <Camera size={18} color={Colors.textTertiary} />
            </TouchableOpacity>

            <View style={styles.orDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or fill manually</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Prescribed For (Family Member) */}
            <View style={styles.cardGroup}>
              <View style={styles.cardGroupHeaderRow}>
                <Text style={styles.cardGroupTitle}>PRESCRIBED FOR</Text>
                <TouchableOpacity
                  style={styles.addMemberInlineBtn}
                  onPress={() => setShowAddMemberModal(true)}
                >
                  <Plus size={13} color={Colors.primary} />
                  <Text style={styles.addMemberInlineText}>New Member</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.familyScroll}
              >
                {familyMembers.map((member) => {
                  const isSelected = selectedPatientId === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberChip, isSelected && styles.memberChipActive]}
                      onPress={() => setSelectedPatientId(member.id)}
                    >
                      <UserIcon
                        size={14}
                        color={isSelected ? Colors.white : member.avatarColor || Colors.primary}
                      />
                      <Text
                        style={[
                          styles.memberChipText,
                          isSelected && styles.memberChipTextActive,
                        ]}
                      >
                        {member.name}
                      </Text>
                      {member.relationship && member.relationship !== 'Self' && (
                        <Text
                          style={[
                            styles.memberRelText,
                            isSelected && styles.memberRelTextActive,
                          ]}
                        >
                          ({member.relationship})
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Section 1: General Info Card */}
            <View style={styles.cardGroup}>
              <Text style={styles.cardGroupTitle}>BASIC DETAILS</Text>

              {/* Medicine Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Medicine Name <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                  <Pill size={18} color={errors.name ? Colors.danger : Colors.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Paracetamol, Amoxicillin, Lipitor"
                    placeholderTextColor={Colors.textMuted}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>Medicine name is required</Text>}
              </View>

              {/* Dosage */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Dosage & Strength <Text style={styles.required}>*</Text>
                </Text>
                <View style={[styles.inputWrapper, errors.dosage && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500mg, 10ml, 1 tablet"
                    placeholderTextColor={Colors.textMuted}
                    value={dosage}
                    onChangeText={setDosage}
                  />
                </View>

                {/* Quick Dosage Presets */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                  {COMMON_DOSAGE_PRESETS.map((d) => (
                    <TouchableOpacity
                      key={d}
                      style={[styles.presetChip, dosage === d && styles.presetChipActive]}
                      onPress={() => setDosage(d)}
                    >
                      <Text style={[styles.presetChipText, dosage === d && styles.presetChipTextActive]}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.dosage && <Text style={styles.errorText}>Dosage is required</Text>}
              </View>
            </View>

            {/* Section 2: Frequency & Schedule */}
            <View style={styles.cardGroup}>
              <Text style={styles.cardGroupTitle}>DOSING FREQUENCY</Text>

              <View style={styles.frequencyGrid}>
                {FREQUENCY_OPTIONS.map((opt) => {
                  const isSelected = frequency === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.freqGridItem, isSelected && styles.freqGridItemSelected]}
                      onPress={() => setFrequency(opt)}
                      activeOpacity={0.7}
                    >
                      {isSelected ? (
                        <Check size={14} color={Colors.primary} strokeWidth={2.5} />
                      ) : null}
                      <Text
                        style={[
                          styles.freqGridText,
                          isSelected && styles.freqGridTextSelected,
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Time Slots */}
              <View style={[styles.inputContainer, { marginTop: Spacing.md }]}>
                <Text style={styles.label}>Scheduled Daily Times</Text>
                <View style={styles.timeSlotsRow}>
                  {timesToTake.map((time, index) => (
                    <View key={`time-${index}`} style={styles.timeSlotChip}>
                      <TouchableOpacity
                        style={styles.timeSlotPickerBtn}
                        onPress={() => handleTimePickerOpen(index)}
                      >
                        <Clock size={14} color={Colors.primary} />
                        <Text style={styles.timeSlotText}>{time}</Text>
                      </TouchableOpacity>

                      {timesToTake.length > 1 && (
                        <TouchableOpacity
                          style={styles.timeSlotRemove}
                          onPress={() => handleRemoveTimeToTake(index)}
                        >
                          <X size={12} color={Colors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  <TouchableOpacity style={styles.addTimeChip} onPress={handleAddTimeToTake}>
                    <Plus size={14} color={Colors.primary} />
                    <Text style={styles.addTimeChipText}>Add Time</Text>
                  </TouchableOpacity>
                </View>

                {showTimePicker && (
                  <DateTimePicker
                    value={(() => {
                      const t = timesToTake[currentTimeIndex] || '08:00';
                      const [h, m] = t.split(':').map(Number);
                      const d = new Date();
                      d.setHours(!isNaN(h) ? h : 8, !isNaN(m) ? m : 0, 0, 0);
                      return d;
                    })()}
                    mode="time"
                    display="default"
                    onChange={handleTimePickerChange}
                  />
                )}
              </View>
            </View>

            {/* Section 3: Quantity & Expiry */}
            <View style={styles.cardGroup}>
              <Text style={styles.cardGroupTitle}>INVENTORY & EXPIRATION</Text>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={styles.label}>
                    Total Units <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, errors.totalQuantity && styles.inputError]}>
                    <Package size={16} color={Colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      placeholder="30"
                      placeholderTextColor={Colors.textMuted}
                      value={totalQuantity}
                      onChangeText={setTotalQuantity}
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.totalQuantity && <Text style={styles.errorText}>Must be &gt; 0</Text>}
                </View>

                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.label}>
                    Current Left <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.inputWrapper, errors.currentQuantity && styles.inputError]}>
                    <Package size={16} color={Colors.textTertiary} />
                    <TextInput
                      style={styles.input}
                      placeholder="30"
                      placeholderTextColor={Colors.textMuted}
                      value={currentQuantity}
                      onChangeText={setCurrentQuantity}
                      keyboardType="numeric"
                    />
                  </View>
                  {errors.currentQuantity && <Text style={styles.errorText}>Must be ≤ total</Text>}
                </View>
              </View>

              {/* Expiry Date */}
              <View style={[styles.inputContainer, { marginTop: Spacing.md }]}>
                <Text style={styles.label}>Expiration Date</Text>
                <TouchableOpacity
                  style={styles.inputWrapper}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={16} color={Colors.primary} />
                  <Text style={styles.dateDisplay}>
                    {expiryDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={expiryDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate && !isNaN(selectedDate.getTime())) {
                        setExpiryDate(selectedDate);
                      }
                    }}
                  />
                )}
              </View>

              {/* Notes */}
              <View style={[styles.inputContainer, { marginTop: Spacing.sm }]}>
                <Text style={styles.label}>Instructions & Notes (Optional)</Text>
                <TextInput
                  style={[styles.inputWrapper, styles.notesArea]}
                  placeholder="e.g. Take after breakfast with water, avoid alcohol..."
                  placeholderTextColor={Colors.textMuted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Submit CTA */}
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.submitBtnText}>Add to Medicine Cabinet</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Add Member Inline Modal */}
      <Modal visible={showAddMemberModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.inlineModalBox}>
            <View style={styles.inlineModalHeader}>
              <Text style={styles.inlineModalTitle}>Add Family Member</Text>
              <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Member Name</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="e.g. Sister, Grandpa, Kid"
                placeholderTextColor={Colors.textMuted}
                value={newMemberName}
                onChangeText={setNewMemberName}
              />
            </View>

            <Text style={[styles.label, { marginTop: Spacing.sm }]}>Relationship</Text>
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
                setSelectedPatientId(created.id);
                setNewMemberName('');
                setShowAddMemberModal(false);
              }}
            >
              <Text style={styles.modalCreateBtnText}>Add & Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
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
  scrollView: { flex: 1 },
  formContainer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm },

  // Scan Banner
  scanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    ...Shadow.sm,
  },
  scanIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  scanBannerContent: { flex: 1, marginRight: Spacing.sm },
  scanTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scanBannerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  aiBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.primaryDark },
  scanBannerDesc: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, lineHeight: 15 },

  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  dividerText: { marginHorizontal: Spacing.md, fontSize: 11, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },

  // Card Groups
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.lg,
    ...Shadow.xs,
  },
  cardGroupTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.md,
  },
  inputContainer: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  required: { color: Colors.danger },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
  },
  inputError: { borderColor: Colors.danger, backgroundColor: Colors.dangerLight },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, paddingLeft: Spacing.sm },
  errorText: { color: Colors.danger, fontSize: 11, marginTop: 4, fontWeight: '600' },

  presetsRow: { flexDirection: 'row', marginTop: Spacing.xs, gap: Spacing.xs },
  presetChip: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
  },
  presetChipActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.primary },
  presetChipText: { fontSize: 11, color: Colors.textTertiary, fontWeight: '600' },
  presetChipTextActive: { color: Colors.primaryDark, fontWeight: '700' },

  // Frequency Grid
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  freqGridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  freqGridItemSelected: {
    backgroundColor: Colors.primarySubtle,
    borderColor: Colors.primary,
  },
  freqGridText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  freqGridTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },

  // Time Slots
  timeSlotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  timeSlotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
  },
  timeSlotPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeSlotText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timeSlotRemove: {
    padding: 4,
    marginLeft: 6,
  },
  addTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  addTimeChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },

  rowInputs: {
    flexDirection: 'row',
  },
  dateDisplay: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingLeft: Spacing.sm,
    fontWeight: '600',
  },
  notesArea: {
    minHeight: 70,
    alignItems: 'flex-start',
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },

  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    ...Shadow.md,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: '800',
  },

  // Family Member Prescribed For
  cardGroupHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  addMemberInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primaryLight,
  },
  addMemberInlineText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  familyScroll: {
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  memberChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  memberChipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  memberChipTextActive: {
    color: Colors.white,
  },
  memberRelText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
  },
  memberRelTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Inline Modal
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
