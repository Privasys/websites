'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    createFolder,
    deleteNode,
    downloadFile,
    listChildren,
    moveNode,
    uploadFile,
    type DriveNode,
    type Me,
    type Tenant
} from '~/lib/drive-api';
import { formatBytes, kindLabel } from '~/lib/format';
import { ShareDialog } from './share-dialog';
import { MoveDialog } from './move-dialog';
import { FileViewer, canPreview } from './file-viewer';
import {
    ChevronRight,
    DownloadIcon,
    FileIcon,
    FolderIcon,
    GridIcon,
    ListIcon,
    MoveIcon,
    NewFolderIcon,
    ShareIcon,
    TrashIcon,
    UploadIcon,
    EyeIcon,
    CloseIcon
} from './icons';

interface Crumb {
    id: string | null;
    name: string;
}

// Custom drag type carrying the ids being moved within the drive.
const DRAG_TYPE = 'application/x-drive-nodes';

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
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [shareNode, setShareNode] = useState<DriveNode | null>(null);
    const [viewNode, setViewNode] = useState<DriveNode | null>(null);
    const [moveOpen, setMoveOpen] = useState(false);
    const [newFolder, setNewFolder] = useState(false);
    const [pageDrag, setPageDrag] = useState(false);
    const [dropTarget, setDropTarget] = useState<string | null>(null);
    const dragDepth = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);

    const current = path[path.length - 1];
    const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const selectedNodes = useMemo(
        () => [...selected].map((id) => byId.get(id)).filter(Boolean) as DriveNode[],
        [selected, byId]
    );

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSelected(new Set());
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

    // ---- selection ----
    const clearSelection = () => setSelected(new Set());
    const selectOne = (id: string) => setSelected(new Set([id]));
    const toggle = (id: string) =>
        setSelected((cur) => {
            const next = new Set(cur);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    const onRowClick = (e: React.MouseEvent, id: string) => {
        if (e.metaKey || e.ctrlKey) toggle(id);
        else selectOne(id);
    };

    const openNode = (n: DriveNode) => {
        if (n.kind === 'folder') {
            setPath((p) => [...p, { id: n.id, name: n.name }]);
        } else if (canPreview(n)) {
            setViewNode(n);
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

    const downloadSelected = async () => {
        for (const n of selectedNodes) if (n.kind === 'file') await download(n);
    };

    const onUpload = async (files: FileList | File[] | null, parentID?: string | null) => {
        if (!files || !('length' in files) || files.length === 0) return;
        const dest = parentID === undefined ? current.id : parentID;
        setBusy(true);
        setError(null);
        try {
            for (const f of Array.from(files)) {
                const bytes = new Uint8Array(await f.arrayBuffer());
                await uploadFile(session, tenant.id, dest, f.name, f.type, bytes);
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

    const onDeleteSelected = async () => {
        const items = selectedNodes;
        if (items.length === 0) return;
        const label =
            items.length === 1
                ? `"${items[0].name}"${items[0].kind === 'folder' ? ' and everything in it' : ''}`
                : `${items.length} items`;
        if (!confirm(`Delete ${label}?`)) return;
        setBusy(true);
        try {
            for (const n of items) await deleteNode(session, tenant.id, n.id);
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed.');
        } finally {
            setBusy(false);
        }
    };

    const moveInto = useCallback(
        async (ids: string[], destParentID: string | null) => {
            setBusy(true);
            setError(null);
            try {
                for (const id of ids) await moveNode(session, tenant.id, id, destParentID);
                await reload();
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Move failed.');
            } finally {
                setBusy(false);
            }
        },
        [session, tenant.id, reload]
    );

    // ---- drag and drop ----
    // Page-level: external files dropped anywhere upload into the current folder.
    const onPageDragEnter = (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes('Files')) return;
        e.preventDefault();
        dragDepth.current += 1;
        setPageDrag(true);
    };
    const onPageDragOver = (e: React.DragEvent) => {
        if (e.dataTransfer.types.includes('Files')) e.preventDefault();
    };
    const onPageDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setPageDrag(false);
    };
    const onPageDrop = (e: React.DragEvent) => {
        e.preventDefault();
        dragDepth.current = 0;
        setPageDrag(false);
        if (e.dataTransfer.files?.length) void onUpload(e.dataTransfer.files);
    };

    // A node row starts an internal move drag.
    const onNodeDragStart = (e: React.DragEvent, id: string) => {
        // Drag the whole selection if the grabbed row is part of it.
        const ids = selected.has(id) ? [...selected] : [id];
        e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
        e.dataTransfer.effectAllowed = 'move';
    };

    // A folder row is a drop target for both external files (upload into it)
    // and internal nodes (move into it).
    const folderDragOver = (e: React.DragEvent, folderID: string) => {
        const t = e.dataTransfer.types;
        if (!t.includes('Files') && !t.includes(DRAG_TYPE)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(folderID);
    };
    const folderDrop = (e: React.DragEvent, folder: DriveNode) => {
        e.preventDefault();
        e.stopPropagation();
        setDropTarget(null);
        setPageDrag(false);
        dragDepth.current = 0;
        if (e.dataTransfer.files?.length) {
            void onUpload(e.dataTransfer.files, folder.id);
            return;
        }
        const raw = e.dataTransfer.getData(DRAG_TYPE);
        if (raw) {
            const ids = (JSON.parse(raw) as string[]).filter((id) => id !== folder.id);
            if (ids.length) void moveInto(ids, folder.id);
        }
    };

    const rowProps = (n: DriveNode) => ({
        draggable: true,
        onDragStart: (e: React.DragEvent) => onNodeDragStart(e, n.id),
        onDragOver: n.kind === 'folder' ? (e: React.DragEvent) => folderDragOver(e, n.id) : undefined,
        onDragLeave: n.kind === 'folder' ? () => setDropTarget(null) : undefined,
        onDrop: n.kind === 'folder' ? (e: React.DragEvent) => folderDrop(e, n) : undefined,
        isDropTarget: n.kind === 'folder' && dropTarget === n.id
    });

    const soleFile = selectedNodes.length === 1 && selectedNodes[0].kind === 'file' ? selectedNodes[0] : null;
    const soleNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
    const anyFileSelected = selectedNodes.some((n) => n.kind === 'file');

    return (
        <div
            className="relative flex flex-1 flex-col"
            onDragEnter={onPageDragEnter}
            onDragOver={onPageDragOver}
            onDragLeave={onPageDragLeave}
            onDrop={onPageDrop}
        >
            {pageDrag && dropTarget === null && (
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
                <nav className="flex min-w-0 flex-1 items-center gap-1 text-[15px]">
                    {path.map((c, i) => (
                        <span key={`${c.id ?? 'root'}-${i}`} className="flex min-w-0 items-center gap-1">
                            {i > 0 && <ChevronRight className="shrink-0" style={{ color: 'var(--drv-text-muted)' }} />}
                            <button
                                onClick={() => navigateTo(i)}
                                onDragOver={(e) =>
                                    c.id === null
                                        ? undefined
                                        : folderDragOver(e, c.id)
                                }
                                onDrop={(e) => {
                                    if (c.id === null) {
                                        // allow dropping onto "My Drive" to move to root
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const raw = e.dataTransfer.getData(DRAG_TYPE);
                                        if (raw) void moveInto(JSON.parse(raw) as string[], null);
                                    }
                                }}
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
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
            </div>

            {/* Selection action bar */}
            {selected.size > 0 && (
                <div
                    className="sticky top-[6.5rem] z-10 flex flex-wrap items-center gap-2 border-b px-4 py-2"
                    style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-accent-weak)' }}
                >
                    <button onClick={clearSelection} className="rounded-lg p-1 hover:bg-[var(--drv-hover)]" title="Clear selection">
                        <CloseIcon width={18} height={18} />
                    </button>
                    <span className="text-sm font-medium" style={{ color: 'var(--drv-accent)' }}>
                        {selected.size} selected
                    </span>
                    <div className="mx-1 h-5 w-px" style={{ background: 'var(--drv-border)' }} />
                    {soleFile && canPreview(soleFile) && (
                        <ActionChip onClick={() => setViewNode(soleFile)} icon={<EyeIcon width={16} height={16} />} label="Preview" />
                    )}
                    {soleNode && (
                        <ActionChip onClick={() => setShareNode(soleNode)} icon={<ShareIcon width={16} height={16} />} label="Share" />
                    )}
                    {anyFileSelected && (
                        <ActionChip onClick={() => void downloadSelected()} icon={<DownloadIcon width={16} height={16} />} label="Download" />
                    )}
                    <ActionChip onClick={() => setMoveOpen(true)} icon={<MoveIcon width={16} height={16} />} label="Move" />
                    <ActionChip onClick={() => void onDeleteSelected()} icon={<TrashIcon width={16} height={16} />} label="Delete" />
                </div>
            )}

            {error && (
                <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {error}
                </div>
            )}
            {newFolder && <NewFolderRow onSubmit={onCreateFolder} onCancel={() => setNewFolder(false)} />}

            {/* Body */}
            <div className="flex-1 p-4" onClick={(e) => e.target === e.currentTarget && clearSelection()}>
                {loading ? (
                    <div className="py-20 text-center text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                        Loading…
                    </div>
                ) : nodes.length === 0 ? (
                    <EmptyState onUpload={() => fileInput.current?.click()} />
                ) : view === 'list' ? (
                    <ListLayout
                        nodes={nodes}
                        selected={selected}
                        onRowClick={onRowClick}
                        onToggle={toggle}
                        onOpen={openNode}
                        rowProps={rowProps}
                    />
                ) : (
                    <GridLayout
                        nodes={nodes}
                        selected={selected}
                        onRowClick={onRowClick}
                        onOpen={openNode}
                        rowProps={rowProps}
                    />
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

            {viewNode && (
                <FileViewer
                    session={session}
                    tenantID={tenant.id}
                    node={viewNode}
                    onClose={() => setViewNode(null)}
                    onDownload={(n) => void download(n)}
                />
            )}

            {moveOpen && (
                <MoveDialog
                    session={session}
                    tenantID={tenant.id}
                    moving={selected}
                    onCancel={() => setMoveOpen(false)}
                    onMove={(dest) => {
                        setMoveOpen(false);
                        void moveInto([...selected], dest);
                    }}
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

function ActionChip({ onClick, icon, label }: { onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium hover:bg-[var(--drv-hover)]"
            style={{ color: 'var(--drv-text)' }}
        >
            {icon}
            <span className="hidden sm:inline">{label}</span>
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

interface RowExtra {
    draggable: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: () => void;
    onDrop?: (e: React.DragEvent) => void;
    isDropTarget: boolean;
}

function ListLayout({
    nodes,
    selected,
    onRowClick,
    onToggle,
    onOpen,
    rowProps
}: {
    nodes: DriveNode[];
    selected: Set<string>;
    onRowClick: (e: React.MouseEvent, id: string) => void;
    onToggle: (id: string) => void;
    onOpen: (n: DriveNode) => void;
    rowProps: (n: DriveNode) => RowExtra;
}) {
    return (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}>
            <div
                className="grid grid-cols-[28px_1fr_120px_110px] items-center px-4 py-2 text-xs font-medium"
                style={{ color: 'var(--drv-text-muted)', borderBottom: '1px solid var(--drv-border)' }}
            >
                <span />
                <span>Name</span>
                <span className="hidden sm:block">Type</span>
                <span className="hidden sm:block">Size</span>
            </div>
            {nodes.map((n) => {
                const rp = rowProps(n);
                const isSel = selected.has(n.id);
                return (
                    <div
                        key={n.id}
                        draggable={rp.draggable}
                        onDragStart={rp.onDragStart}
                        onDragOver={rp.onDragOver}
                        onDragLeave={rp.onDragLeave}
                        onDrop={rp.onDrop}
                        onClick={(e) => onRowClick(e, n.id)}
                        onDoubleClick={() => onOpen(n)}
                        className="group grid cursor-pointer grid-cols-[28px_1fr_120px_110px] items-center px-4 py-2.5"
                        style={{
                            borderBottom: '1px solid var(--drv-border)',
                            background: rp.isDropTarget
                                ? 'var(--drv-selected)'
                                : isSel
                                    ? 'var(--drv-accent-weak)'
                                    : undefined,
                            outline: rp.isDropTarget ? '2px dashed var(--drv-accent)' : undefined,
                            outlineOffset: '-2px'
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={isSel}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => onToggle(n.id)}
                            className={`h-4 w-4 accent-[var(--drv-accent)] ${isSel ? '' : 'opacity-0 group-hover:opacity-100'}`}
                        />
                        <div className="flex min-w-0 items-center gap-3">
                            <NodeIcon node={n} />
                            <span className="truncate text-sm font-medium">{n.name}</span>
                        </div>
                        <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                            {n.kind === 'folder' ? 'Folder' : kindLabel(n.name, n.mime_hint)}
                        </span>
                        <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                            {n.kind === 'folder' ? '' : formatBytes(n.size_bytes)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function GridLayout({
    nodes,
    selected,
    onRowClick,
    onOpen,
    rowProps
}: {
    nodes: DriveNode[];
    selected: Set<string>;
    onRowClick: (e: React.MouseEvent, id: string) => void;
    onOpen: (n: DriveNode) => void;
    rowProps: (n: DriveNode) => RowExtra;
}) {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
            {nodes.map((n) => {
                const rp = rowProps(n);
                const isSel = selected.has(n.id);
                return (
                    <div
                        key={n.id}
                        draggable={rp.draggable}
                        onDragStart={rp.onDragStart}
                        onDragOver={rp.onDragOver}
                        onDragLeave={rp.onDragLeave}
                        onDrop={rp.onDrop}
                        onClick={(e) => onRowClick(e, n.id)}
                        onDoubleClick={() => onOpen(n)}
                        className="group relative cursor-pointer rounded-xl border p-3 transition-shadow hover:shadow-md"
                        style={{
                            borderColor: rp.isDropTarget || isSel ? 'var(--drv-accent)' : 'var(--drv-border)',
                            background: rp.isDropTarget || isSel ? 'var(--drv-accent-weak)' : 'var(--drv-surface)'
                        }}
                    >
                        <div className="mb-3 flex h-20 items-center justify-center rounded-lg" style={{ background: 'var(--drv-surface-2)' }}>
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
                    </div>
                );
            })}
        </div>
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
                Upload files, drag them in, or create a folder to get started.
            </p>
            <button onClick={onUpload} className="drv-btn-primary mt-5 rounded-full px-4 py-2 text-sm">
                Upload files
            </button>
        </div>
    );
}
