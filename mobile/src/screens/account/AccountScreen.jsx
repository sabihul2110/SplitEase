// SplitEase/mobile/src/screens/account/AccountScreen.jsx
//
// Premium Account screen.
// Aesthetic: iOS Settings meets Linear — full-bleed grouped sections,
// hairline dividers, typographic hero, zero card-in-card.
//
// Sections:
//   Hero (avatar + name + stats strip)
//   Profile    — Edit Profile, Change Password
//   Navigate   — Notifications, Activity, Settle Up
//   Preferences — Theme, Check for Updates
//   Session    — Sign Out
//   Danger Zone — Reset My Data
//   About

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import client from "../../api/client"; // still needed for non-auth calls (groups, settlements, resetData)
import * as authApi from "../../api/auth";
import { ENDPOINTS } from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import {
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
  SPACING,
  RADIUS,
  TAB_BAR_HEIGHT,
} from "../../constants/theme";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { Icons } from "../../components/icons";
import { useOTAUpdate } from "../../hooks/useOTAUpdate";
import Toast from "../../components/common/Toast";
import AppAlert from "../../components/common/AppAlert";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtAmt(n) {
  const abs = Math.abs(Number(n || 0));
  return abs % 1 === 0
    ? abs.toLocaleString("en-IN")
    : abs.toLocaleString("en-IN", { minimumFractionDigits: 2 });
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 60 }) {
  const inits = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: Math.round(size * 0.26) },
      ]}
    >
      <Text
        style={[styles.avatarText, { fontSize: Math.round(size * 0.36) }]}
      >
        {inits}
      </Text>
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ title, danger }) {
  return (
    <Text
      style={[styles.sectionLabel, danger && { color: "rgba(239,68,68,0.7)" }]}
    >
      {title}
    </Text>
  );
}

