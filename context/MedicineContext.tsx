import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findInteractionsForMedicine } from '../constants/interactions';
import { Colors } from '../constants/theme';
import {
  saveMedicineToCloud,
  saveAllMedicinesToCloud,
  deleteMedicineFromCloud,
  subscribeMedicines,
} from '../services/firestoreSync';
import {
  scheduleMedicineReminders,
  cancelMedicineReminders,
} from '../services/notificationService';

export type RelationshipType =
  | 'Self'
  | 'Spouse'
  | 'Child'
  | 'Parent'
  | 'Grandparent'
  | 'Other';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: RelationshipType;
  age?: string;
  bloodGroup?: string;
  allergies?: string[];
  avatarColor?: string;
  isPrimary?: boolean;
}

export interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  totalQuantity: number;
  currentQuantity: number;
  expiryDate: string;
  notes?: string;
  createdAt: string;
  interactions?: string[];
  timeToTake?: string[];
  patientId?: string;
  patientName?: string;
  patientRelationship?: RelationshipType;
}

export interface Alert {
  id: string;
  type: 'expiry' | 'stock' | 'interaction' | 'reminder';
  title: string;
  description: string;
  medicineIds: string[];
  createdAt: string;
  read: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isActive: boolean;
}

interface MedicineContextType {
  medicines: Medicine[];
  filteredMedicines: Medicine[];
  alerts: Alert[];
  familyMembers: FamilyMember[];
  selectedMemberId: string;
  setSelectedMemberId: (id: string) => void;
  isSyncing: boolean;

  // Medicine Actions
  addMedicine: (medicine: Medicine) => Promise<void>;
  updateMedicine: (medicine: Medicine) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  loadMedicines: () => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  getInteractionAlerts: () => Alert[];
  getExpiryAlerts: () => Alert[];
  getStockAlerts: () => Alert[];

  // Family Member Actions
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => Promise<FamilyMember>;
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>;
  deleteFamilyMember: (id: string) => Promise<void>;
  getMemberMedicineCount: (memberId: string) => number;

  // Legacy / User Compatibility
  users: User[];
  activeUser: User | null;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  setActiveUser: (userId: string) => Promise<void>;
}

export const DEFAULT_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'self',
    name: 'Myself',
    relationship: 'Self',
    age: '32',
    bloodGroup: 'O+',
    allergies: [],
    avatarColor: Colors.familySelf,
    isPrimary: true,
  },
  {
    id: 'mom',
    name: 'Mom',
    relationship: 'Parent',
    age: '62',
    bloodGroup: 'B+',
    allergies: ['Penicillin'],
    avatarColor: Colors.familyParent,
  },
  {
    id: 'dad',
    name: 'Dad',
    relationship: 'Parent',
    age: '65',
    bloodGroup: 'O+',
    allergies: [],
    avatarColor: Colors.familyParent,
  },
];

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export const useMedicineContext = () => {
  const context = useContext(MedicineContext);
  if (!context) {
    throw new Error('useMedicineContext must be used within a MedicineProvider');
  }
  return context;
};

// Helper for scoped storage keys per user
const getStorageKey = (key: string, uid?: string | null) => (uid ? `${key}_${uid}` : key);

