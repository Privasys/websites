'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    createFolder,
    deleteNode,
    downloadFile,
    listChildren,
    uploadFile,
    type DriveNode,
    type Me,
    type Tenant
} from '~/lib/drive-api';
import { formatBytes, kindLabel } from '~/lib/format';
import { ShareDialog } from './share-dialog';
import {
    ChevronRight,
    DownloadIcon,
    FileIcon,
    FolderIcon,
    GridIcon,
    ListIcon,
    NewFolderIcon,
    ShareIcon,
    TrashIcon,
    UploadIcon
} from './icons';

interface Crumb {
    id: string | null;
    name: string;
}

export function FileBrowser({
    session,
    tenant,
    me
}: {
    session: SealedSession;
    tenant: Tenant;
    me: Me | null;
}) {
    const [path, setPath] = useState<Crumb[]>([{ id: null, name: 'My Drive' }]);
    const [nodes, setNodes] = useState<DriveNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [busy, setBusy] = useState(false);
    const [shareNode, setShareNode] = useState<DriveNode | null>(null);
    const [newFolder, setNewFolder] = useState(false);
    const [dragging, setDragging] = useState(false);
    const dragDepth = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);

    const current = path[path.length - 1];

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const kids = await listChildren(session, tenant.id, current.id);
            kids.sort((a, b) =>
                a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)
            );
            setNodes(kids);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load this folder.');
        } finally {
            setLoading(false);
        }
    }, [session, tenant.id, current.id]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const openNode = (n: DriveNode) => {
        if (n.kind === 'folder') {
            setPath((p) => [...p, { id: n.id, name: n.name }]);
        } else {
            void download(n);
        }
    };

    const navigateTo = (i: number) => setPath((p) => p.slice(0, i + 1));

    const download = async (n: DriveNode) => {
        try {
            const bytes = await downloadFile(session, tenant.id, n.id);
            const blob = new Blob([bytes as BlobPart], { type: n.mime_hint || 'application/octet-stream' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = n.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Download failed.');
        }
    };

    const onUpload = async (files: FileList | null) => {
        if (!files || !files.length) return;
        setBusy(true);
        setError(null);
        try {
            for (const f of Array.from(files)) {
                const bytes = new Uint8Array(await f.arrayBuffer());
                await uploadFile(session, tenant.id, current.id, f.name, f.type, bytes);
            }
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed.');
        } finally {
            setBusy(false);
            if (fileInput.current) fileInput.current.value = '';
        }
    };

    const onCreateFolder = async (name: string) => {
        setNewFolder(false);
        const trimmed = name.trim();
        if (!trimmed) return;
        setBusy(true);
        try {
            await createFolder(session, tenant.id, current.id, trimmed);
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not create the folder.');
        } finally {
            setBusy(false);
        }
    };

    const onDelete = async (n: DriveNode) => {
        if (!confirm(`Delete "${n.name}"${n.kind === 'folder' ? ' and everything in it' : ''}?`))
            return;
        setBusy(true);
        try {
            await deleteNode(session, tenant.id, n.id);
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
        } finally {
            setBusy(false);
        }
    };

    // Drag-and-drop upload into the current folder.
    const onDragEnter = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
    };
    const onDragOver = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
    };
    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
    };
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        if (e.dataTransfer.files?.length) void onUpload(e.dataTransfer.files);
    };

    return (
        <div
            className="relative flex min-h-[calc(100vh-3.5rem)] flex-col"
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            {dragging && (
                <div
                    className="pointer-events-none absolute inset-3 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed"
                    style={{ borderColor: 'var(--drv-accent)', background: 'var(--drv-accent-weak)' }}
                >
                    <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--drv-accent)' }}>
                        <UploadIcon /> Drop files to upload to {current.name}
                    </div>
                </div>
            )}
            {/* Toolbar */}
            <div
                className="sticky top-14 z-10 flex flex-wrap items-center gap-2 border-b px-4 py-3"
                style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface-2)' }}
            >
                {/* Breadcrumbs */}
                <nav className="flex min-w-0 flex-1 items-center gap-1 text-[15px]">
                    {path.map((c, i) => (
                        <span key={`${c.id ?? 'root'}-${i}`} className="flex min-w-0 items-center gap-1">
                            {i > 0 && (
                                <ChevronRight className="shrink-0" style={{ color: 'var(--drv-text-muted)' }} />
                            )}
                            <button
                                onClick={() => navigateTo(i)}
                                className="truncate rounded px-1.5 py-0.5 font-medium hover:bg-[var(--drv-hover)]"
                                style={{ color: i === path.length - 1 ? 'var(--drv-text)' : 'var(--drv-text-muted)' }}
                            >
                                {c.name}
                            </button>
                        </span>
                    ))}
                </nav>

                <div className="flex items-center gap-1.5">
                    <ToolbarButton onClick={() => setNewFolder(true)} disabled={busy} icon={<NewFolderIcon />} label="New folder" />
                    <ToolbarButton onClick={() => fileInput.current?.click()} disabled={busy} icon={<UploadIcon />} label="Upload" primary />
                    <div className="mx-1 h-6 w-px" style={{ background: 'var(--drv-border)' }} />
                    <button
                        onClick={() => setView((v) => (v === 'list' ? 'grid' : 'list'))}
                        className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--drv-hover)]"
                        title={view === 'list' ? 'Grid view' : 'List view'}
                    >
                        {view === 'list' ? <GridIcon /> : <ListIcon />}
                    </button>
                </div>
                <input
                    ref={fileInput}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => void onUpload(e.target.files)}
                />
            </div>

            {error && (
                <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {error}
                </div>
            )}
            {newFolder && <NewFolderRow onSubmit={onCreateFolder} onCancel={() => setNewFolder(false)} />}

            {/* Body */}
            <div className="flex-1 p-4">
                {loading ? (
                    <div className="py-20 text-center text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                        Loading…
                    </div>
                ) : nodes.length === 0 ? (
                    <EmptyState onUpload={() => fileInput.current?.click()} />
                ) : view === 'list' ? (
                    <ListLayout nodes={nodes} onOpen={openNode} onShare={setShareNode} onDelete={onDelete} onDownload={download} />
                ) : (
                    <GridLayout nodes={nodes} onOpen={openNode} onShare={setShareNode} onDelete={onDelete} />
                )}
            </div>

            {shareNode && (
                <ShareDialog
                    session={session}
                    tenantID={tenant.id}
                    tenantKind={tenant.kind}
                    node={shareNode}
                    mySub={me?.sub ?? ''}
                    onClose={() => setShareNode(null)}
                />
            )}
        </div>
    );
}

