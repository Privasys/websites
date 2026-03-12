'use client';

import { PageShell } from '~/app/components/page-shell';

export default function PrivacyPolicy() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: March 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Privacy Policy</h1>

                <p className='mt-8'>
                    Your privacy is our primary concern. This policy explains how your personal information is collected and used when you interact with Privasys websites and services.
                    This Privacy Policy applies to all Privasys services available through privasys.org, developer.privasys.org, and docs.privasys.org.
                    By accessing or using Privasys services, you agree to this Privacy Policy.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>The type of personal information we collect</h2>
                <p>Privasys currently collects and processes the following information:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Account information</strong> (e.g. your login details via GitHub OIDC, information stored on your account, and other details about your use of our services).</li>
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
                    <li>Authenticate your identity via OIDC (GitHub)</li>
                    <li>Maintain developer communication and support</li>
                    <li>Improve our websites and services</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>How we store your personal information</h2>
                <p>
                    Your information is securely stored. We keep account information for as long as necessary to fulfil the purposes we collected it for, including for the purpose of satisfying any legal, accounting, or reporting requirements.
                </p>
                <p className='mt-4'>
                    Authentication is handled via GitHub OIDC. Privasys does not store passwords. Account identifiers and metadata are kept for as long as your account is active.
                </p>
                <p className='mt-4'>
                    We keep basic information about visitors, usage data, and technical data that is tracked for routine administration and maintenance purposes only.
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
