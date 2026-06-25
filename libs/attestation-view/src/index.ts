// @privasys/attestation-view
//
// Shared types, hook and React components for rendering Privasys-platform
// attestations. Consumed by developer.privasys.org, chat.privasys.org
// and (in a follow-up) explorer.privasys.org.

export * from './types';
export * from './use-attestation';
export { privasysReleaseResolver } from './release-resolver';
export { AttestationConnect } from './components/attestation-connect';
export { AttestationResultView } from './components/attestation-result-view';
export { CompositeAttestationView } from './components/composite-attestation-view';
export type { AttestationTargetConfig, CompositeAttestationViewProps, AggregateAttestationStatus } from './components/composite-attestation-view';
export { FieldRow } from './components/field-row';