// ─── Full-bleed group container ────────────────────────────────────────────────
function Group({ children, danger }) {
  return (
    <View style={[styles.group, danger && styles.groupDanger]}>
      {children}
    </View>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────
function Row({
  IconComp,
  iconColor,
  iconBg,
  label,
  sub,
  value,
  onPress,
  danger,
  last,
  right,
  chevron = true,
  disabled,
  plainDivider,
}) {
  const Wrap = onPress ? TouchableOpacity : View;
  return (
    <>
      <Wrap
        style={[styles.row, disabled && styles.rowDisabled]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={0.6}
      >
        {IconComp && (
          <View style={[styles.rowIcon, { backgroundColor: iconBg || COLORS.surface2 }]}>
            <IconComp
              size={16}
              color={danger ? COLORS.danger : iconColor || COLORS.text2}
            />
          </View>
        )}
        <View style={styles.rowBody}>
          <Text style={[styles.rowLabel, danger && { color: COLORS.danger }]}>
            {label}
          </Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>
        {right !== undefined ? (
          right
        ) : value ? (
          <Text style={styles.rowValue}>{value}</Text>
        ) : onPress && chevron ? (
          <Icons.chevronRight size={14} color={COLORS.text3} />
        ) : null}
      </Wrap>
      {!last && (
        <View style={plainDivider ? styles.rowDividerFull : styles.rowDivider} />
      )}
    </>
  );
}

// ─── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ msg }) {
  if (!msg) return null;
  return (
    <View style={styles.errorBanner}>
      <Icons.info size={12} color={COLORS.danger} />
      <Text style={styles.errorText}>{msg}</Text>
    </View>
  );
}

// ─── OTA Update Row ────────────────────────────────────────────────────────────
function UpdateRow({ last }) {
  const {
    state,
    isChecking,
    isDownloading,
    isReady,
    progress,
    errorMsg,
    checkForUpdate,
    downloadUpdate,
    restartApp,
  } = useOTAUpdate({ autoCheck: false }); // manual only — don't check on every screen mount

  if (isDownloading) {
    const pct = Math.round((progress || 0) * 100);
    return (
      <>
        <View style={[styles.row, { flexDirection: "column", alignItems: "stretch", gap: 10, paddingVertical: 16 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={[styles.rowIcon, { backgroundColor: "rgba(37,99,235,0.10)" }]}>
              <Icons.refresh size={16} color={COLORS.primaryH} />
            </View>
            <View style={styles.rowBody}>
              <Text style={styles.rowLabel}>Downloading update…</Text>
              <Text style={styles.rowSub}>{pct}% — keep the app open</Text>
            </View>
            <Text style={[styles.rowValue, { color: COLORS.primaryH }]}>{pct}%</Text>
          </View>
          <View style={{ paddingLeft: 36 + SPACING.md }}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          </View>
        </View>
        {!last && <View style={styles.rowDivider} />}
      </>
    );
  }

  if (isReady)
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg="rgba(16,185,129,0.10)"
        iconColor={COLORS.success}
        label="Restart to Update"
        sub="Update ready — tap to apply"
        onPress={restartApp}
        last={last}
        right={<StatusPill label="Ready" color={COLORS.success} bg="rgba(16,185,129,0.10)" />}
      />
    );

  if (state === "available")
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg="rgba(37,99,235,0.10)"
        iconColor={COLORS.primaryH}
        label="Update Available"
        sub="New version ready to download"
        onPress={downloadUpdate}
        last={last}
        right={<StatusPill label="Download" color={COLORS.primaryH} bg="rgba(37,99,235,0.10)" />}
      />
    );

  if (state === "error")
    return (
      <Row
        IconComp={Icons.refresh}
        iconBg="rgba(239,68,68,0.10)"
        iconColor={COLORS.danger}
        label="Check failed"
        sub={errorMsg || "Could not reach update server"}
        onPress={checkForUpdate}
        last={last}
        right={<StatusPill label="Retry" color={COLORS.danger} bg="rgba(239,68,68,0.10)" />}
      />
    );

  if (state === "up_to_date")
    return (
      <Row
        IconComp={Icons.checkCircle}
        iconBg="rgba(16,185,129,0.10)"
        iconColor={COLORS.success}
        label="You're up to date"
        sub="Check again anytime"
        onPress={checkForUpdate}
        last={last}
        right={<StatusPill label="✓ Latest" color={COLORS.success} bg="rgba(16,185,129,0.10)" />}
      />
    );

  if (isChecking)
    return (
      <>
        <View style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: COLORS.surface2 }]}>
            <ActivityIndicator size="small" color={COLORS.primaryH} />
          </View>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>Checking for updates…</Text>
            <Text style={styles.rowSub}>Contacting update server</Text>
          </View>
        </View>
        {!last && <View style={styles.rowDivider} />}
      </>
    );

  return (
    <Row
      IconComp={Icons.refresh}
      iconBg={COLORS.surface2}
      iconColor={COLORS.text2}
      label="Check for Updates"
      sub="Tap to check for the latest version"
      onPress={checkForUpdate}
      last={last}
    />
  );
}

