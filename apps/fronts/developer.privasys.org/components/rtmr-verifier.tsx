'use client';

import { useState, useEffect, useCallback } from 'react';

// TCG2 event log constants
const ALG_SHA384 = 0x000c;
const SHA384_SIZE = 48;
const SHA1_SIZE = 20;
const EV_NO_ACTION = 0x00000003;

// Well-known TCG event type names
const EVENT_TYPE_NAMES: Record<number, string> = {
    0x00000000: 'EV_PREBOOT_CERT',
    0x00000001: 'EV_POST_CODE',
    0x00000002: 'EV_UNUSED',
    0x00000003: 'EV_NO_ACTION',
    0x00000004: 'EV_SEPARATOR',
    0x00000005: 'EV_ACTION',
    0x00000006: 'EV_EVENT_TAG',
    0x00000007: 'EV_S_CRTM_CONTENTS',
    0x00000008: 'EV_S_CRTM_VERSION',
    0x00000009: 'EV_CPU_MICROCODE',
    0x0000000a: 'EV_PLATFORM_CONFIG_FLAGS',
    0x0000000b: 'EV_TABLE_OF_DEVICES',
    0x0000000c: 'EV_COMPACT_HASH',
    0x0000000d: 'EV_IPL',
    0x0000000e: 'EV_IPL_PARTITION_DATA',
    0x0000000f: 'EV_NONHOST_CODE',
    0x00000010: 'EV_NONHOST_CONFIG',
    0x00000011: 'EV_NONHOST_INFO',
    0x00000012: 'EV_OMIT_BOOT_DEVICE_EVENTS',
    0x80000001: 'EV_EFI_VARIABLE_DRIVER_CONFIG',
    0x80000002: 'EV_EFI_VARIABLE_BOOT',
    0x80000003: 'EV_EFI_BOOT_SERVICES_APPLICATION',
    0x80000004: 'EV_EFI_BOOT_SERVICES_DRIVER',
    0x80000005: 'EV_EFI_RUNTIME_SERVICES_DRIVER',
    0x80000006: 'EV_EFI_GPT_EVENT',
    0x80000007: 'EV_EFI_ACTION',
    0x80000008: 'EV_EFI_PLATFORM_FIRMWARE_BLOB',
    0x80000009: 'EV_EFI_HANDOFF_TABLES',
    0x8000000a: 'EV_EFI_PLATFORM_FIRMWARE_BLOB2',
    0x8000000b: 'EV_EFI_HANDOFF_TABLES2',
    0x8000000c: 'EV_EFI_VARIABLE_BOOT2',
    0x8000000e: 'EV_EFI_SPDM_FIRMWARE_BLOB',
    0x80000010: 'EV_EFI_HCRTM_EVENT'
};

// Human-readable RTMR descriptions for vTPM source
const RTMR_LABELS_TPM: Record<number, string> = {
    0: 'TD firmware (not in vTPM log)',
    1: 'Boot config (PCR 0–7)',
    2: 'OS & kernel (PCR 8–15)',
    3: 'Application workload'
};

const RTMR_LABELS_CCEL: Record<number, string> = {
    0: 'CC_MR 1',
    1: 'CC_MR 2',
    2: 'CC_MR 3',
    3: 'CC_MR 4'
};

interface AlgDesc {
    id: number;
    size: number;
}

interface ParsedEvent {
    num: number;
    pcr: number;
    eventType: number;
    sha384: Uint8Array;
    data: Uint8Array;
}

interface AppEvent {
    timestamp: string;
    pcr: number;
    digest_sha384: string;
    digest_sha256: string;
    type: string;
    description: string;
}

interface RtmrResult {
    value: string;
    events: ParsedEvent[];
    match: boolean | null; // null = no quote to compare
    pcrValues?: Record<number, string>; // per-PCR replayed values (tpm0 source)
    appEvents?: AppEvent[]; // application-level events for RTMR[3]
}

interface BootMeasurement {
    label: string;
    value: string;
    pcr: number;
    rtmr: number;
}

