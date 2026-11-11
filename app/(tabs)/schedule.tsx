import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Calendar as CalendarIcon,
  Clock,
  Pill,
  Check,
  Circle,
  User as UserIcon,
  Users,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, Layout } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMedicineContext } from '../../context/MedicineContext';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../../constants/theme';

interface ScheduleItem {
  id: string;
  time: string;
  medicines: {
    id: string;
    name: string;
    dosage: string;
    patientName?: string;
    patientRelationship?: string;
    taken: boolean;
  }[];
}

const getLocalDateString = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTakenStorageKey = (date: Date) => {
  return `schedule_taken_${getLocalDateString(date)}`;
};

function getPatientBadgeStyle(rel?: string) {
  if (rel === 'Spouse') return { color: Colors.familySpouse, bg: Colors.pinkLight };
  if (rel === 'Child') return { color: Colors.familyChild, bg: Colors.warningLight };
  if (rel === 'Parent') return { color: Colors.familyParent, bg: Colors.purpleLight };
  if (rel === 'Grandparent') return { color: Colors.familyGrandparent, bg: Colors.successLight };
  return { color: Colors.familySelf, bg: Colors.primaryLight };
}

export default function ScheduleScreen() {
  const {
    medicines,
    filteredMedicines,
    updateMedicine,
    familyMembers,
    selectedMemberId,
    setSelectedMemberId,
    activeUser,
  } = useMedicineContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});

  const dateStr = getLocalDateString(selectedDate);

  const loadTakenStatus = useCallback(async () => {
    try {
      const key = getTakenStorageKey(selectedDate);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        setTakenMap(JSON.parse(stored));
      } else {
        setTakenMap({});
      }
    } catch (error) {
      console.error('Error loading taken status:', error);
    }
  }, [dateStr]);

  const saveTakenStatus = async (newMap: Record<string, boolean>) => {
    try {
      const key = getTakenStorageKey(selectedDate);
      await AsyncStorage.setItem(key, JSON.stringify(newMap));
    } catch (error) {
      console.error('Error saving taken status:', error);
    }
  };

  useEffect(() => {
    loadTakenStatus();
  }, [loadTakenStatus]);

  useEffect(() => {
    if (filteredMedicines.length === 0) {
      setSchedule([]);
      return;
    }

    const timeMap = new Map<string, ScheduleItem>();

    filteredMedicines.forEach((medicine) => {
      if (medicine.timeToTake && medicine.timeToTake.length > 0) {
        medicine.timeToTake.forEach((time) => {
          if (!time || !time.includes(':')) return;

          if (!timeMap.has(time)) {
            timeMap.set(time, {
              id: `time-${time}`,
              time,
              medicines: [],
            });
          }
          const takenKey = `${medicine.id}-${time}-${dateStr}`;
          timeMap.get(time)!.medicines.push({
            id: medicine.id,
            name: medicine.name,
            dosage: medicine.dosage,
            patientName: medicine.patientName || 'Myself',
            patientRelationship: medicine.patientRelationship || 'Self',
            taken: takenMap[takenKey] || false,
          });
        });
      }
    });

    const items = Array.from(timeMap.values()).sort((a, b) => {
      const [ah, am] = a.time.split(':').map(Number);
      const [bh, bm] = b.time.split(':').map(Number);
      return (ah || 0) !== (bh || 0) ? (ah || 0) - (bh || 0) : (am || 0) - (bm || 0);
    });

    setSchedule(items);
  }, [filteredMedicines, takenMap, dateStr]);

  const toggleMedicineTaken = async (medicineId: string, time: string) => {
    const takenKey = `${medicineId}-${time}-${dateStr}`;
    const willBeTaken = !takenMap[takenKey];
    const newMap = { ...takenMap, [takenKey]: willBeTaken };
    setTakenMap(newMap);
    await saveTakenStatus(newMap);

    const medicine = medicines.find((m) => m.id === medicineId);
    if (medicine) {
      if (willBeTaken) {
        if (medicine.currentQuantity > 0) {
          await updateMedicine({
            ...medicine,
            currentQuantity: medicine.currentQuantity - 1,
          });
        }
      } else {
        if (medicine.currentQuantity < medicine.totalQuantity) {
          await updateMedicine({
            ...medicine,
            currentQuantity: medicine.currentQuantity + 1,
          });
        }
      }
    }
  };

  // Generate 7-day strip centered on selected date
  const getWeekDays = () => {
    const days: Date[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const isToday = getLocalDateString(selectedDate) === getLocalDateString(new Date());

  const totalDoses = schedule.reduce((acc, s) => acc + s.medicines.length, 0);
  const takenDoses = schedule.reduce(
    (acc, s) => acc + s.medicines.filter((m) => m.taken).length,
    0
  );
  const adherencePercent = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.screenSubtitle}>Daily Routine</Text>
          <Text style={styles.screenTitle}>Medication Schedule</Text>
        </View>

        {!isToday && (
          <TouchableOpacity
            style={styles.todayBtn}
            onPress={() => setSelectedDate(new Date())}
          >
            <Text style={styles.todayBtnText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modern 7-Day Calendar Strip */}
      <View style={styles.calendarStrip}>
        {weekDays.map((date, idx) => {
          const isSelected = getLocalDateString(date) === dateStr;
          const isCurrentRealDay = getLocalDateString(date) === getLocalDateString(new Date());
          const dayName = date.toLocaleDateString('en-US', { weekday: 'narrow' });
          const dayNum = date.getDate();

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCapsule,
                isSelected && styles.dayCapsuleSelected,
                isCurrentRealDay && !isSelected && styles.dayCapsuleToday,
              ]}
              onPress={() => setSelectedDate(date)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayCapsuleName,
                  isSelected && styles.dayCapsuleTextSelected,
                ]}
              >
                {dayName}
              </Text>
              <Text
                style={[
                  styles.dayCapsuleNum,
                  isSelected && styles.dayCapsuleTextSelected,
                ]}
              >
                {dayNum}
              </Text>
              {isCurrentRealDay && (
                <View
                  style={[
                    styles.dayDot,
                    isSelected ? { backgroundColor: '#FFFFFF' } : { backgroundColor: Colors.primary },
                  ]}
                />
              )}
            </TouchableOpacity>
          );
        })}
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
              All Family
            </Text>
          </TouchableOpacity>

          {familyMembers.map((member) => {
            const isSelected = selectedMemberId === member.id;
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
                  {member.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* Adherence Card */}
        {totalDoses > 0 && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.adherenceCard}>
            <View style={styles.adherenceTop}>
              <View>
                <Text style={styles.adherenceTitle}>
                  {adherencePercent === 100
                    ? 'Perfect Adherence!'
                    : adherencePercent >= 50
                    ? 'On Track'
                    : 'Doses Scheduled'}
                </Text>
                <Text style={styles.adherenceSubtitle}>
                  {takenDoses} of {totalDoses} doses logged ({adherencePercent}%)
                </Text>
              </View>

              <View style={styles.adherencePillBadge}>
                <Text style={styles.adherenceBadgeText}>{adherencePercent}%</Text>
              </View>
            </View>

            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${adherencePercent}%`,
                    backgroundColor:
                      adherencePercent === 100
                        ? Colors.success
                        : adherencePercent >= 50
                        ? Colors.primary
                        : Colors.warning,
                  },
                ]}
              />
            </View>
          </Animated.View>
        )}

        {/* Schedule Timeline */}
        <View style={styles.timelineSection}>
          {schedule.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <CalendarIcon size={36} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.emptyTitle}>No scheduled doses</Text>
              <Text style={styles.emptySubtitle}>
                Add medicines with scheduled reminder times to build your daily timeline.
              </Text>
            </View>
          ) : (
            schedule.map((item, idx) => (
              <Animated.View
                key={item.id}
                entering={FadeInRight.delay(idx * 60).duration(300)}
                layout={Layout.springify()}
                style={styles.timeBlock}
              >
                {/* Time Indicator */}
                <View style={styles.timeHeaderRow}>
                  <View style={styles.clockPill}>
                    <Clock size={13} color={Colors.primary} />
                    <Text style={styles.timeLabel}>{formatTimeDisplay(item.time)}</Text>
                  </View>
                  <View style={styles.timeRule} />
                </View>

                {/* Doses in this slot */}
                <View style={styles.dosesList}>
                  {item.medicines.map((m) => (
                    <View
                      key={`${m.id}-${item.time}`}
                      style={[
                        styles.doseCard,
                        m.taken && styles.doseCardTaken,
                      ]}
                    >
                      <View style={styles.doseInfo}>
                        <View
                          style={[
                            styles.doseIconWrap,
                            m.taken && { backgroundColor: Colors.successLight },
                          ]}
                        >
                          <Pill
                            size={18}
                            color={m.taken ? Colors.success : Colors.primary}
                            strokeWidth={2.2}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.doseName,
                              m.taken && styles.doseNameTaken,
                            ]}
                            numberOfLines={1}
                          >
                            {m.name}
                          </Text>
                          <View style={styles.doseSubRow}>
                            <Text style={styles.doseDosage}>{m.dosage}</Text>
                            <View style={[styles.patientBadge, { backgroundColor: getPatientBadgeStyle(m.patientRelationship).bg }]}>
                              <UserIcon size={10} color={getPatientBadgeStyle(m.patientRelationship).color} />
                              <Text style={[styles.patientBadgeText, { color: getPatientBadgeStyle(m.patientRelationship).color }]}>
                                {m.patientName || 'Myself'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.takeButton,
                          m.taken ? styles.takeButtonTaken : styles.takeButtonPending,
                        ]}
                        onPress={() => toggleMedicineTaken(m.id, item.time)}
                        activeOpacity={0.8}
                      >
                        {m.taken ? (
                          <>
                            <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.takeBtnTextTaken}>Taken</Text>
                          </>
                        ) : (
                          <>
                            <Circle size={14} color={Colors.primary} strokeWidth={2} />
                            <Text style={styles.takeBtnTextPending}>Take</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatTimeDisplay(time: string): string {
  if (!time || !time.includes(':')) return time;
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time;
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  todayBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  todayBtnText: {
    color: Colors.primaryDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  // Calendar Strip
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  dayCapsule: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.md,
    minWidth: 40,
  },
  dayCapsuleSelected: {
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  dayCapsuleToday: {
    backgroundColor: Colors.primarySubtle,
  },
  dayCapsuleName: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  dayCapsuleNum: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dayCapsuleTextSelected: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  // Adherence
  adherenceCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  adherenceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  adherenceTitle: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  adherenceSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  adherencePillBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  adherenceBadgeText: {
    color: Colors.primaryDark,
    fontSize: FontSize.xs,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // Timeline
  timelineSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
  timeBlock: {
    marginBottom: Spacing.lg,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  clockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  timeRule: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: Spacing.sm,
  },
  dosesList: {
    gap: Spacing.sm,
  },
  doseCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  doseCardTaken: {
    backgroundColor: '#F8FAF9',
    borderColor: '#D1FAE5',
  },
  doseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  doseIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  doseName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  doseNameTaken: {
    textDecorationLine: 'line-through',
    color: Colors.textMuted,
  },
  doseDosage: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
    fontWeight: '500',
  },
  takeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  takeButtonPending: {
    backgroundColor: Colors.primarySubtle,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  takeButtonTaken: {
    backgroundColor: Colors.success,
  },
  takeBtnTextPending: {
    color: Colors.primaryDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  takeBtnTextTaken: {
    color: '#FFFFFF',
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
    marginTop: Spacing.md,
    ...Shadow.xs,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
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

  // Dose sub row & patient badge
  doseSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  patientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  patientBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
});
