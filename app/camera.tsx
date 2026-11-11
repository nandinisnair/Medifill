import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  ImageIcon,
  RotateCcw,
  Pill,
  Sparkles,
  ArrowRight,
  Calendar,
  Package,
  User as UserIcon,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { Colors, Spacing, FontSize, BorderRadius, Shadow } from '../constants/theme';
import { recognizeText, parseOCRText, OCRResult } from '../services/ocrService';
import { useMedicineContext } from '../context/MedicineContext';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [torch, setTorch] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Editable review fields
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medExpiry, setMedExpiry] = useState('');
  const [medQuantity, setMedQuantity] = useState('');
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>('self');

  const { familyMembers, selectedMemberId } = useMedicineContext();
  const cameraRef = useRef<CameraView>(null);

  const hasPermission = permission?.granted ?? null;

  // Initialize selected family member from context
  React.useEffect(() => {
    if (selectedMemberId && selectedMemberId !== 'all') {
      setSelectedFamilyMemberId(selectedMemberId);
    }
  }, [selectedMemberId]);

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      if (!photo) {
        setIsProcessing(false);
        return;
      }

      setCapturedImage(photo.uri);
      await processImage(photo.uri);
    } catch (error) {
      console.error('Capture error:', error);
      setIsProcessing(false);
      Alert.alert('Camera Error', 'Could not capture photo. Please try again.');
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setIsProcessing(true);
        setCapturedImage(result.assets[0].uri);
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      setIsProcessing(false);
    }
  };

  const processImage = async (uri: string) => {
    try {
      let rawText = '';
      try {
        rawText = await recognizeText(uri);
      } catch (err: any) {
        console.warn('OCR error:', err.message);
      }

      if (rawText && rawText.trim().length > 0) {
        const parsed = parseOCRText(rawText);
        setOcrResult(parsed);
        setMedName(parsed.name || '');
        setMedDosage(parsed.dosage || '');
        setMedExpiry(parsed.expiryDate || '');
        setMedQuantity(parsed.quantity || '');
        setShowReviewModal(true);
      } else {
        // No text detected
        Alert.alert(
          'No Text Detected',
          'Could not detect readable medicine text. Ensure the label is clear and well-lit, or proceed to manual entry.',
          [
            {
              text: 'Retake Photo',
              style: 'cancel',
              onPress: () => {
                setCapturedImage(null);
                setOcrResult(null);
              },
            },
            {
              text: 'Enter Details Manually',
              onPress: () => {
                router.navigate('/(tabs)/add');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert(
        'Processing Issue',
        'Could not process image text. Would you like to enter details manually?',
        [
          { text: 'Retake', onPress: () => setCapturedImage(null) },
          { text: 'Enter Manually', onPress: () => router.navigate('/(tabs)/add') },
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptOcr = () => {
    setShowReviewModal(false);
    const chosenMember = familyMembers.find((m) => m.id === selectedFamilyMemberId);

    router.navigate({
      pathname: '/(tabs)/add',
      params: {
        ocrName: medName.trim(),
        ocrDosage: medDosage.trim(),
        ocrExpiry: medExpiry.trim(),
        ocrQuantity: medQuantity.trim(),
        ocrRawText: ocrResult?.rawText || '',
        patientId: selectedFamilyMemberId,
        patientName: chosenMember?.name || 'Myself',
      },
    });
  };

  const handleRetake = () => {
    setShowReviewModal(false);
    setCapturedImage(null);
    setOcrResult(null);
  };

  // ── Web Fallback ───────────────────────────────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.webHeaderTitle}>Scan Prescription</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={styles.webBody}>
          <View style={styles.webCard}>
            <View style={styles.webIconCircle}>
              <Camera size={44} color={Colors.primary} />
            </View>
            <Text style={styles.webTitle}>Medicine Label Scanner</Text>
            <Text style={styles.webDesc}>
              Upload a clear photo of your prescription or medicine box to automatically extract the medicine name, dosage, and expiry.
            </Text>

            {isProcessing ? (
              <View style={styles.processingBlock}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.processingText}>Analyzing medicine label...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.webUploadBtn} onPress={handlePickImage}>
                <ImageIcon size={20} color={Colors.white} />
                <Text style={styles.webUploadText}>Upload Photo</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.manualEntryBtn} onPress={() => router.navigate('/(tabs)/add')}>
              <Text style={styles.manualEntryText}>Enter Details Manually</Text>
            </TouchableOpacity>
          </View>
        </View>

        {renderReviewModal()}
      </SafeAreaView>
    );
  }

  // ── Permission Waiting ─────────────────────────────────────────────────────
  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Permission Not Granted ─────────────────────────────────────────────────
  if (!hasPermission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconCircle}>
            <Camera size={38} color={Colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionDesc}>
            MediFill needs camera access to scan medicine packages and prescription labels.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Allow Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionBackBtn} onPress={() => router.back()}>
            <Text style={styles.permissionBackText}>Enter Details Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Modal Rendering ────────────────────────────────────────────────────────
  function renderReviewModal() {
    return (
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.reviewSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderBadge}>
                <Sparkles size={16} color={Colors.primary} />
                <Text style={styles.sheetHeaderBadgeText}>OCR Detected</Text>
              </View>
              <TouchableOpacity onPress={handleRetake} style={styles.sheetCloseBtn}>
                <X size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetTitle}>Review Scanned Medicine</Text>
            <Text style={styles.sheetSub}>
              Verify the detected fields or make quick corrections before saving.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
              {/* Family Member Assignment */}
              <Text style={styles.inputLabel}>PRESCRIBED FOR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberPillRow}>
                {familyMembers.map((member) => {
                  const isSelected = selectedFamilyMemberId === member.id;
                  return (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.memberPill, isSelected && styles.memberPillActive]}
                      onPress={() => setSelectedFamilyMemberId(member.id)}
                    >
                      <UserIcon
                        size={14}
                        color={isSelected ? Colors.white : member.avatarColor || Colors.primary}
                      />
                      <Text
                        style={[styles.memberPillText, isSelected && styles.memberPillTextActive]}
                      >
                        {member.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Medicine Name */}
              <Text style={styles.inputLabel}>MEDICINE NAME</Text>
              <View style={styles.inputBox}>
                <Pill size={16} color={Colors.primary} />
                <TextInput
                  style={styles.input}
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="e.g. Paracetamol"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>

              {/* Dosage & Quantity Row */}
              <View style={styles.row}>
                <View style={[styles.col, { marginRight: Spacing.sm }]}>
                  <Text style={styles.inputLabel}>DOSAGE</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.input}
                      value={medDosage}
                      onChangeText={setMedDosage}
                      placeholder="e.g. 500mg"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>

                <View style={[styles.col, { marginLeft: Spacing.sm }]}>
                  <Text style={styles.inputLabel}>QUANTITY</Text>
                  <View style={styles.inputBox}>
                    <Package size={16} color={Colors.textSecondary} />
                    <TextInput
                      style={styles.input}
                      value={medQuantity}
                      onChangeText={setMedQuantity}
                      placeholder="e.g. 15"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Expiry Date */}
              <Text style={styles.inputLabel}>EXPIRY DATE</Text>
              <View style={styles.inputBox}>
                <Calendar size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={medExpiry}
                  onChangeText={setMedExpiry}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.retakeBtn} onPress={handleRetake}>
                <RotateCcw size={16} color={Colors.textSecondary} />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptOcr}>
                <Text style={styles.acceptBtnText}>Continue to Add</Text>
                <ArrowRight size={16} color={Colors.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Mobile Camera Screen ───────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
      >
        <SafeAreaView style={styles.overlay}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconCircleBtn}>
              <X size={20} color={Colors.white} />
            </TouchableOpacity>

            <View style={styles.scannerBadge}>
              <Sparkles size={14} color={Colors.primaryLight} />
              <Text style={styles.scannerBadgeText}>Medicine OCR Scanner</Text>
            </View>

            <TouchableOpacity
              onPress={() => setTorch((prev) => !prev)}
              style={[styles.iconCircleBtn, torch && styles.iconCircleActive]}
            >
              {torch ? <Zap size={20} color="#F59E0B" /> : <ZapOff size={20} color={Colors.white} />}
            </TouchableOpacity>
          </View>

          {/* Viewfinder Reticle */}
          <View style={styles.reticleContainer}>
            <View style={styles.reticleBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {isProcessing && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color={Colors.primaryLight} />
                  <Text style={styles.scanningText}>Analyzing label...</Text>
                </View>
              )}
            </View>
            <Text style={styles.reticleHint}>
              Align medicine name, dosage & expiry date within the box
            </Text>
          </View>

          {/* Bottom Bar Controls */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.albumBtn}
              onPress={handlePickImage}
              disabled={isProcessing}
            >
              <ImageIcon size={22} color={Colors.white} />
              <Text style={styles.albumBtnText}>Album</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterBtn, isProcessing && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={isProcessing}
            >
              <View style={styles.shutterInner}>
                <Camera size={28} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualBtn}
              onPress={() => router.navigate('/(tabs)/add')}
              disabled={isProcessing}
            >
              <Text style={styles.manualBtnText}>Manual</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </CameraView>

      {renderReviewModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  scannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  scannerBadgeText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  reticleBox: {
    width: '100%',
    height: 220,
    borderRadius: BorderRadius.lg,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius.md,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius.md,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius.md,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius.md,
  },
  scanningIndicator: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  scanningText: {
    color: Colors.white,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  reticleHint: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.md,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  albumBtn: {
    alignItems: 'center',
    gap: 4,
    width: 60,
  },
  albumBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterDisabled: {
    opacity: 0.5,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
  },
  manualBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // Modal Sheet
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  reviewSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
    maxHeight: '85%',
    ...Shadow.lg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  sheetHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  sheetHeaderBadgeText: {
    color: Colors.primaryDark,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  sheetCloseBtn: {
    padding: Spacing.xs,
  },
  sheetTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  sheetSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  sheetScroll: {
    marginBottom: Spacing.md,
  },
  memberPillRow: {
    marginBottom: Spacing.md,
  },
  memberPill: {
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
  memberPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  memberPillText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  memberPillTextActive: {
    color: Colors.white,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
  },
  col: {
    flex: 1,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  retakeBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    ...Shadow.sm,
  },
  acceptBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },

  // Web Styles
  webHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  webHeaderTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  webBody: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  webCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    maxWidth: 440,
    width: '100%',
    ...Shadow.md,
  },
  webIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  webTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  webDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  webUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  webUploadText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  manualEntryBtn: {
    paddingVertical: Spacing.sm,
  },
  manualEntryText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  processingBlock: {
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.lg,
  },
  processingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // Permission card
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
    backgroundColor: Colors.background,
  },
  permissionIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  permissionBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  permissionBackBtn: {
    paddingVertical: Spacing.sm,
  },
  permissionBackText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