export const MedicineProvider: React.FC<{ children: React.ReactNode; firebaseUid?: string | null }> = ({
  children,
  firebaseUid,
}) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(DEFAULT_FAMILY_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('all');
  const [processedAlertIds, setProcessedAlertIds] = useState<Set<string>>(new Set());
  const [isGeneratingAlerts, setIsGeneratingAlerts] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load data from storage whenever firebaseUid changes
  useEffect(() => {
    loadMedicines();
    loadAlerts();
    loadFamilyMembers();
  }, [firebaseUid]);

  // ── Firestore real-time sync ───────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUid) return;

    let isMounted = true;

    // Subscribe to cloud changes
    const unsubscribe = subscribeMedicines(
      firebaseUid,
      (cloudMedicines) => {
        if (!isMounted) return;
        setMedicines(cloudMedicines as Medicine[]);
        AsyncStorage.setItem(
          getStorageKey('medicines', firebaseUid),
          JSON.stringify(cloudMedicines)
        );
      },
      (error) => console.warn('Firestore sync error:', error)
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [firebaseUid]);

  // Generate alerts whenever medicines change
  useEffect(() => {
    if (medicines.length > 0) {
      generateAlerts();
    }
  }, [medicines]);

  // ── Storage Loaders ────────────────────────────────────────────────────────
  const loadMedicines = async () => {
    try {
      const key = getStorageKey('medicines', firebaseUid);
      const storedMedicines = await AsyncStorage.getItem(key);
      if (storedMedicines) {
        setMedicines(JSON.parse(storedMedicines));
      } else {
        setMedicines([]);
      }
    } catch (error) {
      console.error('Error loading medicines:', error);
    }
  };

  const loadAlerts = async () => {
    try {
      const alertKey = getStorageKey('alerts', firebaseUid);
      const storedAlerts = await AsyncStorage.getItem(alertKey);
      if (storedAlerts) {
        const parsedAlerts: Alert[] = JSON.parse(storedAlerts);
        const uniqueAlerts: Alert[] = Array.from(
          new Map<string, Alert>(parsedAlerts.map((alert: Alert) => [alert.id, alert])).values()
        );
        setAlerts(uniqueAlerts);
      } else {
        setAlerts([]);
      }

      const procKey = getStorageKey('processedAlertIds', firebaseUid);
      const storedProcessedAlertIds = await AsyncStorage.getItem(procKey);
      if (storedProcessedAlertIds) {
        setProcessedAlertIds(new Set(JSON.parse(storedProcessedAlertIds)));
      } else {
        setProcessedAlertIds(new Set());
      }
    } catch (error) {
      console.error('Error loading alerts:', error);
    }
  };

  const loadFamilyMembers = async () => {
    try {
      const key = getStorageKey('family_members', firebaseUid);
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFamilyMembers(parsed);
          return;
        }
      }
      // Initialize defaults
      setFamilyMembers(DEFAULT_FAMILY_MEMBERS);
      await AsyncStorage.setItem(key, JSON.stringify(DEFAULT_FAMILY_MEMBERS));
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const saveFamilyMembers = async (members: FamilyMember[]) => {
    try {
      const key = getStorageKey('family_members', firebaseUid);
      await AsyncStorage.setItem(key, JSON.stringify(members));
    } catch (error) {
      console.error('Error saving family members:', error);
    }
  };

  const saveMedicines = async (updatedMedicines: Medicine[]) => {
    try {
      const key = getStorageKey('medicines', firebaseUid);
      await AsyncStorage.setItem(key, JSON.stringify(updatedMedicines));
    } catch (error) {
      console.error('Error saving medicines:', error);
    }
  };

  const saveAlerts = async (updatedAlerts: Alert[]) => {
    try {
      const uniqueAlerts: Alert[] = Array.from(
        new Map<string, Alert>(updatedAlerts.map((alert) => [alert.id, alert])).values()
      );
      const key = getStorageKey('alerts', firebaseUid);
      await AsyncStorage.setItem(key, JSON.stringify(uniqueAlerts));
    } catch (error) {
      console.error('Error saving alerts:', error);
    }
  };

  const saveProcessedAlertIds = async (ids: Set<string>) => {
    try {
      const key = getStorageKey('processedAlertIds', firebaseUid);
      await AsyncStorage.setItem(key, JSON.stringify([...ids]));
    } catch (error) {
      console.error('Error saving processed alert IDs:', error);
    }
  };

  // ── Medicine CRUD ──────────────────────────────────────────────────────────
  const addMedicine = async (medicine: Medicine) => {
    // Check for interactions with existing medicines
    const interactions = findInteractions(medicine.name);

    // Assign to active family member if not specified
    const targetMemberId =
      medicine.patientId || (selectedMemberId !== 'all' ? selectedMemberId : 'self');
    const member = familyMembers.find((m) => m.id === targetMemberId) || familyMembers[0];

    const medicineWithDetails: Medicine = {
      ...medicine,
      patientId: targetMemberId,
      patientName: medicine.patientName || member?.name || 'Myself',
      patientRelationship: medicine.patientRelationship || member?.relationship || 'Self',
      interactions: interactions.length > 0 ? interactions : undefined,
    };

    const updatedMedicines = [...medicines, medicineWithDetails];
    setMedicines(updatedMedicines);
    await saveMedicines(updatedMedicines);

    // Sync to Firestore
    if (firebaseUid) {
      saveMedicineToCloud(firebaseUid, medicineWithDetails);
    }

    // Schedule push notifications for reminder times
    if (medicine.timeToTake && medicine.timeToTake.length > 0) {
      scheduleMedicineReminders({
        medicineId: medicine.id,
        medicineName: medicine.name,
        dosage: medicine.dosage,
        times: medicine.timeToTake,
      });
    }
  };

  const updateMedicine = async (updatedMedicine: Medicine) => {
    // Cancel old reminders before scheduling new ones
    const oldMedicine = medicines.find((m) => m.id === updatedMedicine.id);
    if (oldMedicine?.timeToTake && oldMedicine.timeToTake.length > 0) {
      cancelMedicineReminders(oldMedicine.id, oldMedicine.timeToTake);
    }

    const updatedMedicines = medicines.map((medicine) =>
      medicine.id === updatedMedicine.id ? updatedMedicine : medicine
    );
    setMedicines(updatedMedicines);
    await saveMedicines(updatedMedicines);

    // Sync to Firestore
    if (firebaseUid) {
      saveMedicineToCloud(firebaseUid, updatedMedicine);
    }

    // Schedule new reminders
    if (updatedMedicine.timeToTake && updatedMedicine.timeToTake.length > 0) {
      scheduleMedicineReminders({
        medicineId: updatedMedicine.id,
        medicineName: updatedMedicine.name,
        dosage: updatedMedicine.dosage,
        times: updatedMedicine.timeToTake,
      });
    }
  };

  const deleteMedicine = async (id: string) => {
    const medicine = medicines.find((m) => m.id === id);
    if (medicine?.timeToTake && medicine.timeToTake.length > 0) {
      cancelMedicineReminders(id, medicine.timeToTake);
    }

    const updatedMedicines = medicines.filter((m) => m.id !== id);
    setMedicines(updatedMedicines);
    await saveMedicines(updatedMedicines);

    if (firebaseUid) {
      deleteMedicineFromCloud(firebaseUid, id);
    }

    const updatedAlerts = alerts.filter((alert) => !alert.medicineIds.includes(id));
    setAlerts(updatedAlerts);
    await saveAlerts(updatedAlerts);

    const newProcessedIds = new Set<string>();
    for (const alertId of processedAlertIds) {
      if (!alertId.includes(id)) {
        newProcessedIds.add(alertId);
      }
    }
    setProcessedAlertIds(newProcessedIds);
    await saveProcessedAlertIds(newProcessedIds);
  };

  const markAlertAsRead = async (id: string) => {
    const updatedAlerts = alerts.map((alert) =>
      alert.id === id ? { ...alert, read: true } : alert
    );
    setAlerts(updatedAlerts);
    await saveAlerts(updatedAlerts);
  };

  // ── Family Member Management ───────────────────────────────────────────────
  const addFamilyMember = async (memberData: Omit<FamilyMember, 'id'>): Promise<FamilyMember> => {
    const newId = `fam_${Date.now()}`;
    const avatarColor =
      memberData.avatarColor ||
      (memberData.relationship === 'Spouse'
        ? Colors.familySpouse
        : memberData.relationship === 'Child'
        ? Colors.familyChild
        : memberData.relationship === 'Parent'
        ? Colors.familyParent
        : Colors.familyOther);

    const newMember: FamilyMember = {
      ...memberData,
      id: newId,
      avatarColor,
    };

    const updated = [...familyMembers, newMember];
    setFamilyMembers(updated);
    await saveFamilyMembers(updated);
    return newMember;
  };

  const updateFamilyMember = async (id: string, updates: Partial<FamilyMember>) => {
    const updated = familyMembers.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setFamilyMembers(updated);
    await saveFamilyMembers(updated);

    // If member name changed, update corresponding medicines
    if (updates.name) {
      const updatedMeds = medicines.map((m) =>
        m.patientId === id ? { ...m, patientName: updates.name } : m
      );
      setMedicines(updatedMeds);
      await saveMedicines(updatedMeds);
    }
  };

  const deleteFamilyMember = async (id: string) => {
    if (id === 'self' || familyMembers.length <= 1) return;

    const updated = familyMembers.filter((m) => m.id !== id);
    setFamilyMembers(updated);
    await saveFamilyMembers(updated);

    // Reassign medicines of deleted member to 'self'
    const updatedMeds = medicines.map((m) =>
      m.patientId === id ? { ...m, patientId: 'self', patientName: 'Myself' } : m
    );
    setMedicines(updatedMeds);
    await saveMedicines(updatedMeds);

    if (selectedMemberId === id) {
      setSelectedMemberId('all');
    }
  };

  const getMemberMedicineCount = (memberId: string): number => {
    return medicines.filter((m) => {
      const pid = m.patientId || 'self';
      return pid === memberId;
    }).length;
  };

  // ── Filtered Medicines by Active Family Member ────────────────────────────
  const filteredMedicines = useMemo(() => {
    if (selectedMemberId === 'all') return medicines;
    return medicines.filter((m) => {
      const pid = m.patientId || 'self';
      return pid === selectedMemberId;
    });
  }, [medicines, selectedMemberId]);

  // ── Legacy User Compatibility Adapter ─────────────────────────────────────
  const users: User[] = useMemo(() => {
    return familyMembers.map((m) => ({
      id: m.id,
      name: m.name,
      email: `${m.name.toLowerCase().replace(/\s+/g, '.')}@medifill.app`,
      avatar: undefined,
      isActive: selectedMemberId === m.id || (selectedMemberId === 'all' && m.id === 'self'),
    }));
  }, [familyMembers, selectedMemberId]);

  const activeUser: User | null = useMemo(() => {
    const target = familyMembers.find((m) => m.id === selectedMemberId) || familyMembers[0];
    if (!target) return null;
    return {
      id: target.id,
      name: target.name,
      email: `${target.name.toLowerCase().replace(/\s+/g, '.')}@medifill.app`,
      isActive: true,
    };
  }, [familyMembers, selectedMemberId]);

  const setActiveUserById = async (userId: string) => {
    setSelectedMemberId(userId);
  };

  const addUser = async (user: User) => {
    await addFamilyMember({
      name: user.name,
      relationship: 'Other',
    });
  };

  const updateUser = async (updatedUser: User) => {
    await updateFamilyMember(updatedUser.id, { name: updatedUser.name });
  };

  const deleteUser = async (id: string) => {
    await deleteFamilyMember(id);
  };

  // ── Interactions & Alerts ──────────────────────────────────────────────────
  const findInteractions = (medicineName: string): string[] => {
    const existingNames = medicines.map((m) => m.name);
    return findInteractionsForMedicine(medicineName, existingNames);
  };

  const calculateDailyUsage = (frequency: string): number => {
    if (!frequency) return 1;
    const lowerFreq = frequency.toLowerCase();

    if (lowerFreq.includes('once daily') || lowerFreq.includes('daily') || lowerFreq.includes('day')) {
      return 1;
    } else if (lowerFreq.includes('twice daily') || lowerFreq.includes('two times')) {
      return 2;
    } else if (lowerFreq.includes('three times')) {
      return 3;
    } else if (lowerFreq.includes('four times')) {
      return 4;
    } else if (lowerFreq.includes('every other day') || lowerFreq.includes('alternate day')) {
      return 0.5;
    } else if (lowerFreq.includes('weekly') || lowerFreq.includes('once a week')) {
      return 1 / 7;
    } else {
      return 1;
    }
  };

  const generateAlerts = async () => {
    if (isGeneratingAlerts) return;
    setIsGeneratingAlerts(true);

    try {
      const newAlerts: Alert[] = [];
      const today = new Date();
      const currentProcessedIds = new Set(processedAlertIds);

      // Check for expiry and stock alerts
      medicines.forEach((medicine) => {
        const expiryDate = new Date(medicine.expiryDate);
        if (!isNaN(expiryDate.getTime())) {
          const diffTime = expiryDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const expiryAlertId = `expiry-${medicine.id}`;

          if (diffDays > 0 && diffDays <= 30) {
            const dailyUsage = Math.max(calculateDailyUsage(medicine.frequency), 0.1);
            const daysOfSupply = medicine.currentQuantity / dailyUsage;
            const wasteAmount = Math.round(medicine.currentQuantity - dailyUsage * diffDays);

            if (diffDays < daysOfSupply && wasteAmount > 0) {
              newAlerts.push({
                id: expiryAlertId,
                type: 'expiry',
                title: 'Medicine Will Expire Before Use',
                description: `${medicine.name} will expire in ${diffDays} days. Approximately ${wasteAmount} units will be wasted.`,
                medicineIds: [medicine.id],
                createdAt: new Date().toISOString(),
                read: false,
              });
            } else {
              newAlerts.push({
                id: expiryAlertId,
                type: 'expiry',
                title: 'Medicine Expiring Soon',
                description: `${medicine.name} will expire in ${diffDays} days.`,
                medicineIds: [medicine.id],
                createdAt: new Date().toISOString(),
                read: false,
              });
            }
            currentProcessedIds.add(expiryAlertId);
          }
        }

        // Check for low stock alerts
        if (medicine.totalQuantity > 0) {
          const percentRemaining = (medicine.currentQuantity / medicine.totalQuantity) * 100;
          const stockAlertId = `stock-${medicine.id}`;

          if (percentRemaining <= 20) {
            newAlerts.push({
              id: stockAlertId,
              type: 'stock',
              title: 'Medicine Running Low',
              description: `${medicine.name} is running low (${Math.round(percentRemaining)}% remaining).`,
              medicineIds: [medicine.id],
              createdAt: new Date().toISOString(),
              read: false,
            });
            currentProcessedIds.add(stockAlertId);
          }
        }
      });

      // Check for interactions
      const checkedPairs = new Set<string>();
      for (let i = 0; i < medicines.length; i++) {
        for (let j = i + 1; j < medicines.length; j++) {
          const med1 = medicines[i];
          const med2 = medicines[j];
          const pairKey = [med1.id, med2.id].sort().join('-');
          const interactionAlertId = `interaction-${pairKey}`;

          if (!checkedPairs.has(pairKey)) {
            checkedPairs.add(pairKey);
            const interactions1 = findInteractionsForMedicine(med1.name, [med2.name]);
            if (interactions1.length > 0) {
              newAlerts.push({
                id: interactionAlertId,
                type: 'interaction',
                title: 'Medicine Interaction Warning',
                description: `${med1.name} and ${med2.name} may interact. Please consult your doctor.`,
                medicineIds: [med1.id, med2.id],
                createdAt: new Date().toISOString(),
                read: false,
              });
              currentProcessedIds.add(interactionAlertId);
            }
          }
        }
      }

      // Check reminder alerts for today
      const now = new Date();
      const localDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      medicines.forEach((medicine) => {
        if (medicine.timeToTake && medicine.timeToTake.length > 0) {
          medicine.timeToTake.forEach((time) => {
            if (!time || !time.includes(':')) return;
            const [hours, minutes] = time.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            const reminderTime = new Date();
            reminderTime.setHours(hours, minutes, 0, 0);
            const reminderAlertId = `reminder-${medicine.id}-${time}-${localDateStr}`;

            if (!currentProcessedIds.has(reminderAlertId)) {
              const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
              const diffMinutes = Math.floor(timeDiff / (1000 * 60));

              if (diffMinutes <= 60 && now.getTime() >= reminderTime.getTime()) {
                newAlerts.push({
                  id: reminderAlertId,
                  type: 'reminder',
                  title: 'Time to Take Medicine',
                  description: `It's time to take ${medicine.name} (${medicine.dosage}).`,
                  medicineIds: [medicine.id],
                  createdAt: new Date().toISOString(),
                  read: false,
                });
                currentProcessedIds.add(reminderAlertId);
              }
            }
          });
        }
      });

      // Merge alerts preserving read status
      const existingMap = new Map<string, Alert>(alerts.map((a) => [a.id, a]));
      for (const alert of newAlerts) {
        if (!existingMap.has(alert.id)) {
          existingMap.set(alert.id, alert);
        } else {
          const prev = existingMap.get(alert.id)!;
          existingMap.set(alert.id, { ...alert, read: prev.read });
        }
      }

      const mergedAlerts = Array.from(existingMap.values());
      setAlerts(mergedAlerts);
      await saveAlerts(mergedAlerts);
      setProcessedAlertIds(currentProcessedIds);
      await saveProcessedAlertIds(currentProcessedIds);
    } catch (error) {
      console.error('Error generating alerts:', error);
    } finally {
      setIsGeneratingAlerts(false);
    }
  };

  const getInteractionAlerts = () => alerts.filter((alert) => alert.type === 'interaction');
  const getExpiryAlerts = () => alerts.filter((alert) => alert.type === 'expiry');
  const getStockAlerts = () => alerts.filter((alert) => alert.type === 'stock');

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        filteredMedicines,
        alerts,
        familyMembers,
        selectedMemberId,
        setSelectedMemberId,
        isSyncing,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        loadMedicines,
        markAlertAsRead,
        getInteractionAlerts,
        getExpiryAlerts,
        getStockAlerts,
        addFamilyMember,
        updateFamilyMember,
        deleteFamilyMember,
        getMemberMedicineCount,
        users,
        activeUser,
        addUser,
        updateUser,
        deleteUser,
        setActiveUser: setActiveUserById,
      }}
    >
      {children}
    </MedicineContext.Provider>
  );
};
