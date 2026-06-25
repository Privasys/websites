import type { ReleaseField } from './types';

// Opt-in resolver mapping a hardware measurement to the official Privasys
// Enclave OS GitHub release page that publishes its predicted value. Consumers
// pass this to AttestationResultView's `resolveReleaseUrl` prop to render a
// "release ↗" link next to MRENCLAVE / MR_TD / RTMR rows, letting anyone
// compare the live measurement against the published one.
//
// Routing is by measurement type, which maps cleanly onto the two product
// lines: SGX measurements (MRENCLAVE / MRSIGNER) come from Enclave OS Mini;
// TDX measurements (MR_TD / RTMRs) come from Enclave OS Virtual.
//
// This is intentionally NOT the component's default — the core view stays free
// of hard-coded URLs — but it lives in the lib so every Privasys front renders
// the same links without duplicating them.
const MINI_RELEASES = 'https://github.com/Privasys/enclave-os-mini/releases';
const VIRTUAL_RELEASES = 'https://github.com/Privasys/enclave-os-virtual/releases';

export function privasysReleaseResolver(field: ReleaseField): string | undefined {
    switch (field) {
        case 'mr_enclave':
        case 'mr_signer':
            return MINI_RELEASES;
        case 'mr_td':
        case 'rtmr0':
        case 'rtmr1':
        case 'rtmr2':
        case 'rtmr3':
            return VIRTUAL_RELEASES;
        default:
            return undefined;
    }
}
