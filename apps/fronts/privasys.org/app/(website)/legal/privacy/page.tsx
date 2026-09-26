'use client';

import { PageShell } from '~/app/components/page-shell';

export default function PrivacyPolicy() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: September 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Privacy Policy</h1>

                <p className='mt-8'>
                    Your privacy is our primary concern. This policy explains how your personal information is collected and used when you interact with Privasys websites and services.
                    This Privacy Policy applies to all Privasys services available through privasys.org, developer.privasys.org, docs.privasys.org, privasys.id, and the applications we run on apps.privasys.org.
                    By accessing or using Privasys services, you agree to this Privacy Policy.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>The type of personal information we collect</h2>
                <p>Privasys currently collects and processes the following information:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Account information</strong> (e.g. your login details via GitHub, information stored on your account, and other details about your use of our services).</li>
                    <li><strong>Technical data</strong> (e.g. internet protocol (IP) address, browser type and version, time zone setting and location, operating system and platform, and other technology on the devices you use to access our websites).</li>
                    <li><strong>Usage data</strong> (e.g. information about how you use our websites and services and engage with our content).</li>
                    <li><strong>Communications data</strong> (e.g. when you contact us, subscribe to updates, or request information about our services).</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>How we get the personal information and why we have it</h2>
                <p>The personal information we process is provided to us directly by you for one of the following reasons:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Creating an account on the Developer Platform</li>
                    <li>Deploying applications through our services</li>
                    <li>Contacting us via email or our website</li>
                    <li>Browsing our websites</li>
                </ul>
                <p className='mt-4'>We do not receive personal information indirectly. We do not purchase data from third parties or data brokers.</p>
                <p className='mt-4'>We use the information that you have given us to:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Provide and maintain our services</li>
                    <li>Authenticate your identity via Privasys ID, our OIDC identity provider</li>
                    <li>Maintain developer communication and support</li>
                    <li>Improve our websites and services</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>How we store your personal information</h2>
                <p>
                    Your information is securely stored. We keep account information for as long as necessary to fulfil the purposes we collected it for, including for the purpose of satisfying any legal, accounting, or reporting requirements.
                </p>
                <p className='mt-4'>
                    Authentication is handled by Privasys ID, our OIDC identity provider. Privasys does not store passwords. Account identifiers and metadata are kept for as long as your account is active.
                </p>
                <p className='mt-4'>
                    We keep basic information about visitors, usage data, and technical data that is tracked for routine administration and maintenance purposes only.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Accounts you connect, and the data in them</h2>
                <p>
                    A Privasys application can connect an account you already have, such as a mailbox, a calendar, a cloud drive or a meeting service, so that an assistant acting for you can work with what is in it.
                    This section explains what happens to that data, including data we receive from Google APIs, and it applies in addition to everything above.
                </p>

                <h3 className='text-xl mt-8 mb-3'>What we access, and why</h3>
                <p>
                    You choose which account to connect, what it is for, and how far the access goes. The boundary is the capability you approve on your own device, not a promise on this page:
                    an assistant can only do what that capability allows, and an assistant may of course be built to do less.
                </p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Mail</strong> (Gmail and other IMAP mailboxes): read the messages in the mailbox you connect, write drafts, apply labels, and send a message where you have granted that.</li>
                    <li><strong>Calendar</strong>: read your events and when you are busy, propose events for you to confirm, and create events and send invitations where you have granted that.</li>
                    <li><strong>Files</strong> (Google Drive, OneDrive, SharePoint): read the documents you point it at, and write files where you have allowed it to write.</li>
                    <li><strong>Meetings</strong>: read the transcripts of meetings you hosted, and write them into your own Privasys Drive.</li>
                </ul>

                <h3 className='text-xl mt-8 mb-3'>How it is accessed</h3>
                <p>
                    Every connector runs inside a confidential computing enclave whose code you can verify by attestation before you trust it.
                    Before any access happens, you approve a capability on your own device that names the account and the purpose, and you can withdraw it at any time.
                    The credential that opens your account is held in the memory of that enclave and on your own device. It is not written to our disks and does not appear in our logs.
                </p>

                <h3 className='text-xl mt-8 mb-3'>How it is used</h3>
                <p>
                    Data from a connected account is used only to produce the result you asked for, in your own session: a triage, a draft, a summary, an answer.
                    It is never used to train or improve any model, generalised or otherwise. It is never used for advertising, profiling or analytics.
                    No Privasys employee can read it: it lives inside the enclave, and running the platform gives us no path to that memory.
                </p>

                <h3 className='text-xl mt-8 mb-3'>How it is stored and shared</h3>
                <p>
                    We do not store the content of your mail, your calendar, your files or your transcripts. Connectors read on demand and keep nothing at rest.
                    The one exception is the one you asked for: a meeting transcript is written into your own Privasys Drive, encrypted for you, because a transcript has no other durable home.
                    We do not transfer this data to any third party, and we do not sell it.
                </p>

                <h3 className='text-xl mt-8 mb-3'>Limited Use</h3>
                <p>
                    Privasys&apos;s use and transfer of information received from Google APIs to any other app will adhere to the{' '}
                    <a href='https://developers.google.com/terms/api-services-user-data-policy' target='_blank' rel='noopener noreferrer' className='underline'>Google API Services User Data Policy</a>, including the Limited Use requirements.
                </p>

                <h3 className='text-xl mt-8 mb-3'>Withdrawing access</h3>
                <p>
                    You can disconnect an account at any time in your Privasys wallet, which withdraws the capability and forgets the credential immediately.
                    You can also remove our access at the provider: Google at{' '}
                    <a href='https://myaccount.google.com/permissions' target='_blank' rel='noopener noreferrer' className='underline'>myaccount.google.com/permissions</a>, Microsoft at{' '}
                    <a href='https://myapps.microsoft.com' target='_blank' rel='noopener noreferrer' className='underline'>myapps.microsoft.com</a>, and Zoom in the Zoom App Marketplace.
                    Anything the assistant has already left in your own account, such as a draft, a label, a proposal or a transcript in your Drive, remains yours to keep or delete.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Your data protection rights</h2>
                <p>Under data protection law, you have the following rights:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Right of access</strong> -- You have the right to ask us for copies of your personal information.</li>
                    <li><strong>Right to rectification</strong> -- You have the right to ask us to rectify personal information you think is inaccurate, or to complete information you think is incomplete.</li>
                    <li><strong>Right to erasure</strong> -- You have the right to ask us to erase your personal information in certain circumstances.</li>
                    <li><strong>Right to restriction of processing</strong> -- You have the right to ask us to restrict the processing of your personal information in certain circumstances.</li>
                    <li><strong>Right to object to processing</strong> -- You have the right to object to the processing of your personal information in certain circumstances.</li>
                    <li><strong>Right to data portability</strong> -- You have the right to ask that we transfer the personal information you gave us to another organisation, or to you, in certain circumstances.</li>
                </ul>
                <p className='mt-4'>You are not required to pay any charge for exercising your rights. If you make a request, we have one month to respond to you.</p>
                <p className='mt-4'>
                    Please contact us at <a href='mailto:contact@privasys.org' className='underline'>contact@privasys.org</a> if you wish to make a request.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Cookies</h2>
                <p>
                    We do not use tracking cookies on our websites. The Developer Platform uses session cookies after you have signed in to maintain your authenticated session.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Advertising and third parties</h2>
                <p>We do not display advertisements and do not collect information for advertising purposes.</p>

                <h2 className='text-2xl mt-12 mb-4'>Links to third-party websites</h2>
                <p>
                    Our websites may contain links to other websites. We are not responsible for the privacy policies on those websites, and they may differ from our own. When you leave our websites, we encourage you to read the privacy policy of every website you visit.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Security</h2>
                <p>
                    We use commercially reasonable means to protect your personal information. Privasys is a confidential computing company; data security is at the core of everything we build. However, no method of transmission over the Internet, or method of electronic storage, is 100% secure.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Changes to this Privacy Policy</h2>
                <p>
                    This Privacy Policy is effective as of March 2026. If any details of our policy change, this page will be updated, and the changes posted will be effective immediately. We reserve the right to update or change our Privacy Policy at any time and you should check this Privacy Policy periodically.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>How to complain</h2>
                <p>
                    If you have any concerns about our use of your personal information, you can make a complaint to us at <a href='mailto:contact@privasys.org' className='underline'>contact@privasys.org</a>.
                </p>
                <p className='mt-4'>You can also complain to the ICO if you are unhappy with how we have used your data.</p>
                <p className='mt-4'>
                    The ICO's address:<br />
                    Information Commissioner's Office<br />
                    Wycliffe House, Water Lane<br />
                    Wilmslow, Cheshire, SK9 5AF<br />
                    Helpline number: 0303 123 1113<br />
                    ICO website: <a href='https://www.ico.org.uk' target='_blank' rel='noopener noreferrer' className='underline'>https://www.ico.org.uk</a>
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Contact</h2>
                <p>
                    Company Name: Privasys Ltd.<br />
                    Registered Company: UK-16866500<br />
                    Email: <a href='mailto:contact@privasys.org' className='underline'>contact@privasys.org</a>
                </p>
            </article>

            <div className='mb-30' />

        </PageShell>
    );
}
