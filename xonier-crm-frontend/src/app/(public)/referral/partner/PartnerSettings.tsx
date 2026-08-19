"use client";

import { useRef, useState } from "react";
import { Card, Eyebrow, PrimaryButton, GhostButton } from "../shared/Primitives";
import { useTranslation } from "react-i18next";
import {
  Check,
  Loader2,
  UploadCloud,
  FileText,
  Trash2,
  UserPlus,
  Mail,
  X,
  Users,
    MessageSquare,
  MessageCircle,
  Bell,
} from "lucide-react";


/* ------------------------------------------------------------------ */
/* Field                                                                */
/* ------------------------------------------------------------------ */

function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="mb-3 flex flex-col gap-1.5 text-xs text-text-2">
      {label}
      <input
        {...props}
        className={`rounded-[7px] border outline-none bg-paper-2 px-2.5 py-2 text-[12.5px] text-text-1 focus:border-slate-400 ${
          error ? "border-red-400" : "border-slate-300"
        }`}
      />
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle — now controlled by parent so preferences can be persisted   */
/* ------------------------------------------------------------------ */

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 py-2.5 text-[13px] last:border-b-0">
      <span>{label}</span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`relative h-[19px] w-[34px] flex-shrink-0 rounded-full transition-colors ${
          on ? "bg-teal" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-[15px] w-[15px] rounded-full bg-white transition-transform ${
            on ? "translate-x-[15px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

type NotificationKey = "newClient" | "tierUpgrade" | "payoutCompleted" | "clientChurn";
type DigestMode = "realtime" | "daily" | "weekly";

type UploadedDoc = {
  id: string;
  name: string;
  sizeLabel: string;
  uploadedAt: string;
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "Partner Admin" | "Partner User";
};
  type NotificationChannel = "email" | "sms" | "whatsapp" | "inApp";

type InviteRole = "Partner User" | "Partner Admin";

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function PartnerSettings() {
  const { t } = useTranslation();

  /* ------------------------- Profile form ------------------------- */

  const [profile, setProfile] = useState({
    referralCode: "XONIER-JGS-2026",
    contactEmail: "rashi.wadhwa@jeevantglobal.com",
    phone: "+91 98XXX XXXXX",
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);



const [channels, setChannels] = useState<Record<NotificationChannel, boolean>>({
  email: true,
  sms: false,
  whatsapp: true,
  inApp: true,
});

function toggleChannel(channel: NotificationChannel, checked: boolean) {
  setChannels((prev) => ({ ...prev, [channel]: checked }));
  setNotifsSaved(false);
}

  /* ------------------------ Payout details ------------------------ */

  const [payout, setPayout] = useState({
    accountHolderName: "",
    accountNumber: "",
  });
  const [payoutErrors, setPayoutErrors] = useState<Record<string, string>>({});
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);

  /* --------------------- Notification prefs ------------------------ */

  const [notifs, setNotifs] = useState<Record<NotificationKey, boolean>>({
    newClient: true,
    tierUpgrade: true,
    payoutCompleted: true,
    clientChurn: false,
  });
  const [digestMode, setDigestMode] = useState<DigestMode>("realtime");
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [notifsSaved, setNotifsSaved] = useState(false);
  const [inviteName, setInviteName] = useState("");
const [inviteRole, setInviteRole] = useState<InviteRole>("Partner User");

  /* ------------------------------ KYC ------------------------------ */

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<UploadedDoc[]>([
    { id: "1", name: "Signed_Partner_Agreement.pdf", sizeLabel: "1.2 MB", uploadedAt: "2026-01-10" },
    { id: "2", name: "PAN_Card.pdf", sizeLabel: "320 KB", uploadedAt: "2026-01-10" },
  ]);

  /* ---------------------------- Team --------------------------------*/

  const [team, setTeam] = useState<TeamMember[]>([
    { id: "1", name: "Rashi Wadhwa", email: "rashi.wadhwa@jeevantglobal.com", role: "Partner Admin" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteError, setInviteError] = useState("");

  /* ---------------------------- Handlers ---------------------------- */

  function updateProfile<K extends keyof typeof profile>(key: K, value: string) {
    setProfile((p) => ({ ...p, [key]: value }));
    setProfileSaved(false);
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function handleSaveProfile() {
    const errors: Record<string, string> = {};
    if (!profile.contactEmail || !validateEmail(profile.contactEmail)) {
      errors.contactEmail = t("partner.settings.errors.invalidEmail", { defaultValue: "Enter a valid email" });
    }
    if (!profile.phone || profile.phone.replace(/\D/g, "").length < 10) {
      errors.phone = t("partner.settings.errors.invalidPhone", { defaultValue: "Enter a valid phone number" });
    }
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }, 700);
  }

  function updatePayout<K extends keyof typeof payout>(key: K, value: string) {
    setPayout((p) => ({ ...p, [key]: value }));
    setPayoutSaved(false);
  }

  function handleSavePayout() {
    const errors: Record<string, string> = {};
    if (!payout.accountHolderName.trim()) {
      errors.accountHolderName = t("partner.settings.errors.required", { defaultValue: "This field is required" });
    }
    if (!payout.accountNumber || payout.accountNumber.replace(/\D/g, "").length < 8) {
      errors.accountNumber = t("partner.settings.errors.invalidAccount", { defaultValue: "Enter a valid account number" });
    }
    setPayoutErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPayout(true);
    setTimeout(() => {
      setSavingPayout(false);
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 2500);
    }, 700);
  }

  function toggleNotif(key: NotificationKey, val: boolean) {
    setNotifs((n) => ({ ...n, [key]: val }));
    setNotifsSaved(false);
  }

 function handleSaveNotifs() {
  setSavingNotifs(true);
  // In production, save both notifs, channels, and digestMode to backend
  setTimeout(() => {
    setSavingNotifs(false);
    setNotifsSaved(true);
    setTimeout(() => setNotifsSaved(false), 2500);
  }, 600);
}

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newDocs: UploadedDoc[] = Array.from(files).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      sizeLabel: `${(f.size / 1024).toFixed(0)} KB`,
      uploadedAt: new Date().toISOString().slice(0, 10),
    }));
    setDocs((prev) => [...newDocs, ...prev]);
    e.target.value = "";
  }

  function removeDoc(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

function handleInvite() {
  if (!inviteName.trim()) {
    setInviteError(t("partner.settings.errors.nameRequired", { defaultValue: "Name is required" }));
    return;
  }
  if (!validateEmail(inviteEmail)) {
    setInviteError(t("partner.settings.errors.invalidEmail", { defaultValue: "Enter a valid email" }));
    return;
  }
  if (team.some((m) => m.email.toLowerCase() === inviteEmail.toLowerCase())) {
    setInviteError(t("partner.settings.errors.alreadyInvited", { defaultValue: "This person is already on your team" }));
    return;
  }
  setTeam((prev) => [
    ...prev,
    { id: Date.now().toString(), name: inviteName, email: inviteEmail, role: inviteRole },
  ]);
  setInviteName("");
  setInviteEmail("");
  setInviteRole("Partner User");
  setInviteError("");
}

  function removeMember(id: string) {
    setTeam((prev) => prev.filter((m) => m.id !== id));
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div>
      <Eyebrow>{t("partner.settings.eyebrow")}</Eyebrow>
      <h2 className="mb-4.5 text-base text-slate-600">{t("nav.settings")}</h2>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="grid grid-cols-1 gap-5  ">
            {/* ------------------------- Profile & Payout ------------------------- */}
        <Card>
          <h2 className="mb-3 text-base">{t("partner.settings.profile")}</h2>
          <Field label={t("partner.settings.referralCode")} defaultValue={profile.referralCode} readOnly />
          <Field
            label={t("partner.settings.contactEmail")}
            value={profile.contactEmail}
            error={profileErrors.contactEmail}
            onChange={(e) => updateProfile("contactEmail", e.target.value)}
          />
          <Field
            label={t("partner.settings.phone")}
            value={profile.phone}
            error={profileErrors.phone}
            onChange={(e) => updateProfile("phone", e.target.value)}
          />

          <div className="mt-1 flex items-center gap-3">
            <PrimaryButton onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> {t("common.saving", { defaultValue: "Saving..." })}
                </span>
              ) : (
                t("common.saveChanges")
              )}
            </PrimaryButton>
            {profileSaved && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <Check size={14} /> {t("common.saved", { defaultValue: "Saved" })}
              </span>
            )}
          </div>

          <h2 className="mb-3 mt-4.5 text-base">{t("partner.settings.payoutDetails")}</h2>
          <Field
            label={t("partner.settings.accountHolderName")}
            placeholder={t("partner.settings.accountHolderPlaceholder")}
            value={payout.accountHolderName}
            error={payoutErrors.accountHolderName}
            onChange={(e) => updatePayout("accountHolderName", e.target.value)}
          />
          <Field
            label={t("partner.settings.accountNumber")}
            placeholder="•••• •••• ••••"
            value={payout.accountNumber}
            error={payoutErrors.accountNumber}
            onChange={(e) => updatePayout("accountNumber", e.target.value.replace(/[^\d]/g, ""))}
          />

          <div className="mt-1 flex items-center gap-3">
            <PrimaryButton onClick={handleSavePayout} disabled={savingPayout}>
              {savingPayout ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin" /> {t("common.saving", { defaultValue: "Saving..." })}
                </span>
              ) : (
                t("common.saveChanges")
              )}
            </PrimaryButton>
            {payoutSaved && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                <Check size={14} /> {t("common.saved", { defaultValue: "Saved" })}
              </span>
            )}
          </div>
        </Card>

              {/* ------------------------- KYC / Documents ------------------------- */}
        <Card>
          <h2 className="mb-3 text-base">
            {t("partner.settings.kyc", { defaultValue: "KYC & Agreement Documents" })}
          </h2>
          <p className="mb-3 text-xs text-text-2">
            {t("partner.settings.kycHint", {
              defaultValue: "Upload your signed agreement, PAN/GST, and bank proof for payout verification.",
            })}
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mb-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 py-6 text-xs text-text-2 transition hover:border-teal hover:bg-slate-50"
          >
            <UploadCloud size={20} className="text-teal" />
            {t("partner.settings.uploadPrompt", { defaultValue: "Click to upload or drag files here" })}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          />

          <div className="space-y-2">
            {docs.length === 0 && (
              <p className="text-xs text-text-2">
                {t("partner.settings.noDocs", { defaultValue: "No documents uploaded yet." })}
              </p>
            )}
            {docs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText size={14} className="shrink-0 text-teal" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-1">{doc.name}</p>
                    <p className="text-[10.5px] text-text-2">
                      {doc.sizeLabel} • {doc.uploadedAt}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeDoc(doc.id)}
                  className="shrink-0 rounded-md p-1 text-text-2 hover:bg-red-50 hover:text-red-600"
                  title="Remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        </div>
        <div  className="grid grid-cols-1 gap-5  ">

        
      

    {/* ------------------------- Notifications ------------------------- */}
<Card>
  <h2 className="mb-3 text-base">{t("partner.settings.notifications")}</h2>
  
  {/* Notification events */}
  <div className="space-y-0">
    <Toggle
      label={t("partner.settings.notif.newClient")}
      on={notifs.newClient}
      onChange={(v) => toggleNotif("newClient", v)}
    />
    <Toggle
      label={t("partner.settings.notif.tierUpgrade")}
      on={notifs.tierUpgrade}
      onChange={(v) => toggleNotif("tierUpgrade", v)}
    />
    <Toggle
      label={t("partner.settings.notif.payoutCompleted")}
      on={notifs.payoutCompleted}
      onChange={(v) => toggleNotif("payoutCompleted", v)}
    />
    <Toggle
      label={t("partner.settings.notif.clientChurn")}
      on={notifs.clientChurn}
      onChange={(v) => toggleNotif("clientChurn", v)}
    />
  </div>

  {/* Notification channels — doc §5.5: email / SMS / WhatsApp / in-app */}
  <div className="mt-4 border-t border-slate-200 pt-4">
    <p className="mb-2 text-xs font-medium text-text-2">
      {t("partner.settings.notifChannels", { defaultValue: "Notification channels" })}
    </p>
    <div className="grid grid-cols-2 gap-2">
      <ChannelCheckbox
        label="Email"
        icon={<Mail size={14} />}
        checked={channels.email}
        onChange={(checked) => toggleChannel("email", checked)}
      />
      <ChannelCheckbox
        label="SMS"
        icon={<MessageSquare size={14} />}
        checked={channels.sms}
        onChange={(checked) => toggleChannel("sms", checked)}
      />
      <ChannelCheckbox
        label="WhatsApp"
        icon={<MessageCircle size={14} />}
        checked={channels.whatsapp}
        onChange={(checked) => toggleChannel("whatsapp", checked)}
      />
      <ChannelCheckbox
        label="In-App"
        icon={<Bell size={14} />}
        checked={channels.inApp}
        onChange={(checked) => toggleChannel("inApp", checked)}
      />
    </div>
  </div>

  {/* Digest mode — doc §5.5: real-time vs daily/weekly digest */}
  <div className="mt-4 border-t border-slate-200 pt-4">
    <p className="mb-2 text-xs font-medium text-text-2">
      {t("partner.settings.digestMode", { defaultValue: "Delivery frequency" })}
    </p>
    <div className="flex flex-wrap gap-2">
      {(["realtime", "daily", "weekly"] as DigestMode[]).map((mode) => (
        <button
          key={mode}
          onClick={() => {
            setDigestMode(mode);
            setNotifsSaved(false);
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
            digestMode === mode
              ? "border-cyan-500 bg-cyan-500 text-white"
              : "border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {t(`partner.settings.digest.${mode}`, {
            defaultValue: mode === "realtime" ? "Real-time" : mode === "daily" ? "Daily digest" : "Weekly digest",
          })}
        </button>
      ))}
    </div>
  </div>

  <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
    <PrimaryButton onClick={handleSaveNotifs} disabled={savingNotifs} >
      {savingNotifs ? (
        <span className="flex items-center gap-1.5">
          <Loader2 size={14} className="animate-spin" /> {t("common.saving", { defaultValue: "Saving..." })}
        </span>
      ) : (
        t("common.saveChanges")
      )}
    </PrimaryButton>
    {notifsSaved && (
      <span className="flex items-center gap-1 text-xs font-medium text-green-600">
        <Check size={14} /> {t("common.saved", { defaultValue: "Saved" })}
      </span>
    )}
  </div>
</Card>

  

        {/* ------------------------- Team Members ------------------------- */}
        <Card>
  <h2 className="mb-3 text-base">
    {t("partner.settings.team", { defaultValue: "Team Members" })}
  </h2>
  <p className="mb-3 text-xs text-text-2">
    {t("partner.settings.teamHint", {
      defaultValue: "Invite colleagues from your organization to submit and track their own leads.",
    })}
  </p>

  <div className="mb-3 space-y-2">
    {/* Name field */}
    <div className="flex items-center gap-2 rounded-[7px] border border-slate-300 bg-paper-2 px-2.5 py-2">
      <Users size={13} className="text-text-2" />
      <input
        value={inviteName}
        onChange={(e) => {
          setInviteName(e.target.value);
          setInviteError("");
        }}
        placeholder={t("partner.settings.namePlaceholder", { defaultValue: "Full name" })}
        className="w-full bg-transparent text-[12.5px] text-text-1 outline-none"
      />
    </div>

    {/* Email field */}
    <div className="flex items-center gap-2 rounded-[7px] border border-slate-300 bg-paper-2 px-2.5 py-2">
      <Mail size={13} className="text-text-2" />
      <input
        value={inviteEmail}
        onChange={(e) => {
          setInviteEmail(e.target.value);
          setInviteError("");
        }}
        placeholder={t("partner.settings.invitePlaceholder", { defaultValue: "colleague@company.com" })}
        className="w-full bg-transparent text-[12.5px] text-text-1 outline-none"
      />
    </div>

   

    {/* Role selector */}
    <div className="grid grid-cols-2 gap-4 mb-5 pb-5 border-b border-slate-300">
      <select
  value={inviteRole}
  onChange={(e) =>
    setInviteRole(e.target.value as InviteRole)
  }
  className="w-full rounded-[7px] border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-text-2 outline-none transition focus:border-teal focus:ring-1 focus:ring-teal"
>
  <option value="Partner User">Partner User</option>
  <option value="Partner Admin">Partner Admin</option>
</select>

    {inviteError && <p className="text-[11px] text-red-500">{inviteError}</p>}

    <button onClick={handleInvite} className="w-full bg-cyan-500  text-white rounded-xl py-2">
      <UserPlus size={14} className="mr-1 inline" />
      {t("partner.settings.invite", { defaultValue: "Invite" })}
    </button>

    </div>

  </div>

  <div className="space-y-2">
    {team.map((member) => (
      <div
        key={member.id}
        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-text-1">{member.name}</p>
          <p className="truncate text-text-2">{member.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
              member.role === "Partner Admin"
                ? "bg-teal/10 text-teal"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {member.role}
          </span>
          {member.role !== "Partner Admin" && (
            <button
              onClick={() => removeMember(member.id)}
              className="rounded-md p-1 text-text-2 hover:bg-red-50 hover:text-red-600"
              title="Remove member"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
</Card>
</div>
      </div>
    </div>
  );
}


function ChannelCheckbox({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs transition hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-teal focus:ring-1 focus:ring-teal focus:ring-offset-0"
      />
      <span className="text-text-2">{icon}</span>
      <span className="font-medium text-text-1">{label}</span>
    </label>
  );
}