// ─── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ label, color, bg }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: bg, borderColor: color + "44" }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Edit Profile modal ────────────────────────────────────────────────────────
function EditProfileModal({ user, visible, onClose, onSave }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    upi_id: user?.upi_id || "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError("");
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    try {
      // const { data } = await client.put(ENDPOINTS.updateMe, {
      //   name: form.name.trim(),
      //   email: form.email.trim(),
      //   upi_id: form.upi_id.trim() || null,
      // });
      const { data } = await authApi.updateMe({
        name: form.name.trim(),
        email: form.email.trim(),
        upi_id: form.upi_id.trim() || null,
      });
      onSave(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.modalScrim} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.sheetCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.close size={14} color={COLORS.text2} />
            </TouchableOpacity>
          </View>
          <ErrorBanner msg={error} />
          <View style={{ gap: SPACING.md }}>
            <Input
              label="Full Name"
              value={form.name}
              onChangeText={(v) => set("name", v)}
              placeholder="Display name"
              autoCapitalize="words"
            />
            <Input
              label="Email"
              value={form.email}
              onChangeText={(v) => set("email", v)}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <Input
              label="UPI ID (optional)"
              value={form.upi_id}
              onChangeText={(v) => set("upi_id", v)}
              placeholder="name@upi"
              hint="Used for settlement links"
            />
          </View>
          <View style={styles.sheetActions}>
            <Button title="Cancel" onPress={onClose} variant="ghost" fullWidth />
            <Button
              title={saving ? "Saving…" : "Save"}
              onPress={submit}
              loading={saving}
              fullWidth
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


// ─── Change Password modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ visible, onClose, userEmail, onSuccess }) {
  const [form, setForm] = useState({ current: "", newPwd: "", confirm: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [step, setStep] = useState("idle");

  React.useEffect(() => {
    if (visible) {
      setForm({ current: "", newPwd: "", confirm: "" });
      setError("");
      setSaving(false);
      setSendingReset(false);
      setStep("idle");
    }
  }, [visible]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  function validate() {
    if (!form.current) return "Current password is required.";
    if (form.newPwd.length < 6) return "New password must be at least 6 characters.";
    if (form.newPwd !== form.confirm) return "Passwords don't match.";
    if (form.current === form.newPwd) return "New password must differ from current.";
    return null;
  }

  async function submit() {
    setError("");
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    try {
      await authApi.changePassword({
        current_password: form.current,
        new_password: form.newPwd,
        confirm_password: form.confirm,
      });
      setStep("success");
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMagicLink() {
    setSendingReset(true);
    setError("");
    try {
      await authApi.forgotPassword(userEmail);
      setStep("success");
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to send reset link.");
      setStep("idle");
    } finally {
      setSendingReset(false);
    }
  }

  const pct = Math.min((form.newPwd.length || 0) / 12, 1);
  const barClr =
    form.newPwd.length === 0 ? COLORS.border2
    : form.newPwd.length < 6 ? COLORS.danger
    : form.newPwd.length < 10 ? COLORS.warning
    : COLORS.success;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={styles.modalScrim} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {step === "success" ? "Done" : "Change Password"}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.sheetCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icons.close size={14} color={COLORS.text2} />
            </TouchableOpacity>
          </View>
          
          <ErrorBanner msg={error} />

          {/* STATE 1: DEFAULT FORM */}
          {step === "idle" && (
            <>
              <View style={{ gap: SPACING.md }}>
                <View>
                  <Input
                    label="Current Password"
                    value={form.current}
                    onChangeText={(v) => set("current", v)}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    onPress={() => setStep("confirm")}
                    style={{ alignSelf: "flex-end", marginTop: 8 }}
                  >
                    <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.primary, fontWeight: FONT_WEIGHT.medium }}>
                      Forgot current password?
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={{ gap: 6 }}>
                  <Input
                    label="New Password"
                    value={form.newPwd}
                    onChangeText={(v) => set("newPwd", v)}
                    secureTextEntry
                    placeholder="Minimum 6 characters"
                  />
                  {form.newPwd.length > 0 && (
                    <View style={styles.strengthTrack}>
                      <View
                        style={[
                          styles.strengthFill,
                          { width: `${pct * 100}%`, backgroundColor: barClr },
                        ]}
                      />
                    </View>
                  )}
                </View>
                <Input
                  label="Confirm New Password"
                  value={form.confirm}
                  onChangeText={(v) => set("confirm", v)}
                  secureTextEntry
                  error={
                    form.confirm.length > 0 && form.newPwd !== form.confirm
                      ? "Passwords don't match"
                      : undefined
                  }
                />
              </View>
              <View style={styles.sheetActions}>
                <Button title="Cancel" onPress={onClose} variant="ghost" fullWidth />
                <Button
                  title={saving ? "Updating…" : "Update"}
                  onPress={submit}
                  loading={saving}
                  fullWidth
                />
              </View>
            </>
          )}

          {/* STATE 2: CONFIRM RESET MAGIC LINK */}
          {step === "confirm" && (
            <View style={{ gap: SPACING.md, paddingVertical: SPACING.xs }}>
              <View>
                <Text style={{ fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.text }}>
                  Send reset link?
                </Text>
                <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.text2, marginTop: 4, lineHeight: 20 }}>
                  We'll send a password reset link to {userEmail}. You can safely close this app while you check your inbox.
                </Text>
              </View>
              <View style={styles.sheetActions}>
                <Button title="Cancel" onPress={() => setStep("idle")} variant="ghost" fullWidth />
                <Button
                  title={sendingReset ? "Sending…" : "Send Link"}
                  onPress={handleSendMagicLink}
                  loading={sendingReset}
                  fullWidth
                />
              </View>
            </View>
          )}

          {/* STATE 3: SUCCESS CONFIRMATION */}
          {step === "success" && (
            <View style={{ alignItems: "center", gap: SPACING.md, paddingVertical: SPACING.md }}>
              <View style={{ width: 48, height: 48, borderRadius: RADIUS.full, backgroundColor: "rgba(16,185,129,0.10)", alignItems: "center", justifyContent: "center" }}>
                <Icons.checkCircle size={24} color={COLORS.success} />
              </View>
              <Text style={{ fontSize: FONT_SIZE.sm, color: COLORS.text2, textAlign: "center", paddingHorizontal: SPACING.md, lineHeight: 20 }}>
                {form.newPwd.length > 0 
                  ? "Your password has been changed successfully."
                  : "A secure link has been sent. Check your inbox to reset your password."}
              </Text>
              <Button title="Done" onPress={onClose} fullWidth style={{ marginTop: SPACING.sm }} />
            </View>
          )}

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Danger Zone ───────────────────────────────────────────────────────────────
function DangerZone({ onAlert }) {
  const { logout } = useAuth();
  const [step, setStep] = useState("idle");
  const [pending, setPending] = useState([]);
  const [hasDebts, setHasDebts] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    setLoading(true);
    try {
      const r = await client.post(ENDPOINTS.resetData);
      if (r.data.status === "pending_settlements") {
        setPending(r.data.pending || []);
        setHasDebts(r.data.has_debts === true);
        setStep("pending");
      } else {
        setStep("done");
      }
    } catch (e) {
      const isOffline = !e.response;
      onAlert({
        title: isOffline ? "Network Error" : "Error",
        message: isOffline 
          ? "Please check your internet connection and try again." 
          : e.response?.data?.detail || "Something went wrong.",
        buttons: [{ text: "OK", onPress: () => onAlert(null) }]
      });
      setStep("idle");
    } finally {
      setLoading(false);
    }
  }

  async function handleForceReset() {
    setLoading(true);
    try {
      await client.post(ENDPOINTS.resetData + "/force");
      setStep("done");
    } catch (e) {
      const isOffline = !e.response;
      onAlert({
        title: isOffline ? "Network Error" : "Error",
        message: isOffline 
          ? "Please check your internet connection and try again." 
          : e.response?.data?.detail || "Something went wrong.",
        buttons: [{ text: "OK", onPress: () => onAlert(null) }]
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === "done")
    return (
      <View style={styles.inlineBlock}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icons.checkCircle size={15} color={COLORS.success} />
          <Text style={[styles.rowLabel, { color: COLORS.success }]}>
            Data reset complete
          </Text>
        </View>
        <Text style={[styles.rowSub, { marginTop: 4 }]}>
          Your financial data has been cleared.
        </Text>
        <TouchableOpacity onPress={logout} style={{ marginTop: SPACING.md }}>
          <Text
            style={{
              color: COLORS.primaryH,
              fontWeight: FONT_WEIGHT.semibold,
              fontSize: FONT_SIZE.sm,
            }}
          >
            Sign out now
          </Text>
        </TouchableOpacity>
      </View>
    );

  if (step === "pending")
    return (
      <View style={styles.inlineBlock}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Icons.info size={15} color={COLORS.warning} />
          <Text style={[styles.rowLabel, { color: COLORS.warning }]}>
            Unsettled balances
          </Text>
        </View>
        <Text style={[styles.rowSub, { marginBottom: SPACING.sm }]}>
          {hasDebts
            ? "You owe money to the following. Settle up before resetting:"
            : "The following people owe you money. Resetting will forgive these amounts:"}
        </Text>
        {pending.map((g, idx) => (
          <View key={g.group_id ?? g.id ?? idx} style={styles.pendingRow}>
            <Text style={styles.rowSub}>
              {g.group_name || g.counterparty || g.debt_type || "Unknown"}
            </Text>
            <Text
              style={{
                color: g.net_balance > 0 ? COLORS.success : COLORS.danger,
                fontWeight: FONT_WEIGHT.bold,
                fontSize: FONT_SIZE.sm,
              }}
            >
              {g.net_balance > 0 ? "+" : ""}₹{fmtAmt(g.net_balance)}
            </Text>
          </View>
        ))}
        <View style={[styles.inlineActions, { marginTop: SPACING.md }]}>
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => setStep("idle")}
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
          {!hasDebts && (
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => setStep("force_confirm")}
            >
              <Text style={styles.dangerBtnText}>Reset anyway</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );

  if (step === "force_confirm")
    return (
      <View style={styles.inlineBlock}>
        <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
          This cannot be undone.
        </Text>
        <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>
          All your data will be permanently deleted.
        </Text>
        <View style={styles.inlineActions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep("idle")}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleForceReset}
            disabled={loading}
          >
            <Text style={styles.dangerBtnText}>
              {loading ? "Resetting…" : "Yes, wipe my data"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  if (step === "confirm")
    return (
      <View style={styles.inlineBlock}>
        <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
          Reset all your data?
        </Text>
        <Text style={[styles.rowSub, { marginTop: 4, marginBottom: SPACING.md }]}>
          Permanently deletes all expenses, income, loans and borrows. Your
          account stays active.
        </Text>
        <View style={styles.inlineActions}>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => setStep("idle")}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={handleReset}
            disabled={loading}
          >
            <Text style={styles.dangerBtnText}>
              {loading ? "Checking…" : "Reset my data"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );

  // idle
  return (
    <Row
      IconComp={Icons.trash}
      iconBg="rgba(239,68,68,0.10)"
      iconColor={COLORS.danger}
      label="Reset My Data"
      sub="Delete all expenses, income, loans and group data"
      onPress={() => setStep("confirm")}
      danger
      last
    />
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AccountScreen() {
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation();

  const [groups, setGroups] = useState([]);
  const [netBalance, setNetBalance] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const [toast, setToast] = useState({ msg: '', type: 'success' });

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(p => ({ ...p, msg: '' })), 3000);
  }
  const [alert, setAlert] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function loadStats() {
        try {
          const { data: groupList } = await client.get(ENDPOINTS.groups);
          setGroups(groupList);
          if (!groupList.length) { setNetBalance(0); return; }
          const { data: bulk } = await client.post(ENDPOINTS.settlementsBulk, {
            group_ids: groupList.map((g) => g.group_id),
          });
          let owe = 0, owed = 0;
          Object.values(bulk).forEach((rows) => {
            const myRow = rows.find((s) => s.user_id === user?.user_id);
            if (!myRow) return;
            const net = Number(myRow.net_balance);
            if (net < 0) owe += Math.abs(net);
            if (net > 0) owed += net;
          });
          setNetBalance(owed - owe);
        } catch {
          setNetBalance(null);
        }
      }
      loadStats();
    }, [user?.user_id])
  );

  const netColor =
    netBalance === null
      ? COLORS.text2
      : netBalance > 0
      ? COLORS.success
      : netBalance < 0
      ? COLORS.danger
      : COLORS.text2;

  const netLabel =
    netBalance === null
      ? "—"
      : netBalance > 0
      ? `+₹${fmtAmt(netBalance)}`
      : netBalance < 0
      ? `-₹${fmtAmt(Math.abs(netBalance))}`
      : "₹0";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>

      {/* ── Nav bar ── */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          style={styles.navBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icons.back size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Account</Text>
        <TouchableOpacity
          onPress={() => setShowEdit(true)}
          style={styles.navBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icons.edit size={16} color={COLORS.text2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 56 + TAB_BAR_HEIGHT }}
      >

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Avatar name={user?.name} size={60} />
            <View style={styles.heroMeta}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={styles.heroName}>{user?.name}</Text>
                {user?.role === "admin" && (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>admin</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroEmail}>{user?.email}</Text>
              {user?.upi_id ? (
                <Text style={styles.heroUpi}>{user.upi_id}</Text>
              ) : null}
            </View>
          </View>

          {/* Stats strip — inset, no border */}
          <View style={styles.statsStrip}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{groups.length}</Text>
              <Text style={styles.statLabel}>GROUPS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: netColor }]}>
                {netLabel}
              </Text>
              <Text style={styles.statLabel}>NET BALANCE</Text>
            </View>
          </View>
        </View>

        {/* ── Email verification banner ── */}
        {user?.email_verified === false && (
          <>
            <SectionLabel title="ACTION REQUIRED" />
            <Group danger>
              <Row
                IconComp={Icons.info}
                iconBg="rgba(245,158,11,0.10)"
                iconColor="#f59e0b"
                label="Verify your email"
                sub="Tap to complete email verification"
                onPress={() => navigation.navigate("VerifyEmail")}
                last
              />
            </Group>
          </>
        )}

        {/* ── Profile ── */}
        <SectionLabel title="PROFILE" />
        <Group>
          <Row
            IconComp={Icons.edit}
            iconBg="rgba(37,99,235,0.12)"
            iconColor={COLORS.primaryH}
            label="Edit Profile"
            sub="Name, email, UPI ID"
            onPress={() => setShowEdit(true)}
          />
          <Row
            IconComp={Icons.lock}
            iconBg="rgba(124,58,237,0.12)"
            iconColor="#a78bfa"
            label="Change Password"
            sub="Update login credentials"
            onPress={() => setShowPwd(true)}
            last
          />
        </Group>

        {/* ── Navigate ── */}
        <SectionLabel title="NAVIGATE" />
        <Group>
          <Row
            IconComp={Icons.bell}
            iconBg="rgba(239,68,68,0.10)"
            iconColor="#f87171"
            label="Notifications"
            sub="Reminders and alerts"
            onPress={() => navigation.navigate("Notifications")}
          />
          <Row
            IconComp={Icons.activity}
            iconBg="rgba(249,115,22,0.10)"
            iconColor="#fb923c"
            label="Activity"
            sub="Complete financial timeline"
            onPress={() => navigation.navigate("More", { screen: "Activity" })}
          />
          <Row
            IconComp={Icons.settlements}
            iconBg="rgba(16,185,129,0.10)"
            iconColor={COLORS.success}
            label="Settle Up"
            sub="View and clear group balances"
            onPress={() => navigation.navigate("More", { screen: "Settlements" })}
            last
          />
        </Group>

        {/* ── Preferences ── */}
        <SectionLabel title="PREFERENCES" />
        <Group>
          <Row
            IconComp={Icons.moon}
            iconBg={COLORS.surface2}
            iconColor={COLORS.text2}
            label="Theme"
            sub="Always dark on mobile"
            chevron={false}
            right={
              <View style={styles.themePill}>
                <Text style={styles.themePillText}>Dark</Text>
              </View>
            }
          />
          <UpdateRow last />
        </Group>

        {/* ── Session ── */}
        <SectionLabel title="SESSION" />
        <Group danger>
          {!logoutConfirm ? (
            <Row
              IconComp={Icons.logout}
              iconBg="rgba(239,68,68,0.10)"
              iconColor={COLORS.danger}
              label="Sign Out"
              sub="Sign out of this device"
              onPress={() => setLogoutConfirm(true)}
              danger
              last
            />
          ) : (
            <View style={[styles.row, { flexDirection: "column", alignItems: "flex-start", gap: SPACING.md }]}>
              <View>
                <Text style={[styles.rowLabel, { color: COLORS.danger }]}>
                  Confirm sign out?
                </Text>
                <Text style={[styles.rowSub, { marginTop: 3 }]}>
                  You'll need to log in again.
                </Text>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={() => setLogoutConfirm(false)}
                >
                  <Text style={styles.ghostBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerBtn} onPress={logout}>
                  <Text style={styles.dangerBtnText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </Group>

        {/* ── Danger Zone ── */}
        <SectionLabel title="DANGER ZONE" danger />
        <Group danger>
          <DangerZone onAlert={setAlert} />
        </Group>


      </ScrollView>
      
      <Toast config={toast} />

      <EditProfileModal
        user={user}
        visible={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={async (freshUser) => {
          await updateUser(freshUser);
          showToast("Profile updated");
        }}
      />
      <ChangePasswordModal
        visible={showPwd}
        onClose={() => setShowPwd(false)}
        userEmail={user?.email}
        onSuccess={() => showToast("Password changed")}
      />
      <AppAlert config={alert} />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

  // Nav
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navBtn: {
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.text,
    letterSpacing: 0.1,
  },

  // Hero
  hero: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xl,
    paddingBottom: 0,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  avatar: {
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    fontWeight: FONT_WEIGHT.extrabold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  heroMeta: { flex: 1, gap: 4 },
  heroName: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroEmail: { fontSize: FONT_SIZE.sm, color: COLORS.text2 },
  heroUpi: { fontSize: FONT_SIZE.xs, color: COLORS.text3 },
  adminBadge: {
    backgroundColor: "rgba(37,99,235,0.12)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.22)",
  },
  adminBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primaryH,
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  statItem: { flex: 1, alignItems: "center", gap: 5 },
  statValue: {
    fontSize: FONT_SIZE["2xl"],
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.8,
    color: COLORS.text3,
    textTransform: "uppercase",
  },
  statDivider: {
    width: 1,
    height: 38,
    backgroundColor: COLORS.border,
    alignSelf: "center",
  },

  // Section label
  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: COLORS.text3,
    paddingHorizontal: SPACING.base + 4,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xs + 2,
  },

  // Group
  group: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  groupDanger: {
    borderColor: "rgba(239,68,68,0.18)",
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.base,
    paddingVertical: 13,
    gap: SPACING.md,
    minHeight: 52,
  },
  rowDisabled: { opacity: 0.5 },
  rowDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: SPACING.base + 36 + SPACING.md,
  },
  // Full-width divider for rows without a leading icon (e.g. About section)
  rowDividerFull: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.text,
  },
  rowSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.text3,
    marginTop: 2,
    lineHeight: 16,
  },
  rowValue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.medium,
  },

  // Theme pill
  themePill: {
    backgroundColor: "rgba(37,99,235,0.10)",
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.22)",
  },
  themePillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primaryH,
  },

  // Status pill
  statusPill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  // OTA progress
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
    marginTop: 2,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: COLORS.primaryH,
  },

  // Inline block (danger zone states)
  inlineBlock: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.base,
  },
  pendingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  inlineActions: { flexDirection: "row", gap: SPACING.sm },
  ghostBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
  },
  ghostBtnText: {
    color: COLORS.text2,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },
  dangerBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.danger,
  },
  dangerBtnText: {
    color: COLORS.white,
    fontWeight: FONT_WEIGHT.semibold,
    fontSize: FONT_SIZE.sm,
  },

  // Password strength
  strengthTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    overflow: "hidden",
  },
  strengthFill: { height: "100%", borderRadius: 2 },

  // Modals
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    gap: SPACING.base,
    paddingBottom: Platform.OS === "ios" ? 40 : SPACING.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border2,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: SPACING.xs,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xs,
  },
  sheetTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.text,
  },
  sheetCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetActions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },

  // Error banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.22)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
  },
  errorText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.danger,
    flex: 1,
  },
});