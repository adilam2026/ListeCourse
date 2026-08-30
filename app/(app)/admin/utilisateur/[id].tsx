import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../../lib/AuthProvider';
import { supabase } from '../../../../lib/supabase';
import { adminDeleteUser, adminResetPassword } from '../../../../lib/adminUsers';
import { colors, fonts, radii } from '../../../../lib/theme';
import type { HouseholdMember, HouseholdRole, Profile } from '../../../../lib/database.types';

type MemberRow = HouseholdMember & { profile: Profile | null };
import PrimaryButton from '../../../../components/PrimaryButton';
import { BackIcon } from '../../../../components/CategoryIcon';

const ROLE_OPTIONS: { key: HouseholdRole; label: string }[] = [
  { key: 'personnel', label: 'Personnel de maison' },
  { key: 'responsable', label: 'Responsable du foyer' },
  { key: 'admin', label: 'Administrateur' },
];

export default function UtilisateurDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { household, member: currentMember } = useAuth();
  const [target, setTarget] = useState<MemberRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingRole, setSavingRole] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [showResetField, setShowResetField] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSelf = target?.profile_id === currentMember?.profile_id;

  useEffect(() => {
    if (!id) return;
    supabase
      .from('household_members')
      .select('*, profile:profiles(*)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setTarget((data as unknown as MemberRow) ?? null);
        setLoading(false);
      });
  }, [id]);

  async function changeRole(role: HouseholdRole) {
    if (!target || isSelf) return;
    setSavingRole(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from('household_members')
      .update({ role })
      .eq('id', target.id)
      .select('*, profile:profiles(*)')
      .single();
    setSavingRole(false);
    if (updateError) {
      setError('Impossible de changer le rôle.');
      return;
    }
    setTarget(data as unknown as MemberRow);
  }

  async function toggleActive() {
    if (!target) return;
    setTogglingActive(true);
    setError(null);
    const { data, error: updateError } = await supabase
      .from('household_members')
      .update({ active: !target.active })
      .eq('id', target.id)
      .select('*, profile:profiles(*)')
      .single();
    setTogglingActive(false);
    if (updateError) {
      setError('Impossible de changer le statut.');
      return;
    }
    setTarget(data as unknown as MemberRow);
  }

  async function submitReset() {
    if (!target || !household?.id) return;
    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setResetLoading(true);
    setError(null);
    const result = await adminResetPassword({
      householdId: household.id,
      memberUserId: target.profile_id,
      newPassword,
    });
    setResetLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNewPassword('');
    setShowResetField(false);
    setNotice('Mot de passe réinitialisé.');
  }

  function confirmDelete() {
    if (!target || !household?.id) return;
    Alert.alert('Supprimer cet accès ?', `${target.profile?.first_name ?? 'Cet utilisateur'} ne pourra plus se connecter.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          const result = await adminDeleteUser({ householdId: household.id, memberUserId: target.profile_id });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          router.back();
        },
      },
    ]);
  }

  if (loading || !target) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backRow} onPress={() => router.back()} hitSlop={8}>
          <BackIcon />
          <Text style={styles.headerTitle}>{target.profile?.first_name ?? 'Utilisateur'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Identifiant</Text>
            <Text style={styles.infoValue}>{target.username ?? '—'}</Text>
          </View>
        </View>

        {isSelf ? (
          <Text style={styles.hint}>Vous ne pouvez pas changer votre propre rôle ni votre propre statut.</Text>
        ) : null}

        <Text style={styles.label}>Rôle</Text>
        {ROLE_OPTIONS.map((opt) => (
          <Pressable
            key={opt.key}
            style={[styles.roleRow, target.role === opt.key && styles.roleRowActive, isSelf && styles.disabled]}
            onPress={() => changeRole(opt.key)}
            disabled={isSelf || savingRole}
          >
            <View style={[styles.radio, target.role === opt.key && styles.radioActive]} />
            <Text style={styles.roleLabel}>{opt.label}</Text>
          </Pressable>
        ))}

        <Pressable
          style={[styles.toggleRow, isSelf && styles.disabled]}
          onPress={toggleActive}
          disabled={isSelf || togglingActive}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Accès actif</Text>
            <Text style={styles.toggleSubtitle}>
              {target.active ? 'Peut se connecter normalement.' : 'Connexion bloquée.'}
            </Text>
          </View>
          <View style={[styles.switchTrack, target.active && styles.switchTrackOn]}>
            <View style={[styles.switchKnob, target.active && styles.switchKnobOn]} />
          </View>
        </Pressable>

        <Text style={[styles.label, { marginTop: 22 }]}>Mot de passe</Text>
        {showResetField ? (
          <>
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Nouveau mot de passe (6 car. min.)"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <PrimaryButton
                label="Annuler"
                variant="outline"
                onPress={() => {
                  setShowResetField(false);
                  setNewPassword('');
                }}
                style={{ flex: 1 }}
              />
              <PrimaryButton label="Valider" onPress={submitReset} loading={resetLoading} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <PrimaryButton
            label="Réinitialiser le mot de passe"
            variant="outline"
            onPress={() => setShowResetField(true)}
          />
        )}

        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!isSelf ? (
          <Pressable style={styles.deleteButton} onPress={confirmDelete}>
            <Text style={styles.deleteLabel}>Supprimer l'accès</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textSoft },
  infoValue: { fontFamily: fonts.bodyExtraBold, fontSize: 14, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12.5, color: colors.textSoft, marginBottom: 10, lineHeight: 18 },
  label: {
    fontFamily: fonts.bodyExtraBold,
    fontSize: 12.5,
    color: colors.textSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  roleRowActive: { borderColor: colors.accent, backgroundColor: '#FCF1E9' },
  disabled: { opacity: 0.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong },
  radioActive: { borderColor: colors.accent, borderWidth: 6 },
  roleLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 15,
    marginTop: 10,
  },
  toggleTitle: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.text },
  toggleSubtitle: { fontFamily: fonts.body, fontSize: 12, color: colors.textSoft, marginTop: 2 },
  switchTrack: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 3 },
  switchTrackOn: { backgroundColor: colors.success },
  switchKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  switchKnobOn: { alignSelf: 'flex-end' },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.text,
    marginBottom: 12,
  },
  notice: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.success, marginTop: 12 },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#C23B3B', marginTop: 12 },
  deleteButton: { alignItems: 'center', marginTop: 30 },
  deleteLabel: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: '#C23B3B' },
});
