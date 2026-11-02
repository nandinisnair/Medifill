import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Settings,
  Bell,
  LogOut,
  ChevronRight,
  Shield,
  CircleHelp as HelpCircle,
  UserPlus,
  Trash2,
  X,
  Check,
  Users,
  Cloud,
  Pencil,
  BellRing,
  BellOff,
  Mail,
  ExternalLink,
  Info,
  Database,
  Lock,
  Key,
  ScanLine,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMedicineContext } from '../../context/MedicineContext';
import { useAuth } from '../../context/AuthContext';
import {
  requestNotificationPermissions,
  cancelAllReminders,
  scheduleMedicineReminders,
  sendInstantNotification,
} from '../../services/notificationService';
import {
  Colors,
  Spacing,
  FontSize,
  BorderRadius,
  Shadow,
} from '../../constants/theme';

export default function ProfileScreen() {
  const {
    familyMembers,
    selectedMemberId,
    setSelectedMemberId,
    addFamilyMember,
    updateFamilyMember,
    deleteFamilyMember,
    getMemberMedicineCount,
    medicines,
    isSyncing,
  } = useMedicineContext();
  const { user, profile, signOut, updateDisplayName } = useAuth();

  const [showUserModal, setShowUserModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAppSettingsModal, setShowAppSettingsModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState<
    'Spouse' | 'Child' | 'Parent' | 'Grandparent' | 'Other'
  >('Parent');
  const [newMemberAge, setNewMemberAge] = useState('');
  const [newMemberBlood, setNewMemberBlood] = useState('O+');
  const [newMemberAllergies, setNewMemberAllergies] = useState('');
  const [editName, setEditName] = useState('');
  const [customOcrKey, setCustomOcrKey] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [updatingName, setUpdatingName] = useState(false);
  const [savingOcrKey, setSavingOcrKey] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderSound, setReminderSound] = useState(true);

  // Load preferences
  useEffect(() => {
    (async () => {
      try {
        const enabled = await AsyncStorage.getItem('notificationsEnabled');
        if (enabled !== null) setNotificationsEnabled(enabled === 'true');
        const sound = await AsyncStorage.getItem('reminderSound');
        if (sound !== null) setReminderSound(sound === 'true');
        const ocrKey = await AsyncStorage.getItem('custom_ocr_key');
        if (ocrKey) setCustomOcrKey(ocrKey);
      } catch {}
    })();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem('notificationsEnabled', String(value));
    if (value) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        if (Platform.OS === 'web') {
          window.alert('Notifications are not supported or blocked in this browser.');
        } else {
          Alert.alert('Permissions Required', 'Please enable notifications in your device settings.');
        }
        setNotificationsEnabled(false);
        await AsyncStorage.setItem('notificationsEnabled', 'false');
        return;
      }
      for (const med of medicines) {
        if (med.timeToTake && med.timeToTake.length > 0) {
          scheduleMedicineReminders({
            medicineId: med.id,
            medicineName: med.name,
            dosage: med.dosage,
            times: med.timeToTake,
          });
        }
      }
    } else {
      await cancelAllReminders();
    }
  };

  const handleToggleSound = async (value: boolean) => {
    setReminderSound(value);
    await AsyncStorage.setItem('reminderSound', String(value));
  };

  const handleSaveOcrKey = async () => {
    setSavingOcrKey(true);
    try {
      if (customOcrKey.trim()) {
        await AsyncStorage.setItem('custom_ocr_key', customOcrKey.trim());
      } else {
        await AsyncStorage.removeItem('custom_ocr_key');
      }
      setShowOcrModal(false);
      const msg = 'OCR API Key saved successfully!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Saved', msg);
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to save key.');
      else Alert.alert('Error', 'Failed to save key.');
    } finally {
      setSavingOcrKey(false);
    }
  };

  const handleClearData = () => {
    const executeClear = async () => {
      try {
        await AsyncStorage.multiRemove(['medicines', 'alerts', 'processedAlertIds']);
        if (Platform.OS === 'web') {
          window.alert('Local cache cleared. Reload to re-sync from cloud.');
        } else {
          Alert.alert('Done', 'Local cache cleared. Restart the app to re-sync.');
        }
      } catch {
        if (Platform.OS === 'web') window.alert('Failed to clear data.');
        else Alert.alert('Error', 'Failed to clear data.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Clear all locally cached data? Cloud-synced medicines will re-download on next login.')) {
        executeClear();
      }
      return;
    }

    Alert.alert('Clear Local Cache', 'Cloud-synced medicines will re-download on next login. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: executeClear },
    ]);
  };

  const handleSignOut = async () => {
    const executeSignOut = async () => {
      setSigningOut(true);
      try {
        await signOut();
      } catch {
        if (Platform.OS === 'web') window.alert('Failed to sign out. Please try again.');
        else Alert.alert('Error', 'Failed to sign out. Please try again.');
      } finally {
        setSigningOut(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to sign out?')) {
        await executeSignOut();
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: executeSignOut },
    ]);
  };

  const handleUpdateName = async () => {
    if (!editName.trim()) return;
    setUpdatingName(true);
    try {
      await updateDisplayName(editName.trim());
      setShowNameModal(false);
      setEditName('');
    } catch {
      if (Platform.OS === 'web') window.alert('Failed to update name.');
      else Alert.alert('Error', 'Failed to update name.');
    } finally {
      setUpdatingName(false);
    }
  };

  const handleUserSwitch = async (memberId: string) => {
    setSelectedMemberId(memberId);
    if (Platform.OS === 'web') window.alert('Now managing medicines for this profile.');
    else Alert.alert('Switched', 'Now managing medicines for this profile.');
  };

  const handleAddFamilyMember = async () => {
    if (!newMemberName.trim()) {
      const msg = 'Please enter a name for the family member.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Name required', msg);
      return;
    }

    const allergiesArr = newMemberAllergies
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await addFamilyMember({
      name: newMemberName.trim(),
      relationship: newMemberRel,
      age: newMemberAge.trim() || undefined,
      bloodGroup: newMemberBlood,
      allergies: allergiesArr.length > 0 ? allergiesArr : undefined,
    });

    setNewMemberName('');
    setNewMemberAge('');
    setNewMemberAllergies('');
  };

  const handleDeleteMember = (memberId: string, memberName: string) => {
    if (memberId === 'self') {
      const msg = 'Cannot delete primary profile.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Protected', msg);
      return;
    }

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove ${memberName}? Any assigned medicines will revert to Myself.`)) {
        deleteFamilyMember(memberId);
      }
      return;
    }
    Alert.alert(
      'Delete Profile',
      `Remove ${memberName}? Any assigned medicines will revert to Myself.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteFamilyMember(memberId) },
      ]
    );
  };

  const totalMeds = medicines.length;
  const activeMeds = medicines.filter((m) => {
    const expiryDate = new Date(m.expiryDate);
    if (isNaN(expiryDate.getTime())) return false;
    const d = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
    return d > 0 && m.currentQuantity > 0;
  }).length;

  const displayName = profile?.displayName || user?.displayName || 'User';
  const displayEmail = user?.email || '';
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : '';

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const getFamilyRelStyle = (rel?: string) => {
    if (rel === 'Spouse') return { color: Colors.pink, bg: Colors.pinkLight };
    if (rel === 'Child') return { color: Colors.warning, bg: Colors.warningLight };
    if (rel === 'Parent') return { color: Colors.purple, bg: Colors.purpleLight };
    if (rel === 'Grandparent') return { color: Colors.success, bg: Colors.successLight };
    return { color: Colors.primaryDark, bg: Colors.primaryLight };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Settings & Profile</Text>
        <View style={styles.cloudPill}>
          <Cloud size={13} color={isSyncing ? Colors.warningDark : Colors.success} />
          <Text style={[styles.cloudPillText, { color: isSyncing ? Colors.warningDark : Colors.successDark }]}>
            {isSyncing ? 'Syncing…' : 'Cloud Synced'}
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        {/* User Profile Card */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatarWrap}>
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitials}>{getInitials(displayName)}</Text>
              )}
            </View>

            <View style={styles.profileInfoArea}>
              <View style={styles.nameRow}>
                <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
                <TouchableOpacity
                  style={styles.pencilBtn}
                  onPress={() => {
                    setEditName(displayName === 'User' ? '' : displayName);
                    setShowNameModal(true);
                  }}
                >
                  <Pencil size={13} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
              {memberSince ? (
                <Text style={styles.profileMeta}>Member since {memberSince}</Text>
              ) : null}
            </View>
          </View>

          {/* Health Stats */}
          <View style={styles.statPillsRow}>
            <View style={styles.statPillItem}>
              <Text style={styles.statPillNum}>{totalMeds}</Text>
              <Text style={styles.statPillLabel}>Medicines</Text>
            </View>
            <View style={styles.statPillDivider} />
            <View style={styles.statPillItem}>
              <Text style={[styles.statPillNum, { color: Colors.success }]}>{activeMeds}</Text>
              <Text style={styles.statPillLabel}>Active</Text>
            </View>
            <View style={styles.statPillDivider} />
            <View style={styles.statPillItem}>
              <Text style={[styles.statPillNum, { color: Colors.accent }]}>{familyMembers.length}</Text>
              <Text style={styles.statPillLabel}>Family Profiles</Text>
            </View>
          </View>
        </Animated.View>

        {/* Section 1: Medication & Profiles */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>FAMILY & PREFERENCES</Text>

          <MenuItem
            icon={<Users size={17} color={Colors.primary} />}
            text="Manage Family Profiles"
            onPress={() => setShowUserModal(true)}
            badge={String(familyMembers.length)}
          />
          <MenuItem
            icon={<Bell size={17} color={Colors.primary} />}
            text="Notification Reminders"
            onPress={() => setShowNotifModal(true)}
          />
          <MenuItem
            icon={<ScanLine size={17} color={Colors.primary} />}
            text="OCR & Scanner API Key"
            onPress={() => setShowOcrModal(true)}
            badge={customOcrKey ? 'Configured' : undefined}
            isLast
          />
        </View>

        {/* Section 2: Security & App Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>SYSTEM & SECURITY</Text>

          <MenuItem
            icon={<Shield size={17} color={Colors.primary} />}
            text="Privacy & Cloud Architecture"
            onPress={() => setShowPrivacyModal(true)}
          />
          <MenuItem
            icon={<HelpCircle size={17} color={Colors.primary} />}
            text="Help & Medical Support"
            onPress={() => setShowHelpModal(true)}
          />
          <MenuItem
            icon={<Settings size={17} color={Colors.primary} />}
            text="App Cache & Storage"
            onPress={() => setShowAppSettingsModal(true)}
            isLast
          />
        </View>

        {/* Sign Out CTA */}
        <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.md }}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            disabled={signingOut}
            activeOpacity={0.8}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color={Colors.danger} />
            ) : (
              <LogOut size={16} color={Colors.danger} />
            )}
            <Text style={styles.signOutBtnText}>
              {signingOut ? 'Signing out…' : 'Sign Out of MediFill'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── User / Family Management Modal ────────────────────────────────────────── */}
      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>Family Health Profiles</Text>
                <Text style={styles.modalSubheading}>
                  Manage prescriptions and adherence per family member
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowUserModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
              {familyMembers.map((m) => {
                const isSelected =
                  selectedMemberId === m.id || (selectedMemberId === 'all' && m.id === 'self');
                const medCount = getMemberMedicineCount(m.id);
                return (
                  <View key={m.id} style={styles.userRow}>
                    <View
                      style={[
                        styles.userAvatarSquare,
                        { backgroundColor: m.avatarColor || Colors.primary },
                      ]}
                    >
                      <Text style={[styles.userAvatarLetter, { color: '#FFFFFF' }]}>
                        {getInitials(m.name)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.userNameText}>{m.name}</Text>
                        <View style={[styles.relTag, { backgroundColor: getFamilyRelStyle(m.relationship).bg }]}>
                          <Text style={[styles.relTagText, { color: getFamilyRelStyle(m.relationship).color }]}>
                            {m.relationship}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmailText}>
                        {medCount} {medCount === 1 ? 'medicine' : 'medicines'}
                        {m.bloodGroup ? ` • ${m.bloodGroup}` : ''}
                        {m.age ? ` • ${m.age} yrs` : ''}
                      </Text>
                      {m.allergies && m.allergies.length > 0 && (
                        <Text style={styles.allergiesSubText}>
                          Allergies: {m.allergies.join(', ')}
                        </Text>
                      )}
                    </View>

                    {isSelected ? (
                      <View style={styles.activePill}>
                        <Check size={12} color={Colors.success} strokeWidth={2.5} />
                        <Text style={styles.activePillText}>Active</Text>
                      </View>
                    ) : (
                      <View style={styles.userActionButtons}>
                        <TouchableOpacity
                          style={styles.switchProfileBtn}
                          onPress={() => handleUserSwitch(m.id)}
                        >
                          <Text style={styles.switchProfileBtnText}>Switch</Text>
                        </TouchableOpacity>
                        {m.id !== 'self' && (
                          <TouchableOpacity
                            style={styles.deleteProfileBtn}
                            onPress={() => handleDeleteMember(m.id, m.name)}
                          >
                            <Trash2 size={13} color={Colors.danger} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.addProfileBox}>
              <Text style={styles.addProfileTitle}>Add Family Member</Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Full Name (e.g. Grandma, Sarah)"
                placeholderTextColor={Colors.textMuted}
                value={newMemberName}
                onChangeText={setNewMemberName}
              />

              <Text style={styles.smallFieldLabel}>RELATIONSHIP</Text>
              <View style={styles.pillSelectorRow}>
                {(['Spouse', 'Child', 'Parent', 'Grandparent', 'Other'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.smallPill, newMemberRel === r && styles.smallPillActive]}
                    onPress={() => setNewMemberRel(r)}
                  >
                    <Text
                      style={[
                        styles.smallPillText,
                        newMemberRel === r && styles.smallPillTextActive,
                      ]}
                    >
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xs }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallFieldLabel}>AGE</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 65"
                    placeholderTextColor={Colors.textMuted}
                    value={newMemberAge}
                    onChangeText={setNewMemberAge}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.smallFieldLabel}>BLOOD GROUP</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. O+, A+, B+"
                    placeholderTextColor={Colors.textMuted}
                    value={newMemberBlood}
                    onChangeText={setNewMemberBlood}
                  />
                </View>
              </View>

              <Text style={styles.smallFieldLabel}>KNOWN ALLERGIES</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Penicillin, Sulfa drugs"
                placeholderTextColor={Colors.textMuted}
                value={newMemberAllergies}
                onChangeText={setNewMemberAllergies}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, !newMemberName.trim() && { opacity: 0.5 }]}
                onPress={handleAddFamilyMember}
                disabled={!newMemberName.trim()}
              >
                <UserPlus size={16} color="#FFFFFF" />
                <Text style={styles.primaryActionBtnText}>Save Family Member</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── OCR Key Modal ────────────────────────────────────────────────── */}
      <Modal visible={showOcrModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeading}>OCR & Scanner Configuration</Text>
                <Text style={styles.modalSubheading}>Configure custom vision recognition key</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOcrModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.ocrInfoBanner}>
              <Info size={16} color={Colors.primary} />
              <Text style={styles.ocrInfoText}>
                Google Cloud Vision API requires GCP billing enabled on your project. If you have your own Google Cloud Vision or OCR.space API key, enter it below for unlimited priority recognition.
              </Text>
            </View>

            <View style={styles.modalFieldGroup}>
              <Text style={styles.modalFieldLabel}>Custom API Key (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Paste API key here..."
                placeholderTextColor={Colors.textMuted}
                value={customOcrKey}
                onChangeText={setCustomOcrKey}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.fieldHint}>
                Leave blank to use the standard high-precision OCR pipeline.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleSaveOcrKey}
              disabled={savingOcrKey}
            >
              {savingOcrKey ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Check size={16} color="#FFFFFF" strokeWidth={2.5} />
              )}
              <Text style={styles.primaryActionBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Edit Name Modal ──────────────────────────────────────────────── */}
      <Modal visible={showNameModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '42%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Edit Name</Text>
              <TouchableOpacity onPress={() => setShowNameModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Display name"
              placeholderTextColor={Colors.textMuted}
              value={editName}
              onChangeText={setEditName}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryActionBtn, (!editName.trim() || updatingName) && { opacity: 0.5 }]}
              onPress={handleUpdateName}
              disabled={!editName.trim() || updatingName}
            >
              <Text style={styles.primaryActionBtnText}>
                {updatingName ? 'Saving…' : 'Save Name'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Notification Modal ───────────────────────────────────────────── */}
      <Modal visible={showNotifModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Notification Preferences</Text>
              <TouchableOpacity onPress={() => setShowNotifModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingToggleRow}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingMainText}>Push Notifications</Text>
                <Text style={styles.settingSubText}>Daily dose reminder alerts</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                thumbColor={notificationsEnabled ? Colors.primary : Colors.textMuted}
              />
            </View>

            <View style={[styles.settingToggleRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingMainText}>Sound & Haptics</Text>
                <Text style={styles.settingSubText}>Audible chime on reminder triggers</Text>
              </View>
              <Switch
                value={reminderSound}
                onValueChange={handleToggleSound}
                trackColor={{ false: '#E2E8F0', true: Colors.primaryLight }}
                thumbColor={reminderSound ? Colors.primary : Colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { marginTop: Spacing.lg }]}
              onPress={async () => {
                await sendInstantNotification(
                  '💊 MediFill Reminder Active',
                  'Your medicine notification system is working perfectly!'
                );
                const msg = 'Test notification sent! Check your notification tray.';
                if (Platform.OS === 'web') window.alert(msg);
                else Alert.alert('Notification Sent', msg);
              }}
              activeOpacity={0.85}
            >
              <BellRing size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Send Test Notification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Privacy Modal ────────────────────────────────────────────────── */}
      <Modal visible={showPrivacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Security & Architecture</Text>
              <TouchableOpacity onPress={() => setShowPrivacyModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.archItem}>
                <Database size={18} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.archItemTitle}>Database: Firebase Firestore</Text>
                  <Text style={styles.archItemDesc}>
                    Cloud-synced medicine documents are stored under your private user sub-collection (users/{'{uid}'}/medicines).
                  </Text>
                </View>
              </View>

              <View style={styles.archItem}>
                <Lock size={18} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.archItemTitle}>Authentication & Tokens</Text>
                  <Text style={styles.archItemDesc}>
                    Identity is managed with Firebase Auth. Passwords and credentials never touch unencrypted storage.
                  </Text>
                </View>
              </View>

              <View style={styles.archItem}>
                <Database size={18} color={Colors.primary} />
                <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <Text style={styles.archItemTitle}>Offline Cache: AsyncStorage</Text>
                  <Text style={styles.archItemDesc}>
                    Medicines and intake logs are cached locally per user account for offline access.
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Help Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showHelpModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.faqLabel}>Frequently Asked</Text>
              <View style={styles.faqBox}>
                <Text style={styles.faqQ}>Which database stores my data?</Text>
                <Text style={styles.faqA}>
                  Your data is stored in Firebase Cloud Firestore (`medifill-ff219`) and cached locally in AsyncStorage on your device.
                </Text>

                <Text style={styles.faqQ}>How does OCR work?</Text>
                <Text style={styles.faqA}>
                  MediFill uses multi-engine OCR and instant camera Barcode scanning. You can also configure a custom API key under Settings.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.supportContactRow}
                onPress={() => Linking.openURL('mailto:support@medifill.app')}
              >
                <Mail size={16} color={Colors.primary} />
                <Text style={styles.supportContactText}>support@medifill.app</Text>
                <ExternalLink size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── App Settings Modal ───────────────────────────────────────────── */}
      <Modal visible={showAppSettingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>Cache & Storage</Text>
              <TouchableOpacity onPress={() => setShowAppSettingsModal(false)} style={styles.modalCloseBtn}>
                <X size={20} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
              <Database size={18} color={Colors.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.dangerRowTitle}>Clear Local Cache</Text>
                <Text style={styles.dangerRowSubtitle}>
                  Removes cached offline data and re-syncs fresh from Firebase.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dangerRow}
              onPress={async () => {
                await cancelAllReminders();
                if (Platform.OS === 'web') window.alert('All local reminders cancelled.');
                else Alert.alert('Done', 'All local reminders cancelled.');
              }}
            >
              <BellOff size={18} color={Colors.warning} />
              <View style={{ flex: 1, marginLeft: Spacing.sm }}>
                <Text style={styles.dangerRowTitle}>Cancel All Scheduled Reminders</Text>
                <Text style={styles.dangerRowSubtitle}>Clears pending push notification alarms.</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MenuItem({
  icon,
  text,
  onPress,
  badge,
  isLast,
}: {
  icon: React.ReactNode;
  text: string;
  onPress?: () => void;
  badge?: string;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItemRow, !isLast && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconCircle}>{icon}</View>
      <Text style={styles.menuItemText}>{text}</Text>
      {badge && (
        <View style={styles.menuItemBadge}>
          <Text style={styles.menuItemBadgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={16} color={Colors.textMuted} />
    </TouchableOpacity>
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
    paddingBottom: Spacing.sm,
  },
  screenTitle: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  cloudPill: {
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
  cloudPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.sm,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: 54, height: 54, borderRadius: 27 },
  avatarInitials: { fontSize: 20, fontWeight: '800', color: Colors.primaryDark },
  profileInfoArea: { flex: 1, marginLeft: Spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  profileName: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  pencilBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileEmail: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 1 },
  profileMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statPillsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  statPillItem: { flex: 1, alignItems: 'center' },
  statPillNum: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  statPillLabel: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, fontWeight: '500' },
  statPillDivider: { width: 1, height: 24, backgroundColor: '#E2E8F0' },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadow.xs,
  },
  sectionCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primarySubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: { flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary },
  menuItemBadge: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  menuItemBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },

  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: '#FFFFFF',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutBtnText: {
    color: Colors.danger,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },

  // Modals
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
    marginBottom: Spacing.lg,
  },
  modalHeading: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalSubheading: { fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 2 },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  userAvatarSquare: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarLetter: { fontSize: 13, fontWeight: '800', color: Colors.primaryDark },
  userNameText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  userEmailText: { fontSize: 11, color: Colors.textTertiary },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  activePillText: { fontSize: 11, fontWeight: '700', color: Colors.successDark },
  userActionButtons: { flexDirection: 'row', gap: 6 },
  switchProfileBtn: {
    backgroundColor: Colors.primarySubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
  },
  switchProfileBtnText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  deleteProfileBtn: {
    backgroundColor: Colors.dangerLight,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProfileBox: { marginTop: Spacing.lg, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: Spacing.md },
  addProfileTitle: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: Spacing.sm },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
  },
  primaryActionBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FontSize.sm },

  ocrInfoBanner: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.primarySubtle,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  ocrInfoText: { flex: 1, fontSize: 11, color: Colors.primaryDark, lineHeight: 16 },
  modalFieldGroup: { marginBottom: Spacing.md },
  modalFieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  fieldHint: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },

  settingToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingTextGroup: { flex: 1 },
  settingMainText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  settingSubText: { fontSize: 11, color: Colors.textTertiary, marginTop: 1 },

  archItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  archItemTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  archItemDesc: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, lineHeight: 16 },

  faqLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: Spacing.xs },
  faqBox: { backgroundColor: '#F8FAFC', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  faqQ: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textPrimary, marginTop: 4 },
  faqA: { fontSize: 11, color: Colors.textTertiary, marginTop: 2, marginBottom: 8, lineHeight: 16 },
  supportContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primarySubtle,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  supportContactText: { flex: 1, fontSize: FontSize.xs, fontWeight: '700', color: Colors.primaryDark },

  dangerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dangerRowTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary },
  dangerRowSubtitle: { fontSize: 11, color: Colors.textTertiary, marginTop: 2 },

  // Family profile modal styling
  relTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  relTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  allergiesSubText: {
    fontSize: 10,
    color: Colors.danger,
    marginTop: 2,
    fontWeight: '600',
  },
  smallFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },
  pillSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  smallPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  smallPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  smallPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