function ToolbarButton({
    onClick,
    disabled,
    icon,
    label,
    primary
}: {
    onClick: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    primary?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-opacity disabled:opacity-50${primary ? ' drv-btn-primary' : ''}`}
            style={primary ? undefined : { background: 'var(--drv-surface)', border: '1px solid var(--drv-border)' }}
        >
            {icon}
            <span className="hidden md:inline">{label}</span>
        </button>
    );
}

function NodeIcon({ node }: { node: DriveNode }) {
    return node.kind === 'folder' ? (
        <FolderIcon width={22} height={22} style={{ color: 'var(--drv-accent)' }} />
    ) : (
        <FileIcon width={22} height={22} style={{ color: 'var(--drv-text-muted)' }} />
    );
}

function ListLayout({
    nodes,
    onOpen,
    onShare,
    onDelete,
    onDownload
}: {
    nodes: DriveNode[];
    onOpen: (n: DriveNode) => void;
    onShare: (n: DriveNode) => void;
    onDelete: (n: DriveNode) => void;
    onDownload: (n: DriveNode) => void;
}) {
    return (
        <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
        >
            <div
                className="grid grid-cols-[1fr_120px_110px_92px] items-center px-4 py-2 text-xs font-medium"
                style={{ color: 'var(--drv-text-muted)', borderBottom: '1px solid var(--drv-border)' }}
            >
                <span>Name</span>
                <span className="hidden sm:block">Type</span>
                <span className="hidden sm:block">Size</span>
                <span className="text-right">Actions</span>
            </div>
            {nodes.map((n) => (
                <div
                    key={n.id}
                    className="group grid grid-cols-[1fr_120px_110px_92px] items-center px-4 py-2.5 hover:bg-[var(--drv-hover)]"
                    style={{ borderBottom: '1px solid var(--drv-border)' }}
                >
                    <button onClick={() => onOpen(n)} className="flex min-w-0 items-center gap-3 text-left">
                        <NodeIcon node={n} />
                        <span className="truncate text-sm font-medium">{n.name}</span>
                    </button>
                    <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                        {n.kind === 'folder' ? 'Folder' : kindLabel(n.name, n.mime_hint)}
                    </span>
                    <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                        {n.kind === 'folder' ? '' : formatBytes(n.size_bytes)}
                    </span>
                    <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        {n.kind === 'file' && <IconAction title="Download" onClick={() => onDownload(n)} icon={<DownloadIcon width={18} height={18} />} />}
                        <IconAction title="Share / permissions" onClick={() => onShare(n)} icon={<ShareIcon width={18} height={18} />} />
                        <IconAction title="Delete" onClick={() => onDelete(n)} icon={<TrashIcon width={18} height={18} />} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function GridLayout({
    nodes,
    onOpen,
    onShare,
    onDelete
}: {
    nodes: DriveNode[];
    onOpen: (n: DriveNode) => void;
    onShare: (n: DriveNode) => void;
    onDelete: (n: DriveNode) => void;
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {nodes.map((n) => (
                <div
                    key={n.id}
                    className="group relative rounded-xl border p-3 transition-shadow hover:shadow-md"
                    style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                >
                    <button onClick={() => onOpen(n)} className="block w-full text-left">
                        <div
                            className="mb-3 flex h-20 items-center justify-center rounded-lg"
                            style={{ background: 'var(--drv-surface-2)' }}
                        >
                            {n.kind === 'folder' ? (
                                <FolderIcon width={40} height={40} style={{ color: 'var(--drv-accent)' }} />
                            ) : (
                                <FileIcon width={36} height={36} style={{ color: 'var(--drv-text-muted)' }} />
                            )}
                        </div>
                        <div className="truncate text-sm font-medium">{n.name}</div>
                        <div className="mt-0.5 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                            {n.kind === 'folder' ? 'Folder' : formatBytes(n.size_bytes)}
                        </div>
                    </button>
                    <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <IconAction title="Share / permissions" onClick={() => onShare(n)} icon={<ShareIcon width={16} height={16} />} />
                        <IconAction title="Delete" onClick={() => onDelete(n)} icon={<TrashIcon width={16} height={16} />} />
                    </div>
                </div>
            ))}
        </div>
    );
}

function IconAction({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
    return (
        <button
            title={title}
            onClick={onClick}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-[var(--drv-selected)]"
            style={{ color: 'var(--drv-text-muted)' }}
        >
            {icon}
        </button>
    );
}

function NewFolderRow({ onSubmit, onCancel }: { onSubmit: (name: string) => void; onCancel: () => void }) {
    const [name, setName] = useState('Untitled folder');
    return (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border p-2" style={{ borderColor: 'var(--drv-border)' }}>
            <FolderIcon width={20} height={20} style={{ color: 'var(--drv-accent)' }} />
            <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSubmit(name);
                    if (e.key === 'Escape') onCancel();
                }}
                className="flex-1 rounded border px-2 py-1 text-sm outline-none"
                style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
            />
            <button onClick={() => onSubmit(name)} className="drv-btn-primary rounded-full px-3 py-1 text-sm">
                Create
            </button>
            <button onClick={onCancel} className="rounded-full px-3 py-1 text-sm hover:bg-[var(--drv-hover)]">
                Cancel
            </button>
        </div>
    );
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderIcon width={56} height={56} style={{ color: 'var(--drv-border)' }} />
            <p className="mt-4 text-sm font-medium">This folder is empty</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                Upload files or create a folder to get started.
            </p>
            <button
                onClick={onUpload}
                className="drv-btn-primary mt-5 rounded-full px-4 py-2 text-sm"
            >
                Upload files
            </button>
        </div>
    );
}
