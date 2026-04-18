'use client';

import { useAuth } from '~/lib/privasys-auth';
import { useEffect, useState, useCallback } from 'react';
import { adminGetSettings, adminUpdateSettings } from '~/lib/api';
import type { SettingEntry } from '~/lib/api';

const GROUPS = [
    { id: 'smtp', label: 'Email (SMTP)', description: 'Azure AD credentials for sending notification emails via Microsoft Graph.' },
    { id: 'github', label: 'GitHub', description: 'GitHub Personal Access Token for triggering cwasm builds via GitHub Actions.' },
] as const;

const FIELD_LABELS: Record<string, string> = {
    'smtp.azure_tenant_id': 'Azure Tenant ID',
    'smtp.azure_client_id': 'Azure Client ID',
    'smtp.azure_client_secret': 'Azure Client Secret',
    'smtp.mail_sender': 'Sender address',
    'smtp.notify_emails': 'Notification emails (comma-separated)',
    'github.token': 'GitHub PAT',
    'github.builder_repo': 'Builder repository (owner/repo)',
};

const SENSITIVE_FIELDS = new Set([
    'smtp.azure_client_secret',
    'github.token',
]);

export default function AdminSettingsPage() {
    const { session } = useAuth();
    const [activeGroup, setActiveGroup] = useState<string>(GROUPS[0].id);
    const [settings, setSettings] = useState<SettingEntry[]>([]);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const isAdmin = session?.roles?.includes('privasys-platform:admin') ?? false;

    const loadGroup = useCallback(async (group: string) => {
        if (!session?.accessToken) return;
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const data = await adminGetSettings(session.accessToken, group);
            setSettings(data);
            setEdits({});
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, [session?.accessToken]);

    useEffect(() => {
        loadGroup(activeGroup);
    }, [activeGroup, loadGroup]);

    async function handleSave() {
        if (!session?.accessToken || Object.keys(edits).length === 0) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await adminUpdateSettings(session.accessToken, activeGroup, edits);
            setSuccess('Settings saved successfully.');
            await loadGroup(activeGroup);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    }

    function handleFieldChange(key: string, value: string) {
        setEdits(prev => ({ ...prev, [key]: value }));
    }

    if (!isAdmin) {
        return (
            <div className="max-w-3xl">
                <h1 className="text-2xl font-semibold">Access denied</h1>
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                    The <code>privasys-platform:admin</code> role is required to manage platform settings.
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold">Platform settings</h1>
            <p className="mt-1 text-sm text-black/50 dark:text-white/50">
                Manage credentials and configuration for the management service.
            </p>

            {/* Group tabs */}
            <div className="mt-6 flex gap-1 border-b border-black/10 dark:border-white/10">
                {GROUPS.map((group) => (
                    <button
                        key={group.id}
                        onClick={() => setActiveGroup(group.id)}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeGroup === group.id
                                ? 'border-black dark:border-white text-black dark:text-white'
                                : 'border-transparent text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70'
                        }`}
                    >
                        {group.label}
                    </button>
                ))}
            </div>

            {/* Group description */}
            <p className="mt-4 text-sm text-black/60 dark:text-white/60">
                {GROUPS.find(g => g.id === activeGroup)?.description}
            </p>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}
            {success && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </div>
            )}

            {loading ? (
                <div className="mt-6 animate-pulse text-sm text-black/50 dark:text-white/50">Loading…</div>
            ) : (
                <div className="mt-6 space-y-4">
                    {settings.map((setting) => {
                        const label = FIELD_LABELS[setting.key] ?? setting.key;
                        const isSensitive = SENSITIVE_FIELDS.has(setting.key);
                        const currentValue = edits[setting.key] ?? '';
                        const hasEdit = setting.key in edits;

                        return (
                            <div key={setting.key} className="space-y-1">
                                <label className="block text-sm font-medium">
                                    {label}
                                    {isSensitive && (
                                        <span className="ml-2 text-xs font-normal text-amber-600 dark:text-amber-400">sensitive</span>
                                    )}
                                </label>
                                <input
                                    type={isSensitive && !hasEdit ? 'password' : 'text'}
                                    placeholder={setting.masked ? setting.value : (setting.value || 'Not set')}
                                    value={currentValue}
                                    onChange={(e) => handleFieldChange(setting.key, e.target.value)}
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-black/10 dark:border-white/10 bg-transparent focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                                />
                                {setting.updated_by && (
                                    <p className="text-xs text-black/40 dark:text-white/40">
                                        Last updated by {setting.updated_by} on {new Date(setting.updated_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        );
                    })}

                    <div className="pt-4 flex items-center gap-3">
                        <button
                            onClick={handleSave}
                            disabled={saving || Object.keys(edits).length === 0}
                            className="px-5 py-2 text-sm font-medium rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-80 disabled:opacity-40 transition-opacity"
                        >
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                        {Object.keys(edits).length > 0 && (
                            <button
                                onClick={() => setEdits({})}
                                className="text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70"
                            >
                                Discard changes
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
