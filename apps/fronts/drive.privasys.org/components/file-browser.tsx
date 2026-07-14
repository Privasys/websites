'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SealedSession } from '@privasys/auth';
import {
    createFolder,
    deleteNode,
    downloadFile,
    listChildren,
    moveNode,
    searchTenant,
    setNodeIndexing,
    uploadFileStreaming,
    type DriveNode,
    type Me,
    type SearchHit,
    type Tenant
} from '~/lib/drive-api';
import { formatBytes, formatDate, ownerLabel } from '~/lib/format';
import { useDrive } from '~/lib/use-drive';
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
    IndexedIcon,
    ProcessingIcon,
    NewFolderIcon,
    SearchIcon,
    SearchOffIcon,
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
    const { reconnect } = useDrive();
    const rootName = tenant.kind === 'user' ? 'My Drive' : tenant.name;
    const [path, setPath] = useState<Crumb[]>([{ id: null, name: rootName }]);

    // Reset to the root when the active tenant (workspace) changes.
    useEffect(() => {
        setPath([{ id: null, name: rootName }]);

    }, [tenant.id]);
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
    const [progress, setProgress] = useState<{ name: string; pct: number } | null>(null);
    // Semantic search: the input value, the submitted query, its hits.
    const [searchQ, setSearchQ] = useState('');
    const [activeSearch, setActiveSearch] = useState('');
    const [hits, setHits] = useState<SearchHit[]>([]);
    const [searching, setSearching] = useState(false);
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

    // While anything in view is still indexing, refresh quietly so the
    // grey processing icon flips to green without user action.
    useEffect(() => {
        if (!nodes.some((n) => n.index_status === 'pending' || n.index_status === 'processing'))
            return;
        const t = setInterval(async () => {
            try {
                const kids = await listChildren(session, tenant.id, current.id);
                kids.sort((a, b) =>
                    a.kind !== b.kind ? (a.kind === 'folder' ? -1 : 1) : a.name.localeCompare(b.name)
                );
                setNodes(kids);
            } catch {
                /* transient; the next tick retries */
            }
        }, 5000);
        return () => clearInterval(t);
    }, [nodes, session, tenant.id, current.id]);

    // ---- semantic search ----
    const runSearch = async () => {
        const q = searchQ.trim();
        if (!q) return;
        setActiveSearch(q);
        setSearching(true);
        setError(null);
        try {
            setHits(await searchTenant(session, tenant.id, q, 20));
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Search failed.');
            setActiveSearch('');
        } finally {
            setSearching(false);
        }
    };
    const clearSearch = () => {
        setSearchQ('');
        setActiveSearch('');
        setHits([]);
    };
    const openHit = (h: SearchHit) => {
        const n: DriveNode = {
            id: h.node_id,
            tenant_id: tenant.id,
            kind: 'file',
            name: h.name,
            mime_hint: h.mime_hint,
            size_bytes: 0
        };
        if (canPreview(n)) setViewNode(n);
        else void download(n);
    };

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
                setProgress({ name: f.name, pct: 0 });
                await uploadFileStreaming(session, tenant.id, dest, f, (sent, total) =>
                    setProgress({ name: f.name, pct: total ? Math.round((sent / total) * 100) : 100 })
                );
            }
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Upload failed.');
        } finally {
            setBusy(false);
            setProgress(null);
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

    // Toggle a node's searchability: excluding a folder covers its
    // subtree for future uploads.
    const toggleIndexing = async (n: DriveNode) => {
        setBusy(true);
        setError(null);
        try {
            await setNodeIndexing(session, tenant.id, n.id, n.index_status === 'excluded');
            await reload();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not update search settings.');
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
            {/* Google-Drive-style drop affordance: the files area gets a
                translucent tint (rows stay visible so a folder can be
                targeted), and a floating pill names the destination. */}
            {pageDrag && (
                <div
                    className="drv-btn-primary pointer-events-none fixed bottom-8 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-2.5 text-sm shadow-lg"
                >
                    <UploadIcon width={18} height={18} />
                    Drop files to upload to{' '}
                    {dropTarget ? (byId.get(dropTarget)?.name ?? current.name) : current.name}
                </div>
            )}

            {/* Toolbar: one fixed-height row whose content swaps between
                browsing controls and the selection actions, so selecting a
                row never shifts the file list (double-click stays where it
                was clicked). */}
            <div
                className="sticky top-14 z-10 flex h-14 items-center gap-2 border-b px-4"
                style={{
                    borderColor: 'var(--drv-border)',
                    background: selected.size > 0 ? 'var(--drv-accent-weak)' : 'var(--drv-surface-2)'
                }}
            >
                {selected.size > 0 ? (
                    <>
                        <IconButton title="Clear selection" onClick={clearSelection} icon={<CloseIcon width={18} height={18} />} />
                        <span className="mr-1 text-sm font-medium" style={{ color: 'var(--drv-accent)' }}>
                            {selected.size} selected
                        </span>
                        {soleFile && canPreview(soleFile) && (
                            <IconButton title="Preview" onClick={() => setViewNode(soleFile)} icon={<EyeIcon width={18} height={18} />} />
                        )}
                        {soleNode && (
                            <IconButton title="Share" onClick={() => setShareNode(soleNode)} icon={<ShareIcon width={18} height={18} />} />
                        )}
                        {anyFileSelected && (
                            <IconButton title="Download" onClick={() => void downloadSelected()} icon={<DownloadIcon width={18} height={18} />} />
                        )}
                        <IconButton title="Move" onClick={() => setMoveOpen(true)} icon={<MoveIcon width={18} height={18} />} />
                        {soleNode && soleNode.kind === 'folder' && (
                            <IconButton
                                title={soleNode.index_status === 'excluded' ? 'Enable search in this folder' : 'Exclude this folder from search'}
                                onClick={() => void toggleIndexing(soleNode)}
                                icon={
                                    soleNode.index_status === 'excluded' ? (
                                        <SearchIcon width={18} height={18} />
                                    ) : (
                                        <SearchOffIcon width={18} height={18} />
                                    )
                                }
                            />
                        )}
                        <IconButton title="Delete" onClick={() => void onDeleteSelected()} icon={<TrashIcon width={18} height={18} />} />
                    </>
                ) : (
                    <>
                        <nav className="flex min-w-0 shrink items-center gap-1 text-[15px]">
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
                                                // allow dropping onto the root crumb
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

                        {/* Semantic search over the drive's sealed index. */}
                        <div
                            className="mx-2 flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-full border px-3 py-1.5"
                            style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                        >
                            <SearchIcon width={16} height={16} style={{ color: 'var(--drv-text-muted)' }} />
                            <input
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') void runSearch();
                                    if (e.key === 'Escape') clearSearch();
                                }}
                                placeholder="Search in Drive"
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                            />
                            {(searchQ || activeSearch) && (
                                <button title="Clear search" onClick={clearSearch} className="rounded p-0.5 hover:bg-[var(--drv-hover)]">
                                    <CloseIcon width={14} height={14} style={{ color: 'var(--drv-text-muted)' }} />
                                </button>
                            )}
                        </div>

                        <div className="ml-auto flex items-center gap-1">
                            <IconButton title="New folder" onClick={() => setNewFolder(true)} disabled={busy} icon={<NewFolderIcon />} />
                            <button
                                onClick={() => fileInput.current?.click()}
                                disabled={busy}
                                title="Upload files"
                                className="drv-btn-primary flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-50"
                            >
                                <UploadIcon width={18} height={18} />
                            </button>
                            <div className="mx-1 h-6 w-px" style={{ background: 'var(--drv-border)' }} />
                            <IconButton
                                title={view === 'list' ? 'Grid view' : 'List view'}
                                onClick={() => setView((v) => (v === 'list' ? 'grid' : 'list'))}
                                icon={view === 'list' ? <GridIcon /> : <ListIcon />}
                            />
                        </div>
                    </>
                )}
                <input ref={fileInput} type="file" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
            </div>

            {progress && (
                <div
                    className="mx-4 mt-3 rounded-lg border px-3 py-2"
                    style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}
                >
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="truncate" style={{ color: 'var(--drv-text-muted)' }}>
                            Uploading {progress.name}
                        </span>
                        <span className="ml-2 shrink-0 font-medium" style={{ color: 'var(--drv-accent)' }}>
                            {progress.pct}%
                        </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--drv-surface-2)' }}>
                        <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress.pct}%`, background: 'var(--drv-accent)' }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div className="mx-4 mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    <span className="min-w-0 flex-1">{error}</span>
                    <button
                        onClick={() => void reconnect()}
                        className="shrink-0 rounded-full border border-red-500/40 px-3 py-1 text-xs font-medium hover:bg-red-500/10"
                    >
                        Reconnect
                    </button>
                </div>
            )}
            {newFolder && <NewFolderRow onSubmit={onCreateFolder} onCancel={() => setNewFolder(false)} />}

            {/* Body */}
            <div
                className="flex-1 rounded-xl p-4"
                onClick={(e) => e.target === e.currentTarget && clearSelection()}
                style={
                    pageDrag && dropTarget === null
                        ? {
                            // Tint, do not cover: folder rows must stay
                            // visible (and targetable) during the drag.
                            outline: '2px dashed var(--drv-accent)',
                            outlineOffset: '-6px',
                            background: 'var(--drv-hover)'
                        }
                        : undefined
                }
            >
                {activeSearch ? (
                    <SearchResults
                        query={activeSearch}
                        hits={hits}
                        searching={searching}
                        onOpen={openHit}
                        onClear={clearSearch}
                    />
                ) : loading ? (
                    <div className="py-20 text-center text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                        Loading…
                    </div>
                ) : nodes.length === 0 ? (
                    <EmptyState onUpload={() => fileInput.current?.click()} />
                ) : view === 'list' ? (
                    <ListLayout
                        nodes={nodes}
                        selected={selected}
                        mySub={me?.sub ?? ''}
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

// Icon-only toolbar button; the label lives in the tooltip.
function IconButton({
    title,
    onClick,
    icon,
    disabled
}: {
    title: string;
    onClick: () => void;
    icon: React.ReactNode;
    disabled?: boolean;
}) {
    return (
        <button
            title={title}
            aria-label={title}
            onClick={onClick}
            disabled={disabled}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--drv-hover)] disabled:opacity-50"
            style={{ color: 'var(--drv-text)' }}
        >
            {icon}
        </button>
    );
}

// Searchability column: grey clock while indexing, green check when
// searchable, muted search-off when excluded / not indexed.
function StatusIcon({ node }: { node: DriveNode }) {
    const s = node.index_status;
    if (s === 'pending' || s === 'processing') {
        return (
            <span title="Indexing for search…" aria-label="Indexing">
                <ProcessingIcon width={16} height={16} style={{ color: 'var(--drv-text-muted)' }} />
            </span>
        );
    }
    if (s === 'indexed') {
        return (
            <span title="Searchable" aria-label="Searchable">
                <IndexedIcon width={16} height={16} style={{ color: '#16a34a' }} />
            </span>
        );
    }
    if (s === 'excluded') {
        return (
            <span title="Excluded from search" aria-label="Excluded from search">
                <SearchOffIcon width={16} height={16} style={{ color: 'var(--drv-text-muted)' }} />
            </span>
        );
    }
    if (s === 'skipped' || s === 'failed') {
        return (
            <span
                title={s === 'failed' ? 'Indexing failed' : 'Not indexed (type not supported yet)'}
                aria-label="Not indexed"
            >
                <SearchOffIcon width={16} height={16} style={{ color: 'var(--drv-border)' }} />
            </span>
        );
    }
    return null;
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

const LIST_COLS = 'grid-cols-[28px_minmax(0,1fr)_90px_110px_90px_44px]';

function ListLayout({
    nodes,
    selected,
    mySub,
    onRowClick,
    onToggle,
    onOpen,
    rowProps
}: {
    nodes: DriveNode[];
    selected: Set<string>;
    mySub: string;
    onRowClick: (e: React.MouseEvent, id: string) => void;
    onToggle: (id: string) => void;
    onOpen: (n: DriveNode) => void;
    rowProps: (n: DriveNode) => RowExtra;
}) {
    return (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}>
            <div
                className={`grid ${LIST_COLS} items-center px-4 py-2 text-xs font-medium`}
                style={{ color: 'var(--drv-text-muted)', borderBottom: '1px solid var(--drv-border)' }}
            >
                <span />
                <span>Name</span>
                <span className="hidden sm:block">Owner</span>
                <span className="hidden sm:block">Modified</span>
                <span className="hidden sm:block">Size</span>
                <span className="text-center" title="Searchability">
                    <SearchIcon width={14} height={14} className="inline" />
                </span>
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
                        className={`group grid cursor-pointer ${LIST_COLS} items-center px-4 py-2.5`}
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
                        <span className="hidden truncate text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                            {ownerLabel(n.created_by, mySub)}
                        </span>
                        <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                            {formatDate(n.updated_at)}
                        </span>
                        <span className="hidden text-sm sm:block" style={{ color: 'var(--drv-text-muted)' }}>
                            {n.kind === 'folder' ? '—' : formatBytes(n.size_bytes)}
                        </span>
                        <span className="flex justify-center">
                            <StatusIcon node={n} />
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function SearchResults({
    query,
    hits,
    searching,
    onOpen,
    onClear
}: {
    query: string;
    hits: SearchHit[];
    searching: boolean;
    onOpen: (h: SearchHit) => void;
    onClear: () => void;
}) {
    return (
        <div>
            <div className="mb-3 flex items-center gap-2 text-sm">
                <span style={{ color: 'var(--drv-text-muted)' }}>
                    {searching ? 'Searching…' : `Results for "${query}"`}
                </span>
                <button
                    onClick={onClear}
                    className="rounded-full px-2.5 py-0.5 text-xs font-medium hover:bg-[var(--drv-hover)]"
                    style={{ color: 'var(--drv-accent)' }}
                >
                    Back to files
                </button>
            </div>
            {searching ? null : hits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <SearchIcon width={44} height={44} style={{ color: 'var(--drv-border)' }} />
                    <p className="mt-4 text-sm font-medium">No matches</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--drv-text-muted)' }}>
                        Only files with the green searchable mark are covered.
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--drv-border)', background: 'var(--drv-surface)' }}>
                    {hits.map((h, i) => (
                        <button
                            key={`${h.node_id}-${h.chunk_index}-${i}`}
                            onClick={() => onOpen(h)}
                            className="block w-full px-4 py-3 text-left hover:bg-[var(--drv-hover)]"
                            style={{ borderBottom: '1px solid var(--drv-border)' }}
                        >
                            <div className="flex items-center gap-2">
                                <FileIcon width={18} height={18} style={{ color: 'var(--drv-text-muted)' }} />
                                <span className="truncate text-sm font-medium">{h.name}</span>
                                {h.section_path && h.section_path.length > 1 && (
                                    <span
                                        className="truncate rounded-full px-2 py-0.5 text-xs"
                                        style={{ background: 'var(--drv-accent-weak)', color: 'var(--drv-accent)' }}
                                        title={h.section_path.join(' › ')}
                                    >
                                        {h.section_path.slice(1).join(' › ')}
                                    </span>
                                )}
                                <span className="ml-auto shrink-0 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                    {(h.score * 100).toFixed(0)}%
                                </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--drv-text-muted)' }}>
                                {h.snippet}
                            </p>
                        </button>
                    ))}
                </div>
            )}
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
                        <div className="flex items-center gap-1.5">
                            <span className="min-w-0 truncate text-sm font-medium">{n.name}</span>
                            <span className="ml-auto shrink-0">
                                <StatusIcon node={n} />
                            </span>
                        </div>
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
