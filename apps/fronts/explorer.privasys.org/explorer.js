/* WASM App Explorer — standalone attestation & API testing */
(function () {
    'use strict';

    // ── State ──────────────────────────────────────
    let baseUrl = '';
    let appName = '';
    let authToken = '';
    let attestationServerUrl = '';
    let attestationServerToken = '';
    let currentTab = 'attestation';

    // Attestation state
    let attestResult = null;
    let attestLoading = false;
    let challenge = generateHex(32);
    let verifyResult = null;
    let verifyDebug = null;
    let quoteVerifyResult = null;
    let quoteVerifying = false;

    // API state
    let schema = null;
    let schemaLoading = false;
    let schemaError = null;
    let selectedFunc = '';
    let paramValues = {};
    let rpcResponse = null;
    let rpcStatus = null;
    let rpcElapsed = null;
    let rpcError = null;
    let rpcSending = false;
    let history = [];
    let historyId = 0;

    // ── Helpers ────────────────────────────────────
    function $(sel, ctx) { return (ctx || document).querySelector(sel); }
    function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
    function h(tag, attrs, ...children) {
        const el = document.createElement(tag);
        if (attrs) for (const [k, v] of Object.entries(attrs)) {
            if (k === 'className') el.className = v;
            else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'html') el.innerHTML = v;
            else el.setAttribute(k, v);
        }
        for (const c of children.flat(Infinity)) {
            if (c == null || c === false) continue;
            el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
        }
        return el;
    }

    function generateHex(bytes) {
        const arr = new Uint8Array(bytes);
        crypto.getRandomValues(arr);
        return Array.from(arr, b => b.toString(16).padStart(2, '0')).join('');
    }

    function hexToText(hex) {
        try {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));
            const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            if (/^[\x20-\x7e]+$/.test(text)) return text;
            return null;
        } catch { return null; }
    }

    function copyText(text) {
        navigator.clipboard.writeText(text).catch(function () {});
    }

    async function apiFetch(path, opts) {
        const url = baseUrl.replace(/\/+$/, '') + path;
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) headers['Authorization'] = 'Bearer ' + authToken;
        if (opts && opts.headers) Object.assign(headers, opts.headers);
        const res = await fetch(url, {
            ...opts,
            headers: headers
        });
        if (!res.ok) {
            const body = await res.json().catch(function () { return { error: res.statusText }; });
            throw new Error(body.error || body.message || 'HTTP ' + res.status);
        }
        if (res.status === 204) return null;
        return res.json();
    }

    const TEXT_OIDS = new Set(['1.3.6.1.4.1.65230.3.3', '1.3.6.1.4.1.65230.3.4']);
    const OID_DESCRIPTIONS = {
        'Config Merkle Root': 'Hash of the enclave configuration tree.',
        'Egress CA Hash': 'Hash of the CA certificate used for egress TLS.',
        'Runtime Version Hash': 'Hash identifying the runtime version inside the enclave.',
        'Combined Workloads Hash': 'Aggregate hash of all loaded WASM workloads.',
        'DEK Origin': 'Data Encryption Key origin.',
        'Attestation Servers Hash': 'Hash of the trusted attestation server list.',
        'Workload Config Merkle Root': 'Merkle root of this workload\'s configuration.',
        'Workload Code Hash': 'SHA-256 hash of the compiled WASM bytecode.',
        'Workload Image Ref': 'Container image reference.',
        'Workload Key Source': 'How the workload\'s encryption keys are sourced.',
        'Workload Permissions Hash': 'Hash of the security permissions granted to this workload.'
    };

    // ── WIT types ──────────────────────────────────
    function witTypeLabel(ty) {
        if (!ty) return '?';
        switch (ty.kind) {
            case 'string': case 'bool': case 'char':
            case 'u8': case 'u16': case 'u32': case 'u64':
            case 's8': case 's16': case 's32': case 's64':
            case 'f32': case 'f64': case 'float32': case 'float64':
                return ty.kind.replace('float32', 'f32').replace('float64', 'f64');
            case 'list': return ty.element ? 'list<' + witTypeLabel(ty.element) + '>' : 'list';
            case 'option': return ty.inner ? 'option<' + witTypeLabel(ty.inner) + '>' : 'option';
            case 'result': return 'result<' + (ty.ok ? witTypeLabel(ty.ok) : '_') + ', ' + (ty.err ? witTypeLabel(ty.err) : '_') + '>';
            case 'record': return 'record';
            case 'tuple': return ty.elements ? 'tuple<' + ty.elements.map(witTypeLabel).join(', ') + '>' : 'tuple';
            case 'variant': return 'variant';
            case 'enum': return ty.names ? 'enum{' + ty.names.join('|') + '}' : 'enum';
            case 'flags': return 'flags';
            default: return ty.kind;
        }
    }

    function defaultValue(ty) {
        if (!ty) return '';
        switch (ty.kind) {
            case 'string': case 'char': return '';
            case 'bool': return false;
            case 'u8': case 'u16': case 'u32': case 'u64':
            case 's8': case 's16': case 's32': case 's64':
            case 'f32': case 'f64': case 'float32': case 'float64': return 0;
            case 'list': return [];
            case 'option': return null;
            case 'record':
                if (ty.fields) {
                    var o = {};
                    for (var i = 0; i < ty.fields.length; i++) o[ty.fields[i].name] = defaultValue(ty.fields[i].type);
                    return o;
                }
                return {};
            default: return '';
        }
    }

    // ── Connect ────────────────────────────────────
    function handleConnect() {
        var fullInput = ($('#endpoint-input') || {}).value || '';
        fullInput = fullInput.trim();
        var baseInput = ($('#base-url-input') || {}).value || '';
        baseInput = baseInput.trim();
        var nameInput = ($('#app-name-input') || {}).value || '';
        nameInput = nameInput.trim();

        authToken = ($('#auth-token-input') || {}).value || '';
        authToken = authToken.trim();
        attestationServerUrl = ($('#attestation-url-input') || {}).value || '';
        attestationServerUrl = attestationServerUrl.trim().replace(/\/+$/, '');
        attestationServerToken = ($('#attestation-token-input') || {}).value || '';
        attestationServerToken = attestationServerToken.trim();

        if (fullInput) {
            var match = fullInput.match(/^(https?:\/\/[^/]+(?:\/[^/]+)*?)\/api\/v1\/apps\/([^/?#]+)\/?$/i);
            if (match) {
                baseUrl = match[1];
                appName = decodeURIComponent(match[2]);
            } else {
                baseUrl = fullInput;
                appName = nameInput;
            }
        } else if (baseInput && nameInput) {
            baseUrl = baseInput;
            appName = nameInput;
        }

        if (!baseUrl || !appName) {
            alert('Provide a base URL and app name.');
            return;
        }

        document.body.classList.add('connected');
        $('#connected-view').classList.remove('hidden');
        $('#connection-info').textContent = appName + ' — ' + baseUrl;
        renderTabs();
        switchTab('attestation');
    }

    // ── Tab switching ──────────────────────────────
    function switchTab(tab) {
        currentTab = tab;
        $$('.tab-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.tab === tab); });
        if (tab === 'attestation') renderAttestation();
        else if (tab === 'api') renderApiTesting();
    }

    function renderTabs() {
        var container = $('#tab-container');
        container.innerHTML = '';
        container.appendChild(h('div', { className: 'tabs' },
            h('button', { 'className': 'tab-btn active', 'data-tab': 'attestation', 'onClick': function () { switchTab('attestation'); } }, 'Attestation'),
            h('button', { 'className': 'tab-btn', 'data-tab': 'api', 'onClick': function () { switchTab('api'); } }, 'API Testing')
        ));
        container.appendChild(h('div', { id: 'tab-content' }));
    }

    // ═══════════════════════════════════════════════
    // ATTESTATION TAB
    // ═══════════════════════════════════════════════

    async function doAttest() {
        attestLoading = true;
        attestResult = null;
        verifyResult = null;
        verifyDebug = null;
        quoteVerifyResult = null;
        quoteVerifying = false;
        renderAttestation();
        try {
            var trimmed = challenge.trim();
            if (trimmed && !/^[0-9a-fA-F]{32,128}$/.test(trimmed)) {
                throw new Error('Challenge must be 32-128 hex characters');
            }
            var qs = trimmed ? '?challenge=' + encodeURIComponent(trimmed) : '';
            var data = await apiFetch('/api/v1/apps/' + encodeURIComponent(appName) + '/attest' + qs);
            attestResult = data;
            attestLoading = false;
            renderAttestation();
            // Auto-verify ReportData in challenge mode
            if (data.challenge_mode && data.quote && data.quote.report_data && data.certificate && data.certificate.public_key_sha256 && data.challenge) {
                await verifyReportData();
            }
            // Auto-verify quote signature via attestation server
            if (attestationServerUrl && data.quote && data.quote.raw_base64 && !data.quote.is_mock) {
                verifyQuoteSignature(data.quote.raw_base64);
            }
        } catch (e) {
            attestLoading = false;
            attestResult = null;
            renderAttestation();
            alert('Attestation failed: ' + e.message);
        }
    }

    async function verifyReportData() {
        if (!attestResult) return;
        var r = attestResult;
        try {
            var pkHex = r.certificate.public_key_sha256;
            var ch = r.challenge;
            var pubKeySha256 = new Uint8Array(pkHex.match(/.{1,2}/g).map(function (b) { return parseInt(b, 16); }));
            var nonce = new Uint8Array(ch.match(/.{1,2}/g).map(function (b) { return parseInt(b, 16); }));
            var concat = new Uint8Array(pubKeySha256.length + nonce.length);
            concat.set(pubKeySha256);
            concat.set(nonce, pubKeySha256.length);
            var hash = await crypto.subtle.digest('SHA-512', concat);
            var computed = Array.from(new Uint8Array(hash), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
            var actual = r.quote.report_data.toLowerCase();
            verifyDebug = { computed: computed, actual: actual };
            verifyResult = computed === actual ? 'match' : 'mismatch';
        } catch (e) {
            verifyResult = 'error';
        }
        renderAttestation();
    }

    async function verifyQuoteSignature(rawBase64) {
        quoteVerifying = true;
        quoteVerifyResult = null;
        renderAttestation();
        try {
            var url = attestationServerUrl + '/verify';
            var headers = { 'Content-Type': 'application/json' };
            if (attestationServerToken) headers['Authorization'] = 'Bearer ' + attestationServerToken;
            var res = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ quote: rawBase64 })
            });
            if (!res.ok) {
                var errBody = await res.json().catch(function () { return {}; });
                throw new Error(errBody.error || errBody.message || 'HTTP ' + res.status);
            }
            quoteVerifyResult = await res.json();
        } catch (e) {
            quoteVerifyResult = { error: e.message };
        } finally {
            quoteVerifying = false;
            renderAttestation();
        }
    }

    function renderAttestation() {
        var content = $('#tab-content');
        if (!content) return;
        content.innerHTML = '';

        if (!attestResult) {
            var wrap = h('div', null,
                h('div', { className: 'empty-state' },
                    h('div', { className: 'icon' }, '\uD83D\uDEE1'),
                    h('h3', null, 'Remote Attestation'),
                    h('p', null, 'Connect to the enclave via RA-TLS and inspect the x.509 certificate, SGX/TDX quote, and attestation extensions.')
                ),
                h('div', { className: 'challenge-input-group' },
                    h('label', null, 'Challenge Nonce'),
                    h('div', { className: 'row' },
                        h('input', { id: 'challenge-input', type: 'text', value: challenge, maxLength: '128', placeholder: '32-128 hex chars', onInput: function (e) { challenge = e.target.value.replace(/[^0-9a-fA-F]/g, ''); } }),
                        h('button', { className: 'btn btn-outline btn-sm', onClick: function () { challenge = generateHex(32); $('#challenge-input').value = challenge; } }, 'Regenerate')
                    ),
                    h('div', { className: 'hint' }, 'Random nonce to prove the certificate was generated for this request. Leave empty for deterministic mode.')
                ),
                h('div', { className: 'text-center mt-4' },
                    attestLoading
                        ? h('span', { className: 'flex items-center gap-2', style: 'justify-content:center' }, h('span', { className: 'loading-spinner' }), ' Connecting\u2026')
                        : h('button', { className: 'btn', id: 'inspect-btn', onClick: doAttest }, 'Inspect Certificate')
                )
            );
            content.appendChild(wrap);
            return;
        }

        var r = attestResult;
        var els = [];

        // Challenge banner
        if (r.challenge_mode && r.challenge) {
            var color = verifyResult === 'match' ? 'emerald' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'red' : 'amber';
            var badgeText = verifyResult === 'match' ? '\u2713 Match \u2014 freshness verified' : verifyResult === 'mismatch' ? '\u2717 Mismatch' : verifyResult === 'error' ? '\u2717 Error' : 'Verifying\u2026';
            var badgeCls = verifyResult === 'match' ? 'badge-ok' : verifyResult === 'mismatch' || verifyResult === 'error' ? 'badge-err' : 'badge-warn';
            var style = color === 'red' ? 'border-color:rgba(220,38,38,0.3);background:rgba(220,38,38,0.04)' : color === 'amber' ? 'border-color:rgba(217,119,6,0.3);background:rgba(217,119,6,0.04)' : '';
            els.push(h('div', { className: 'card' + (color === 'emerald' ? ' card-emerald' : ''), style: style },
                h('div', { className: 'card-body' },
                    h('div', { className: 'flex items-center gap-2 mb-2' },
                        h('span', null, '\uD83D\uDD10'),
                        h('strong', { className: 'text-xs' }, 'Challenge Mode Active'),
                        h('span', { className: 'badge ' + badgeCls }, badgeText)
                    ),
                    h('div', { className: 'text-xxs text-muted mb-2' }, 'This certificate was freshly generated in response to your challenge nonce.'),
                    h('div', { className: 'text-xxs text-muted' }, 'Challenge sent:'),
                    h('div', { className: 'field-value', style: 'font-size:11px' }, r.challenge)
                )
            ));
        } else if (r.challenge_mode === false) {
            els.push(h('div', { className: 'card' },
                h('div', { className: 'card-body text-center text-xxs text-muted' },
                    h('strong', null, 'Deterministic mode'), ' \u2014 certificate may be reused across connections. Use challenge mode for freshness.'
                )
            ));
        }

        // Actions
        els.push(h('div', { className: 'actions-bar' },
            h('button', { className: 'btn btn-outline btn-sm', onClick: doAttest }, attestLoading ? 'Refreshing\u2026' : 'Refresh'),
            h('button', { className: 'btn btn-outline btn-sm', onClick: function () { downloadBlob(r.pem, 'enclave-certificate.pem', 'application/x-pem-file'); } }, 'Download PEM'),
            h('button', { className: 'btn btn-outline btn-sm', style: 'margin-left:auto', onClick: function () { attestResult = null; verifyResult = null; quoteVerifyResult = null; challenge = generateHex(32); renderAttestation(); } }, 'New Challenge')
        ));

        // TLS
        if (r.tls) {
            els.push(renderCard('TLS Connection', null, [
                renderField('Protocol', r.tls.version),
                renderField('Cipher Suite', r.tls.cipher_suite)
            ]));
        }

        // Certificate
        if (r.certificate) {
            els.push(renderCard('x.509 Certificate', null, [
                { label: 'Subject', value: r.certificate.subject, desc: 'The entity this certificate identifies.' },
                { label: 'Issuer', value: r.certificate.issuer, desc: 'Certificate authority that issued the cert.' },
                { label: 'Serial Number', value: r.certificate.serial_number },
                { label: 'Valid From', value: r.certificate.not_before },
                { label: 'Valid Until', value: r.certificate.not_after },
                { label: 'Signature Algorithm', value: r.certificate.signature_algorithm },
                { label: 'Public Key SHA-256', value: r.certificate.public_key_sha256, desc: 'SHA-256 fingerprint of the public key.' }
            ].map(function (f) { return renderField(f.label, f.value, f.desc); })));
        }

        // Quote (SGX or TDX)
        if (r.quote) {
            var quoteFields = [
                { label: 'Quote Type', value: r.quote.type },
                r.quote.format ? { label: 'Format', value: r.quote.format } : null,
                r.quote.version != null ? { label: 'Version', value: String(r.quote.version) } : null,
                r.quote.mr_enclave ? { label: 'MRENCLAVE', value: r.quote.mr_enclave, desc: 'Hash of the enclave binary. Uniquely identifies the build.' } : null,
                r.quote.mr_signer ? { label: 'MRSIGNER', value: r.quote.mr_signer, desc: 'Hash of the signer\'s public key.' } : null,
                r.quote.mr_td ? { label: 'MR_TD', value: r.quote.mr_td, desc: 'Measurement of the Trust Domain (TD). Uniquely identifies the TD firmware and configuration.' } : null,
                r.quote.rtmr0 ? { label: 'RTMR[0]', value: r.quote.rtmr0, desc: 'Runtime Measurement Register 0 \u2014 measures the TD firmware (TDVF) and its configuration.' } : null,
                r.quote.rtmr1 ? { label: 'RTMR[1]', value: r.quote.rtmr1, desc: 'Runtime Measurement Register 1 \u2014 measures the OS kernel, initrd, and boot parameters.' } : null,
                r.quote.rtmr2 ? { label: 'RTMR[2]', value: r.quote.rtmr2, desc: 'Runtime Measurement Register 2 \u2014 measures the OS runtime components and application layer.' } : null,
                r.quote.rtmr3 ? { label: 'RTMR[3]', value: r.quote.rtmr3, desc: 'Runtime Measurement Register 3 \u2014 available for application-defined measurements.' } : null,
                r.quote.report_data ? { label: 'Report Data', value: r.quote.report_data, desc: r.challenge_mode ? 'SHA-512(SHA-256(pubkey) \u2016 challenge). A match proves freshness.' : 'SHA-512(SHA-256(pubkey) \u2016 timestamp).' } : null,
                r.quote.oid ? { label: 'OID', value: r.quote.oid } : null
            ].filter(Boolean);

            var quoteEls = quoteFields.map(function (f) {
                var el = renderField(f.label, f.value, f.desc);
                if (f.label === 'Report Data' && verifyResult) {
                    var badge = verifyResult === 'match'
                        ? h('span', { className: 'badge badge-ok mt-2' }, '\u2713 Verified')
                        : h('span', { className: 'badge badge-err mt-2' }, '\u2717 ' + (verifyResult === 'mismatch' ? 'Mismatch' : 'Error'));
                    el.appendChild(badge);
                }
                return el;
            });

            if (r.quote.is_mock) {
                quoteEls.unshift(h('span', { className: 'badge badge-warn' }, 'Mock'));
            }

            var quoteTitle = r.quote.type === 'TDX' ? 'TDX Quote' : 'SGX Quote';
            els.push(renderCard(quoteTitle, null, quoteEls));
        }

        // Quote signature verification via attestation server
        if (attestationServerUrl && r.quote && r.quote.raw_base64 && !r.quote.is_mock) {
            els.push(renderQuoteVerificationCard());
        }

        // Platform extensions
        if (r.extensions && r.extensions.length > 0) {
            els.push(renderExtCard('Platform Attestation Extensions', 'Platform-level x.509 extensions (OIDs 1.x/2.x) from the enclave certificate.', r.extensions, false, r));
        }

        // Workload extensions
        if (r.app_extensions && r.app_extensions.length > 0) {
            els.push(renderExtCard('Workload Attestation Extensions', 'Per-workload x.509 extensions (OIDs 3.x) via SNI routing.', r.app_extensions, true, r));
        }

        // PEM
        if (r.pem) els.push(renderPemCard('Platform PEM Certificate', r.pem));
        if (r.app_pem) els.push(renderPemCard('Workload PEM Certificate', r.app_pem, true));

        for (var i = 0; i < els.length; i++) content.appendChild(els[i]);
    }

    function renderQuoteVerificationCard() {
        if (quoteVerifying) {
            return h('div', { className: 'card', id: 'quote-verify-card' },
                h('div', { className: 'card-header' }, h('h3', null, 'Quote Signature Verification')),
                h('div', { className: 'card-body text-center' },
                    h('span', { className: 'loading-spinner' }), ' Verifying quote via attestation server\u2026'
                )
            );
        }
        if (!quoteVerifyResult) return h('span');

        if (quoteVerifyResult.error) {
            return h('div', { className: 'card', id: 'quote-verify-card' },
                h('div', { className: 'card-header' },
                    h('h3', null, 'Quote Signature Verification'),
                    h('span', { className: 'badge badge-err' }, '\u2717 Failed')
                ),
                h('div', { className: 'card-body' },
                    h('p', { style: 'color:var(--red)' }, quoteVerifyResult.error)
                )
            );
        }

        var qv = quoteVerifyResult;
        var ok = qv.verified || qv.status === 'verified' || qv.status === 'ok';
        var items = [];

        if (qv.tee_type) items.push(renderField('TEE Type', qv.tee_type));
        if (qv.tcb_date) items.push(renderField('TCB Date', qv.tcb_date));
        if (qv.tcb_status) items.push(renderField('TCB Status', qv.tcb_status));
        if (qv.mr_enclave) items.push(renderField('MRENCLAVE', qv.mr_enclave));
        if (qv.mr_signer) items.push(renderField('MRSIGNER', qv.mr_signer));
        if (qv.mr_td) items.push(renderField('MR_TD', qv.mr_td));
        if (qv.advisory_ids && qv.advisory_ids.length > 0) {
            items.push(renderField('Advisory IDs', qv.advisory_ids.join(', ')));
        }

        return h('div', { className: 'card' + (ok ? ' card-emerald' : ''), id: 'quote-verify-card' },
            h('div', { className: 'card-header' },
                h('h3', null, 'Quote Signature Verification'),
                h('span', { className: 'badge ' + (ok ? 'badge-ok' : 'badge-warn') }, ok ? '\u2713 Verified' : 'Unverified')
            ),
            h('div', { className: 'card-body' },
                h('p', null, 'Quote signature verified via ' + attestationServerUrl),
                ...items
            )
        );
    }

    function renderCard(title, desc, children) {
        return h('div', { className: 'card' },
            h('div', { className: 'card-header' }, h('h3', null, title)),
            h('div', { className: 'card-body' },
                desc ? h('p', null, desc) : null,
                ...children
            )
        );
    }

    function renderField(label, value, desc) {
        return h('div', { className: 'field' },
            h('div', { className: 'field-label' },
                h('span', null, label),
                h('button', { className: 'copy-btn', onClick: function () { copyText(value || ''); } }, '\u29C9')
            ),
            h('div', { className: 'field-value' }, value || '\u2014'),
            desc ? h('div', { className: 'field-desc' }, desc) : null
        );
    }

    function renderExtCard(title, desc, exts, emerald, result) {
        var items = exts.map(function (ext) {
            var text = TEXT_OIDS.has(ext.oid) ? hexToText(ext.value_hex) : null;
            var item = h('div', { className: 'ext-item' },
                h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'ext-label' }, ext.label),
                    h('button', { className: 'copy-btn', onClick: function () { copyText(ext.value_hex); } }, '\u29C9')
                ),
                h('div', { className: 'field-value' },
                    text
                        ? h('span', null, h('span', { style: 'opacity:0.9' }, text), ' ', h('span', { style: 'opacity:0.3;font-size:10px' }, '(' + ext.value_hex + ')'))
                        : ext.value_hex
                ),
                h('div', { className: 'ext-oid' }, ext.oid),
                OID_DESCRIPTIONS[ext.label] ? h('div', { className: 'field-desc' }, OID_DESCRIPTIONS[ext.label]) : null
            );
            if (ext.oid === '1.3.6.1.4.1.65230.3.2' && result && result.cwasm_hash) {
                var codeMatch = ext.value_hex.toLowerCase() === result.cwasm_hash.toLowerCase();
                item.appendChild(h('div', { className: 'mt-2' },
                    h('span', { className: 'badge ' + (codeMatch ? 'badge-ok' : 'badge-err') },
                        codeMatch ? '\u2713 Verified \u2014 matches uploaded CWASM hash' : '\u2717 Mismatch'
                    )
                ));
            }
            return item;
        });
        return h('div', { className: 'card' + (emerald ? ' card-emerald' : '') },
            h('div', { className: 'card-header' }, h('h3', null, title)),
            h('div', { className: 'card-body' }, desc ? h('p', null, desc) : null, ...items)
        );
    }

    function renderPemCard(title, pem, emerald) {
        return h('div', { className: 'card' + (emerald ? ' card-emerald' : '') },
            h('div', { className: 'card-header' },
                h('h3', null, title),
                h('div', { className: 'flex gap-2' },
                    h('button', { className: 'copy-btn', onClick: function () { downloadBlob(pem, title.indexOf('Workload') >= 0 ? 'workload-certificate.pem' : 'enclave-certificate.pem', 'application/x-pem-file'); } }, 'Download'),
                    h('button', { className: 'copy-btn', onClick: function () { copyText(pem); } }, 'Copy')
                )
            ),
            h('div', { className: 'card-body' }, h('pre', { className: 'pem-block' }, pem))
        );
    }

    function downloadBlob(text, name, type) {
        var blob = new Blob([text], { type: type });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ═══════════════════════════════════════════════
    // API TESTING TAB
    // ═══════════════════════════════════════════════

    function getAllFunctions(s) {
        var fns = (s.functions || []).slice();
        if (s.interfaces) {
            for (var i = 0; i < s.interfaces.length; i++) {
                var iface = s.interfaces[i];
                for (var j = 0; j < iface.functions.length; j++) {
                    fns.push(Object.assign({}, iface.functions[j], { name: iface.name + '.' + iface.functions[j].name }));
                }
            }
        }
        return fns;
    }

    function getSelectedFunction() {
        if (!schema) return null;
        return getAllFunctions(schema).find(function (f) { return f.name === selectedFunc; }) || null;
    }

    function initParams(fn) {
        paramValues = {};
        if (fn) {
            for (var i = 0; i < fn.params.length; i++) {
                paramValues[fn.params[i].name] = defaultValue(fn.params[i].type);
            }
        }
    }

    async function loadSchema() {
        schemaLoading = true;
        schemaError = null;
        schema = null;
        renderApiTesting();
        try {
            var resp = await apiFetch('/api/v1/apps/' + encodeURIComponent(appName) + '/schema');
            if (resp.status !== 'schema') throw new Error(resp.message || 'Failed to fetch schema');
            schema = resp.schema;
            var fns = getAllFunctions(schema);
            if (fns.length > 0) {
                selectedFunc = fns[0].name;
                initParams(fns[0]);
            }
        } catch (e) {
            schemaError = e.message;
        } finally {
            schemaLoading = false;
            renderApiTesting();
        }
    }

    async function sendRpc() {
        var fn = getSelectedFunction();
        if (!fn || rpcSending) return;
        rpcSending = true;
        rpcResponse = null;
        rpcStatus = null;
        rpcError = null;
        rpcElapsed = null;
        renderApiTesting();
        var start = performance.now();
        try {
            var data = await apiFetch('/api/v1/apps/' + encodeURIComponent(appName) + '/rpc/' + encodeURIComponent(fn.name), {
                method: 'POST',
                body: JSON.stringify(paramValues)
            });
            var ms = Math.round(performance.now() - start);
            var json = JSON.stringify(data, null, 2);
            rpcElapsed = ms;
            rpcResponse = json;
            rpcStatus = 'ok';
            history.unshift({ id: historyId++, func: fn.name, params: Object.assign({}, paramValues), response: json, status: 'ok', elapsed: ms, timestamp: new Date() });
            if (history.length > 20) history.length = 20;
        } catch (e) {
            var ms2 = Math.round(performance.now() - start);
            rpcElapsed = ms2;
            rpcError = e.message;
            rpcStatus = 'error';
            history.unshift({ id: historyId++, func: fn.name, params: Object.assign({}, paramValues), response: e.message, status: 'error', elapsed: ms2, timestamp: new Date() });
            if (history.length > 20) history.length = 20;
        } finally {
            rpcSending = false;
            renderApiTesting();
        }
    }

    function renderApiTesting() {
        var content = $('#tab-content');
        if (!content) return;
        content.innerHTML = '';

        if (!schema && !schemaLoading && !schemaError) {
            loadSchema();
            return;
        }

        if (schemaLoading) {
            content.appendChild(h('div', { className: 'empty-state' },
                h('span', { className: 'loading-spinner' }),
                h('p', { className: 'mt-2' }, 'Discovering API schema\u2026')
            ));
            return;
        }

        if (schemaError) {
            content.appendChild(h('div', { className: 'empty-state' },
                h('div', { className: 'icon' }, '\u26A0'),
                h('h3', null, 'Could not load API schema'),
                h('p', null, schemaError),
                h('button', { className: 'btn btn-sm mt-4', onClick: loadSchema }, 'Retry')
            ));
            return;
        }

        var allFuncs = getAllFunctions(schema);
        if (allFuncs.length === 0) {
            content.appendChild(h('div', { className: 'empty-state' },
                h('div', { className: 'icon' }, '\uD83D\uDCE6'),
                h('h3', null, 'No exported functions'),
                h('p', null, 'Ensure a WASM component with exports is deployed.')
            ));
            return;
        }

        var fn = getSelectedFunction();

        var selectEl = h('select', { className: 'rpc-select', onChange: function (e) { selectedFunc = e.target.value; var f = getAllFunctions(schema).find(function (x) { return x.name === e.target.value; }); initParams(f); rpcResponse = null; rpcStatus = null; rpcError = null; renderApiTesting(); } });
        for (var i = 0; i < allFuncs.length; i++) {
            var opt = h('option', { value: allFuncs[i].name }, '/rpc/' + schema.name + '/' + allFuncs[i].name);
            if (allFuncs[i].name === selectedFunc) opt.selected = true;
            selectEl.appendChild(opt);
        }

        var sigEl = null;
        if (fn) {
            var parts = [
                h('span', { className: 'sig-kw' }, 'fn'),
                ' ',
                h('span', { className: 'sig-fn' }, fn.name),
                h('span', { className: 'sig-sep' }, '(')
            ];
            fn.params.forEach(function (p, i) {
                if (i > 0) parts.push(h('span', { className: 'sig-sep' }, ', '));
                parts.push(h('span', { className: 'sig-pname' }, p.name), h('span', { className: 'sig-sep' }, ': '), h('span', { className: 'sig-type' }, witTypeLabel(p.type)));
            });
            parts.push(h('span', { className: 'sig-sep' }, ')'));
            if (fn.results && fn.results.length > 0) {
                parts.push(h('span', { className: 'sig-sep' }, ' \u2192 '));
                fn.results.forEach(function (r, i) {
                    if (i > 0) parts.push(h('span', { className: 'sig-sep' }, ', '));
                    parts.push(h('span', { className: 'sig-ret' }, witTypeLabel(r.type)));
                });
            }
            sigEl = h('div', { className: 'sig-bar' }, ...parts);
        }

        var paramsEl = h('div', { className: 'params-section' });
        if (fn && fn.params.length > 0) {
            paramsEl.appendChild(h('div', { className: 'params-label' }, 'Parameters'));
            for (var j = 0; j < fn.params.length; j++) {
                var row = h('div', { className: 'param-row' },
                    h('div', { className: 'param-info' },
                        h('div', { className: 'param-name' }, fn.params[j].name),
                        h('div', { className: 'param-type' }, witTypeLabel(fn.params[j].type))
                    )
                );
                row.appendChild(createParamInput(fn.params[j]));
                paramsEl.appendChild(row);
            }
        } else {
            paramsEl.appendChild(h('div', { className: 'text-xs text-muted', style: 'padding:8px 0' }, 'This function takes no parameters'));
        }

        var requestCard = h('div', { className: 'card' },
            h('div', { className: 'rpc-bar' },
                h('div', { className: 'rpc-method' }, 'POST'),
                selectEl,
                h('button', { className: 'rpc-send', id: 'rpc-send-btn', disabled: rpcSending || !selectedFunc, onClick: sendRpc },
                    rpcSending ? h('span', { className: 'loading-spinner', style: 'width:14px;height:14px;border-width:2px' }) : 'Send'
                )
            ),
            sigEl,
            paramsEl,
            h('div', { className: 'shortcut-hint' }, 'Press ', h('kbd', null, 'Ctrl+Enter'), ' to send')
        );
        content.appendChild(requestCard);

        if (rpcResponse || rpcError) {
            var resCard = h('div', { className: 'card' },
                h('div', { className: 'card-header' },
                    h('div', { className: 'response-header' },
                        h('span', { className: 'label' }, 'Response'),
                        rpcStatus === 'ok' ? h('span', { className: 'flex items-center gap-2' }, h('span', { className: 'dot dot-ok' }), h('span', { className: 'text-xxs', style: 'color:var(--emerald);font-weight:500' }, '200 OK')) : null,
                        rpcStatus === 'error' ? h('span', { className: 'flex items-center gap-2' }, h('span', { className: 'dot dot-err' }), h('span', { className: 'text-xxs', style: 'color:var(--red);font-weight:500' }, 'Error')) : null,
                        rpcElapsed != null ? h('span', { className: 'meta' }, rpcElapsed + 'ms') : null
                    ),
                    h('button', { className: 'copy-btn', onClick: function () { copyText(rpcResponse || rpcError || ''); } }, 'Copy')
                ),
                rpcError
                    ? h('div', { className: 'response-error' }, rpcError)
                    : h('pre', { className: 'response-body' }, rpcResponse)
            );
            content.appendChild(resCard);
        }

        if (history.length > 0) {
            var historyItems = history.map(function (entry) {
                return h('button', { className: 'history-item', onClick: function () { loadHistoryEntry(entry); } },
                    h('span', { className: 'dot ' + (entry.status === 'ok' ? 'dot-ok' : 'dot-err') }),
                    h('span', { className: 'history-fn' }, entry.func),
                    h('span', { className: 'history-ms' }, entry.elapsed + 'ms'),
                    h('span', { className: 'history-time' }, entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
                );
            });
            content.appendChild(h('div', { className: 'card' },
                h('div', { className: 'card-header' },
                    h('h3', null, 'History'),
                    h('button', { className: 'copy-btn', onClick: function () { history = []; renderApiTesting(); } }, 'Clear')
                ),
                h('div', { style: 'max-height:200px;overflow-y:auto' }, ...historyItems)
            ));
        }
    }

    function createParamInput(p) {
        var ty = p.type;
        switch (ty.kind) {
            case 'bool': {
                var track = h('button', { className: 'toggle-track ' + (paramValues[p.name] ? 'on' : 'off'), onClick: function () { paramValues[p.name] = !paramValues[p.name]; renderApiTesting(); } },
                    h('span', { className: 'toggle-thumb' })
                );
                return h('div', { className: 'flex items-center gap-2' }, track, h('span', { className: 'text-xs text-muted' }, String(!!paramValues[p.name])));
            }
            case 'u8': case 'u16': case 'u32': case 'u64':
            case 's8': case 's16': case 's32': case 's64':
            case 'f32': case 'f64': case 'float32': case 'float64':
                return h('input', { type: 'number', className: 'param-input', value: String(paramValues[p.name] || 0), placeholder: '0', onInput: function (e) { paramValues[p.name] = ty.kind.startsWith('f') || ty.kind.startsWith('float') ? parseFloat(e.target.value) || 0 : parseInt(e.target.value) || 0; } });
            case 'enum': {
                var sel = h('select', { className: 'param-input', onChange: function (e) { paramValues[p.name] = e.target.value; } });
                for (var k = 0; k < (ty.names || []).length; k++) { var o = h('option', { value: ty.names[k] }, ty.names[k]); if (paramValues[p.name] === ty.names[k]) o.selected = true; sel.appendChild(o); }
                return sel;
            }
            case 'string': case 'char':
                return h('input', { type: 'text', className: 'param-input', value: String(paramValues[p.name] != null ? paramValues[p.name] : ''), placeholder: ty.kind === 'char' ? 'single character' : 'Enter ' + p.name + '\u2026', onInput: function (e) { paramValues[p.name] = e.target.value; } });
            default: {
                var val = typeof paramValues[p.name] === 'string' ? paramValues[p.name] : JSON.stringify(paramValues[p.name], null, 2);
                return h('textarea', { className: 'param-input', rows: '3', spellcheck: 'false', placeholder: 'JSON value', onInput: function (e) { try { paramValues[p.name] = JSON.parse(e.target.value); } catch (err) { paramValues[p.name] = e.target.value; } } }, val);
            }
        }
    }

    function loadHistoryEntry(entry) {
        selectedFunc = entry.func;
        paramValues = Object.assign({}, entry.params);
        rpcResponse = entry.response;
        rpcStatus = entry.status;
        rpcElapsed = entry.elapsed;
        rpcError = entry.status === 'error' ? entry.response : null;
        renderApiTesting();
    }

    // ── Keyboard shortcut ──────────────────────────
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (currentTab === 'api' && schema) sendRpc();
        }
    });

    // ── Init ───────────────────────────────────────
    document.addEventListener('DOMContentLoaded', function () {
        $('#connect-btn').addEventListener('click', handleConnect);
        var ids = ['endpoint-input', 'base-url-input', 'app-name-input', 'auth-token-input', 'attestation-url-input', 'attestation-token-input'];
        for (var i = 0; i < ids.length; i++) {
            var el = $('#' + ids[i]);
            if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleConnect(); });
        }

        // Pre-fill from URL params
        var params = new URLSearchParams(window.location.search);
        if (params.get('base')) $('#base-url-input').value = params.get('base');
        if (params.get('app')) $('#app-name-input').value = params.get('app');
        if (params.get('url')) $('#endpoint-input').value = params.get('url');
        if (params.get('as')) $('#attestation-url-input').value = params.get('as');
    });
})();