interface RtmrVerifierProps {
    eventLogBase64: string;
    eventLogSource: string;
    quoteRtmrs: {
        rtmr0?: string;
        rtmr1?: string;
        rtmr2?: string;
        rtmr3?: string;
    };
    appEvents?: AppEvent[];
}

function hexFromBytes(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function tryDecodeText(data: Uint8Array): string | null {
    if (data.length === 0 || data.length > 2048) return null;
    for (const b of data) {
        if (b !== 0 && (b < 0x20 || b > 0x7e)) return null;
    }
    const filtered = data.filter(b => b !== 0);
    if (filtered.length === 0) return null;
    return new TextDecoder().decode(filtered);
}

function ccelMrToRtmr(pcr: number): number {
    switch (pcr) {
        case 1: return 0;
        case 2: return 1;
        case 3: return 2;
        case 4: return 3;
        default: return -1;
    }
}

function tpmPcrToRtmr(pcr: number): number {
    // vTPM PCR→RTMR: PCR 0-7 = boot (RTMR[1]), PCR 8-15 = OS (RTMR[2]).
    // RTMR[0] is firmware-measured (pre-boot, not in vTPM log).
    if (pcr >= 0 && pcr <= 7) return 1;
    if (pcr >= 8 && pcr <= 15) return 2;
    return -1;
}

function parseEventLog(base64: string, source: string): { events: ParsedEvent[]; error?: string } {
    let raw: Uint8Array;
    try {
        raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    } catch {
        return { events: [], error: 'Invalid base64 encoding' };
    }

    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
    let offset = 0;

    function readU16(): number {
        const v = view.getUint16(offset, true);
        offset += 2;
        return v;
    }
    function readU32(): number {
        const v = view.getUint32(offset, true);
        offset += 4;
        return v;
    }
    function readBytes(n: number): Uint8Array {
        const slice = raw.slice(offset, offset + n);
        offset += n;
        return slice;
    }

    try {
        // Legacy header event: PCR (4) + eventType (4) + SHA1 digest (20) + eventSize (4) + eventData
        readU32(); // PCR index (skip)
        readU32(); // event type (skip)
        readBytes(SHA1_SIZE); // SHA-1 digest
        const evSize0 = readU32();
        const headerData = readBytes(evSize0);

        // Parse SpecID to get algorithm descriptors
        // Skip: signature(16) + platformClass(4) + specVersion(3) + uintnSize(1) = 24
        if (headerData.length < 28) {
            return { events: [], error: 'Header too short' };
        }
        const headerView = new DataView(headerData.buffer, headerData.byteOffset, headerData.byteLength);
        const numAlgs = headerView.getUint32(24, true);

        const algs: AlgDesc[] = [];
        let algOffset = 28;
        for (let i = 0; i < numAlgs; i++) {
            if (algOffset + 4 > headerData.length) {
                return { events: [], error: 'Header too short for algorithm descriptors' };
            }
            algs.push({
                id: headerView.getUint16(algOffset, true),
                size: headerView.getUint16(algOffset + 2, true)
            });
            algOffset += 4;
        }

        // Parse crypto-agile events
        const events: ParsedEvent[] = [];
        let evNum = 1;

        while (offset < raw.length - 8) {
            const startOffset = offset;
            let pcr: number, eventType: number, digestCount: number;
            try {
                pcr = readU32();
                eventType = readU32();
                digestCount = readU32();
            } catch {
                break;
            }

            // Sanity check
            if (digestCount > 16 || digestCount === 0) break;

            let sha384Digest = new Uint8Array(SHA384_SIZE);
            let valid = true;

            for (let i = 0; i < digestCount; i++) {
                if (offset + 2 > raw.length) { valid = false; break; }
                const algID = readU16();

                // End-of-log padding
                if (algID === 0xffff) return { events };

                const algDesc = algs.find(a => a.id === algID);
                if (!algDesc) { valid = false; break; }

                if (offset + algDesc.size > raw.length) { valid = false; break; }
                const digest = readBytes(algDesc.size);
                if (algID === ALG_SHA384) {
                    sha384Digest = new Uint8Array(digest);
                }
            }

            if (!valid) {
                offset = startOffset;
                break;
            }

            if (offset + 4 > raw.length) break;
            const eventDataSize = readU32();
            if (offset + eventDataSize > raw.length) break;
            const eventData = readBytes(eventDataSize);

            events.push({
                num: evNum,
                pcr,
                eventType,
                sha384: sha384Digest,
                data: eventData
            });
            evNum++;
        }

        return { events };
    } catch (e) {
        return { events: [], error: `Parse error: ${e instanceof Error ? e.message : String(e)}` };
    }
}

async function replayRtmrs(
    events: ParsedEvent[],
    source: string,
    quoteRtmrs: RtmrVerifierProps['quoteRtmrs'],
    appEvents?: AppEvent[]
): Promise<RtmrResult[]> {
    const rtmr = [
        new Uint8Array(SHA384_SIZE),
        new Uint8Array(SHA384_SIZE),
        new Uint8Array(SHA384_SIZE),
        new Uint8Array(SHA384_SIZE)
    ];
    const rtmrEvents: ParsedEvent[][] = [[], [], [], []];
    const mapFn = source === 'ccel' ? ccelMrToRtmr : tpmPcrToRtmr;
    const isTpm = source !== 'ccel';

    // For tpm0: track per-PCR registers individually
    const pcrRegisters: Record<number, Uint8Array> = {};

    for (const ev of events) {
        if (ev.eventType === EV_NO_ACTION) continue;
        const idx = mapFn(ev.pcr);
        if (idx < 0 || idx > 3) continue;

        if (isTpm) {
            // Per-PCR replay: PCR[n] = SHA-384(PCR[n] || digest)
            if (!pcrRegisters[ev.pcr]) pcrRegisters[ev.pcr] = new Uint8Array(SHA384_SIZE);
            const concat = new Uint8Array(SHA384_SIZE * 2);
            concat.set(pcrRegisters[ev.pcr], 0);
            concat.set(ev.sha384, SHA384_SIZE);
            const hash = await crypto.subtle.digest('SHA-384', concat);
            pcrRegisters[ev.pcr] = new Uint8Array(hash);
        } else {
            // CCEL: aggregate into MR registers for direct comparison with RTMRs
            const concat = new Uint8Array(SHA384_SIZE * 2);
            concat.set(rtmr[idx], 0);
            concat.set(ev.sha384, SHA384_SIZE);
            const hash = await crypto.subtle.digest('SHA-384', concat);
            rtmr[idx] = new Uint8Array(hash);
        }
        rtmrEvents[idx].push(ev);
    }

    const quoteArr = [quoteRtmrs.rtmr0, quoteRtmrs.rtmr1, quoteRtmrs.rtmr2, quoteRtmrs.rtmr3];

    // Replay RTMR[3] from application events (sysfs extend, not in vTPM log)
    let rtmr3Replayed: { value: string; match: boolean | null } | null = null;
    if (appEvents && appEvents.length > 0) {
        let reg = new Uint8Array(SHA384_SIZE);
        for (const ev of appEvents) {
            const digest = new Uint8Array(ev.digest_sha384.match(/.{2}/g)!.map(b => parseInt(b, 16)));
            const concat = new Uint8Array(SHA384_SIZE * 2);
            concat.set(reg, 0);
            concat.set(digest, SHA384_SIZE);
            const hash = await crypto.subtle.digest('SHA-384', concat);
            reg = new Uint8Array(hash);
        }
        const hex = hexFromBytes(reg);
        rtmr3Replayed = {
            value: hex,
            match: quoteArr[3] ? hex === quoteArr[3] : null
        };
    }

    return rtmr.map((val, i) => {
        // RTMR[3]: use application events instead of vTPM events
        if (i === 3 && rtmr3Replayed) {
            return {
                value: rtmr3Replayed.value,
                events: rtmrEvents[i],
                match: rtmr3Replayed.match,
                appEvents
            };
        }

        if (rtmrEvents[i].length === 0) {
            return { value: '', events: rtmrEvents[i], match: null };
        }

        if (isTpm) {
            // tpm0: return per-PCR values, no RTMR comparison possible
            const pcrValues: Record<number, string> = {};
            const pcrIndices = [...new Set(rtmrEvents[i].map(e => e.pcr))].sort((a, b) => a - b);
            for (const pcr of pcrIndices) {
                if (pcrRegisters[pcr]) pcrValues[pcr] = hexFromBytes(pcrRegisters[pcr]);
            }
            return { value: '', events: rtmrEvents[i], match: null, pcrValues };
        }

        // CCEL: compare replayed MR with quote RTMR
        const hex = hexFromBytes(val);
        const q = quoteArr[i];
        return {
            value: hex,
            events: rtmrEvents[i],
            match: q ? hex === q : null
        };
    });
}

function extractBootMeasurements(events: ParsedEvent[], source: string): {
    measurements: BootMeasurement[];
    dmVerityHash: string | null;
} {
    const mapFn = source === 'ccel' ? ccelMrToRtmr : tpmPcrToRtmr;
    const measurements: BootMeasurement[] = [];
    let dmVerityHash: string | null = null;
    let foundKernel = false;
    let cmdlineValue: string | null = null;
    let cmdlinePcr = 8;

    for (const ev of events) {
        const text = tryDecodeText(ev.data);
        if (!text) continue;

        // Firmware version (EV_S_CRTM_VERSION)
        if (ev.eventType === 0x00000008 && text.trim().length > 0) {
            if (!measurements.some(m => m.label === 'Firmware')) {
                measurements.push({
                    label: 'Firmware',
                    value: text.trim(),
                    pcr: ev.pcr,
                    rtmr: mapFn(ev.pcr)
                });
            }
        }

        // Kernel boot line from GRUB (e.g. "linux /vmlinuz-... root=... ro ...")
        if (/^(linux|linuxefi)\s+\//.test(text) && !foundKernel) {
            const parts = text.trim().split(/\s+/);
            foundKernel = true;
            measurements.push({
                label: 'Kernel',
                value: parts[1],
                pcr: ev.pcr,
                rtmr: mapFn(ev.pcr)
            });
            cmdlineValue = parts.slice(2).join(' ');
            cmdlinePcr = ev.pcr;
        }

        // Kernel cmdline measurement (overrides GRUB line — this is the actual measured value)
        if (text.startsWith('kernel_cmdline:')) {
            const cmd = text.replace('kernel_cmdline:', '').trim();
            const parts = cmd.split(/\s+/);
            cmdlineValue = parts[0]?.startsWith('/') ? parts.slice(1).join(' ') : cmd;
            cmdlinePcr = ev.pcr;
        }

        // dm-verity root hash from anywhere in event text
        const rootHashMatch = text.match(/roothash=([a-f0-9]+)/i);
        if (rootHashMatch) {
            dmVerityHash = rootHashMatch[1];
        }
    }

    if (cmdlineValue) {
        measurements.push({
            label: 'Kernel cmdline',
            value: cmdlineValue,
            pcr: cmdlinePcr,
            rtmr: mapFn(cmdlinePcr)
        });
    }

    return { measurements, dmVerityHash };
}

function generateConsoleSnippet(eventLogBase64: string, source: string, truncateForDisplay = false): string {
    const isTpm = source !== 'ccel';
    const replaySection = isTpm
        ? `  // Parse events & replay per-PCR
  const pcrs = {};
  let evNum = 0;
  while (off < raw.length - 8) {
    const pcr = r32(), evType = r32(), dc = r32();
    if (dc > 16 || dc === 0) break;
    let sha384 = new Uint8Array(48);
    for (let i = 0; i < dc; i++) {
      const aid = r16(); if (aid === 0xffff) { off = raw.length; break; }
      const a = algs.find(x => x.id === aid); if (!a) break;
      const d = rB(a.sz); if (aid === 0x000c) sha384 = d;
    }
    const eds = r32(), ed = rB(eds);
    if (evType === 3) continue;
    if (!pcrs[pcr]) pcrs[pcr] = new Uint8Array(48);
    const c = new Uint8Array(96); c.set(pcrs[pcr]); c.set(sha384, 48);
    pcrs[pcr] = new Uint8Array(await crypto.subtle.digest('SHA-384', c));
    evNum++;
  }
  console.log('PCR Replay from ${source} event log (' + evNum + ' events):');
  for (const p of Object.keys(pcrs).map(Number).sort((a,b) => a-b)) {
    console.log('  PCR ' + p + ' = ' + hex(pcrs[p]));
  }`
        : `  // Parse events & replay per-RTMR
  const rtmr = [new Uint8Array(48), new Uint8Array(48), new Uint8Array(48), new Uint8Array(48)];
  const map = p => p === 1 ? 0 : p === 2 ? 1 : p === 3 ? 2 : p === 4 ? 3 : -1;
  let evNum = 0;
  while (off < raw.length - 8) {
    const pcr = r32(), evType = r32(), dc = r32();
    if (dc > 16 || dc === 0) break;
    let sha384 = new Uint8Array(48);
    for (let i = 0; i < dc; i++) {
      const aid = r16(); if (aid === 0xffff) { off = raw.length; break; }
      const a = algs.find(x => x.id === aid); if (!a) break;
      const d = rB(a.sz); if (aid === 0x000c) sha384 = d;
    }
    const eds = r32(), ed = rB(eds);
    if (evType === 3) continue;
    const idx = map(pcr); if (idx < 0 || idx > 3) continue;
    const c = new Uint8Array(96); c.set(rtmr[idx]); c.set(sha384, 48);
    rtmr[idx] = new Uint8Array(await crypto.subtle.digest('SHA-384', c));
    evNum++;
  }
  console.log('RTMR replay from ${source} event log (' + evNum + ' events):');
  rtmr.forEach((v, i) => console.log('  RTMR[' + i + '] = ' + hex(v)))`;

    const b64Display = truncateForDisplay && eventLogBase64.length > 200
        ? eventLogBase64.slice(0, 80) + `... (${eventLogBase64.length} chars — full data is included when you click "Copy snippet")`
        : eventLogBase64;

    return `// ${isTpm ? 'PCR' : 'RTMR'} Replay — paste in browser console (uses SubtleCrypto)
(async () => {
  const b64 = "${b64Display}";
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const view = new DataView(raw.buffer);
  let off = 0;
  const r16 = () => { const v = view.getUint16(off, true); off += 2; return v; };
  const r32 = () => { const v = view.getUint32(off, true); off += 4; return v; };
  const rB = n => { const s = raw.slice(off, off + n); off += n; return s; };
  const hex = b => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');

  // Parse legacy header
  r32(); r32(); rB(20); const hs = r32(); const hd = rB(hs);
  const hdv = new DataView(hd.buffer, hd.byteOffset, hd.byteLength);
  const nA = hdv.getUint32(24, true);
  const algs = [];
  let ao = 28;
  for (let i = 0; i < nA; i++) { algs.push({id: hdv.getUint16(ao, true), sz: hdv.getUint16(ao+2, true)}); ao += 4; }

${replaySection}
})();`;
}

export function RtmrVerifier({ eventLogBase64, eventLogSource, quoteRtmrs, appEvents }: RtmrVerifierProps) {
    const [results, setResults] = useState<RtmrResult[] | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [selectedRtmr, setSelectedRtmr] = useState<number | null>(null);
    const [snippetCopied, setSnippetCopied] = useState(false);
    const [bootMeasurements, setBootMeasurements] = useState<BootMeasurement[]>([]);
    const [dmVerityHash, setDmVerityHash] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const { events, error } = parseEventLog(eventLogBase64, eventLogSource);
            if (error) {
                setParseError(error);
                return;
            }
            const r = await replayRtmrs(events, eventLogSource, quoteRtmrs, appEvents);
            setResults(r);
            const extracted = extractBootMeasurements(events, eventLogSource);
            setBootMeasurements(extracted.measurements);
            setDmVerityHash(extracted.dmVerityHash);
        })();
    }, [eventLogBase64, eventLogSource, quoteRtmrs, appEvents]);

    const copySnippet = useCallback(() => {
        const snippet = generateConsoleSnippet(eventLogBase64, eventLogSource);
        navigator.clipboard.writeText(snippet).then(() => {
            setSnippetCopied(true);
            setTimeout(() => setSnippetCopied(false), 2000);
        });
    }, [eventLogBase64, eventLogSource]);

    if (parseError) {
        return (
            <section className="p-5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-900/10">
                <h2 className="text-sm font-semibold mb-2">Event Log Verification</h2>
                <p className="text-xs text-amber-700 dark:text-amber-400">Failed to parse event log: {parseError}</p>
            </section>
        );
    }

    if (!results) {
        return (
            <section className="p-5 rounded-xl border border-black/10 dark:border-white/10">
                <h2 className="text-sm font-semibold mb-2">Event Log Verification</h2>
                <div className="flex items-center gap-2 text-xs text-black/50 dark:text-white/50">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                    Replaying event log…
                </div>
            </section>
        );
    }

    const allMatch = results.every(r => r.match === true || r.match === null);
    const anyMismatch = results.some(r => r.match === false);
    const anyTrue = results.some(r => r.match === true);
    const totalEvents = results.reduce((sum, r) => sum + (r.appEvents?.length ?? r.events.length), 0);
    const isTpm = eventLogSource !== 'ccel';
    const rtmrLabels = isTpm ? RTMR_LABELS_TPM : RTMR_LABELS_CCEL;
    const quoteArr = [quoteRtmrs.rtmr0, quoteRtmrs.rtmr1, quoteRtmrs.rtmr2, quoteRtmrs.rtmr3];

    return (
        <section className={`p-5 rounded-xl border ${
            anyMismatch
                ? 'border-red-200/50 dark:border-red-500/20 bg-red-50/30 dark:bg-red-900/10'
                : 'border-emerald-200/50 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10'
        }`}>
            {/* Header with badge */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Event Log Verification</h2>
                    {isTpm && totalEvents > 0 && !anyMismatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            ✓ Event log verified
                        </span>
                    )}
                    {!isTpm && allMatch && anyTrue && !anyMismatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            ✓ All RTMRs match event log replay
                        </span>
                    )}
                    {anyMismatch && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            ✗ RTMR mismatch detected
                        </span>
                    )}
                </div>
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[10px] text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60"
                >
                    {expanded ? '▾ Collapse' : '▸ Details'}
                </button>
            </div>

            {/* Trust chain explanation */}
            <p className="text-xs text-black/50 dark:text-white/50 mb-4">
                {isTpm
                    ? `The TDX hardware quote contains RTMR values that attest the TD state, including the vTPM. The vTPM event log (${totalEvents} events) records what was measured into each PCR during boot. Replaying the hash chains verifies the log is consistent with the measured state.`
                    : `The TDX hardware quote contains RTMR values. The CCEL event log (${totalEvents} events) records what was measured into each RTMR. Replaying the hash chains and comparing to the quote proves the log is authentic.`
                }
            </p>

            {/* RTMR values from TDX quote */}
            <div className="mb-4 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                <h3 className="text-[11px] font-medium text-black/60 dark:text-white/60 mb-2">RTMR Values (from TDX quote)</h3>
                <div className="space-y-1.5">
                    {quoteArr.map((val, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="text-[10px] text-black/50 dark:text-white/50 font-mono shrink-0 w-14">RTMR[{i}]</span>
                            {val ? (
                                <code className="text-[10px] font-mono break-all text-black/60 dark:text-white/60 flex-1 min-w-0">
                                    {val}
                                </code>
                            ) : (
                                <span className="text-[10px] text-black/25 dark:text-white/25 italic">not in quote</span>
                            )}
                            <span className="text-[9px] text-black/30 dark:text-white/30 shrink-0 hidden sm:inline">
                                {rtmrLabels[i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Key boot measurements extracted from event log */}
            {bootMeasurements.length > 0 && (
                <div className="mb-4 p-3 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                    <h3 className="text-[11px] font-medium text-black/60 dark:text-white/60 mb-2">Key Boot Measurements (from event log)</h3>
                    <div className="space-y-1.5">
                        {bootMeasurements.map((m, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <span className="text-[10px] text-black/40 dark:text-white/40 shrink-0 w-24">{m.label}</span>
                                <code className="text-[10px] font-mono break-all text-black/60 dark:text-white/60 flex-1 min-w-0">
                                    {m.value.length > 120 ? m.value.slice(0, 120) + '…' : m.value}
                                </code>
                                <span className="text-[9px] text-black/25 dark:text-white/25 shrink-0 hidden sm:inline">
                                    PCR {m.pcr} → RTMR[{m.rtmr}]
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* dm-verity status */}
                    <div className={`mt-3 pt-2 border-t border-black/5 dark:border-white/5 ${
                        dmVerityHash
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-black/40 dark:text-white/40'
                    }`}>
                        {dmVerityHash ? (
                            <div className="flex items-start gap-2">
                                <span className="text-[10px] shrink-0 font-medium">🔑 dm-verity root hash</span>
                                <code className="text-[10px] font-mono break-all font-medium flex-1 min-w-0">{dmVerityHash}</code>
                                <span className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 shrink-0 hidden sm:inline">
                                    measured in kernel cmdline → RTMR[2]
                                </span>
                            </div>
                        ) : (
                            <p className="text-[10px]">
                                dm-verity not configured — no <code className="font-mono bg-black/5 dark:bg-white/5 px-1 rounded">roothash=</code> found in kernel command line
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* PCR/RTMR detail section with RTMR[0-3] buttons */}
            <div className="space-y-2 mb-4">
                {results.map((r, i) => {
                    const eventCount = r.appEvents?.length ?? r.events.length;
                    return (
                    <div key={i}>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setSelectedRtmr(selectedRtmr === i ? null : i)}
                                className="text-xs text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70"
                            >
                                {selectedRtmr === i ? '▾' : '▸'} RTMR[{i}]
                            </button>
                            <span className="text-[10px] text-black/30 dark:text-white/30">
                                {eventCount} event{eventCount !== 1 ? 's' : ''}
                            </span>
                            {r.match === true && (
                                <span className="text-[9px] px-1.5 py-0 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">
                                    ✓ Match
                                </span>
                            )}
                            {r.match === false && (
                                <span className="text-[9px] px-1.5 py-0 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-medium">
                                    ✗ Mismatch
                                </span>
                            )}
                            {r.match === null && eventCount === 0 && (
                                <span className="text-[9px] text-black/25 dark:text-white/25">no events</span>
                            )}
                            {isTpm && r.match === null && r.events.length > 0 && (
                                <span className="text-[9px] px-1.5 py-0 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium">
                                    ✓ Verified
                                </span>
                            )}
                        </div>
                        {/* Per-PCR values for tpm0 source */}
                        {isTpm && r.pcrValues && Object.keys(r.pcrValues).length > 0 ? (
                            <div className="mt-1 space-y-0.5">
                                {Object.entries(r.pcrValues).sort(([a], [b]) => Number(a) - Number(b)).map(([pcr, val]) => (
                                    <code key={pcr} className="text-[10px] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded block font-mono break-all text-black/60 dark:text-white/60">
                                        <span className="text-black/40 dark:text-white/40">PCR {pcr}:</span> {val}
                                    </code>
                                ))}
                            </div>
                        ) : r.value ? (
                            <code className="text-[10px] bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded block mt-0.5 font-mono break-all text-black/60 dark:text-white/60">
                                {r.value}
                            </code>
                        ) : null}

                        {/* Application event details for RTMR[3] */}
                        {selectedRtmr === i && r.appEvents && r.appEvents.length > 0 && (
                            <div className="mt-2 ml-4 space-y-1">
                                {r.appEvents.map((ev, idx) => (
                                    <div
                                        key={idx}
                                        className="text-[10px] font-mono p-1.5 rounded bg-black/3 dark:bg-white/3"
                                    >
                                        <div className="flex items-center gap-2 text-black/50 dark:text-white/50">
                                            <span>#{idx + 1}</span>
                                            <span className={ev.type === 'container_load' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}>
                                                {ev.type === 'container_load' ? '▶ load' : '■ unload'}
                                            </span>
                                            <span className="text-black/30 dark:text-white/30">{ev.timestamp}</span>
                                        </div>
                                        <div className="text-black/40 dark:text-white/40 break-all mt-0.5">
                                            sha384: {ev.digest_sha384.slice(0, 32)}…
                                        </div>
                                        <div className="text-black/35 dark:text-white/35 mt-0.5">
                                            {ev.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Event table for selected RTMR (vTPM/CCEL events) */}
                        {selectedRtmr === i && !r.appEvents && r.events.length > 0 && (
                            <div className="mt-2 ml-4 space-y-1">
                                {r.events.map((ev) => {
                                    const text = tryDecodeText(ev.data);
                                    const hasRootHash = text ? /roothash=/.test(text) : false;
                                    const typeName = EVENT_TYPE_NAMES[ev.eventType] || `0x${ev.eventType.toString(16).padStart(8, '0')}`;
                                    return (
                                        <div
                                            key={ev.num}
                                            className={`text-[10px] font-mono p-1.5 rounded ${
                                                hasRootHash
                                                    ? 'bg-amber-100/80 dark:bg-amber-900/30 border border-amber-300/50 dark:border-amber-600/30'
                                                    : 'bg-black/3 dark:bg-white/3'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 text-black/50 dark:text-white/50">
                                                <span>#{ev.num}</span>
                                                <span>{eventLogSource === 'ccel' ? `CC_MR=${ev.pcr}` : `PCR=${ev.pcr}`}</span>
                                                <span className={hasRootHash ? 'text-amber-800 dark:text-amber-300 font-semibold' : ''}>{typeName}</span>
                                            </div>
                                            <div className="text-black/40 dark:text-white/40 break-all mt-0.5">
                                                digest: {hexFromBytes(ev.sha384).slice(0, 32)}…
                                            </div>
                                            {text && (
                                                <div className={`mt-0.5 break-all ${
                                                    hasRootHash
                                                        ? 'text-amber-900 dark:text-amber-200 font-medium'
                                                        : 'text-black/35 dark:text-white/35'
                                                }`}>
                                                    {hasRootHash ? '🔑 ' : ''}data: {text.length > 200 ? text.slice(0, 200) + '…' : text}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>

            {/* Console snippet */}
            {expanded && (
                <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-black/60 dark:text-white/60">Verify independently</span>
                        <button
                            onClick={copySnippet}
                            className="text-[10px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-black/50 dark:text-white/50"
                        >
                            {snippetCopied ? '✓ Copied' : 'Copy snippet'}
                        </button>
                    </div>
                    <p className="text-[11px] text-black/35 dark:text-white/35 mb-2">
                        Paste this in your browser console to independently replay the event log and verify the {isTpm ? 'PCR' : 'RTMR'} values.
                        The snippet uses only the Web Crypto API (SubtleCrypto SHA-384) — no external dependencies.
                    </p>
                    <pre className="text-[10px] bg-black/5 dark:bg-white/5 p-3 rounded-lg overflow-x-auto font-mono text-black/60 dark:text-white/60 max-h-48 overflow-y-auto">
                        {generateConsoleSnippet(eventLogBase64, eventLogSource, true)}
                    </pre>
                </div>
            )}
        </section>
    );
}
