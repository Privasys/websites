'use client';

import { PageShell } from '~/app/components/page-shell';

export default function TermsOfService() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: March 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Terms of Service</h1>

                <p className='mt-8'>
                    Welcome to the Privasys terms of service. These terms represent a legal agreement between you and Privasys Ltd. (the "Company") covering your access to and use of Privasys websites, the Developer Platform, the App Store, and all related services (the "Services").
                </p>
                <p className='mt-4'>
                    If you continue accessing and using our websites or services, you are agreeing to comply with and be bound by these terms. If you disagree with any part of these terms, please do not access or use our websites and services.
                </p>
                <p className='mt-4'>
                    The term "Privasys" or "us" or "we" or "our" refers to Privasys Ltd., registered company UK-16866500, United Kingdom. The term "you" refers to the user or viewer of our websites and services.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Accepting this agreement</h2>
                <p>
                    This agreement forms a legally binding contract between you and Privasys Ltd. in relation to your use of our services and websites.
                    By accepting this agreement, you can use our platform to deploy and distribute confidential applications.
                    You accept the terms of this agreement on your behalf and/or on behalf of your company, organisation, or any other body.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Your obligations</h2>
                <p>You agree to use the Privasys services only for the purposes stipulated in this agreement and any applicable law, regulation, or generally accepted practices in the relevant jurisdiction.</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>You are responsible for deploying your applications to the Privasys Platform, providing required application information, and supporting users of your applications.</li>
                    <li>You agree to protect the privacy and legal rights of users and to provide adequate privacy notice and protection.</li>
                    <li>Users under the age of 18, or under the age of majority in your jurisdiction, are prohibited from using the services unless a parent or legal guardian has agreed to these terms on their behalf.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Services</h2>
                <p>Privasys will provide the services you register for, subject to these terms.</p>
                <p className='mt-4'>
                    Privasys may provide services and features labelled as alpha, beta, preview, early access, or development (each a "Beta Service"). Privasys bears no liability or responsibility for any Beta Services. Support, service level agreements, and warranties do not extend to Beta Services.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Access and accounts</h2>
                <p>To access the Developer Platform, you must authenticate via GitHub OIDC. You agree to the following:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>You are solely responsible for your account and the security and privacy of your account.</li>
                    <li>All personal information you provide to us through your account is up to date, accurate, and truthful, and you will update your personal information if it changes.</li>
                </ul>
                <p className='mt-4'>We reserve the right to suspend or terminate your account if you are using our services illegally or if you violate these terms.</p>

                <h2 className='text-2xl mt-12 mb-4'>Developer Platform</h2>
                <p>The Developer Platform at developer.privasys.org allows you to deploy confidential applications on Privasys infrastructure. You agree to:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Only deploy applications that comply with applicable laws and regulations.</li>
                    <li>Not deploy applications that contain malware, exploits, or content that is harmful, deceptive, or illegal.</li>
                    <li>Take responsibility for the support and maintenance of your deployed applications.</li>
                    <li>Ensure that users of your applications are informed about any data processing that takes place.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>App Store</h2>
                <p>The App Store at privasys.org lists verified confidential applications. If you submit an application for listing:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Your application must be deployed on the Privasys Developer Platform and pass attestation verification.</li>
                    <li>You must provide accurate metadata, including application name, description, category, and source code link.</li>
                    <li>Privasys reserves the right to review, approve, or remove any listing at its discretion.</li>
                    <li>Removal of a listing does not affect your obligation to support users who have previously connected to your application.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Restricted content</h2>
                <p>The following types of content and applications are strictly prohibited:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Content that endangers children or exploits vulnerable individuals</li>
                    <li>Applications designed for illegal activities</li>
                    <li>Deceptive or fraudulent services</li>
                    <li>Content that infringes intellectual property rights</li>
                    <li>Malware, exploits, or tools designed for malicious behaviour</li>
                    <li>Impersonation or false representation</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Websites</h2>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Visitor conduct:</strong> Your use of any information or materials on our websites is entirely at your own risk. It is your responsibility to ensure that any services or information available through our websites meet your specific requirements.</li>
                    <li><strong>Third-party links:</strong> Our websites may include links to other websites. These links are provided for your convenience. We have no responsibility for the content of linked websites.</li>
                    <li><strong>Intellectual property:</strong> Our websites contain material which is owned by or licensed to us. This material includes, but is not limited to, the design, layout, look, appearance, and graphics. Reproduction is prohibited other than in accordance with the copyright notice.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Ownership</h2>
                <p>
                    Privasys retains all rights, title, and interest in and to all intellectual property and proprietary technology utilised to perform services. You agree to cooperate to maintain this ownership.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Confidentiality</h2>
                <p>
                    Unless otherwise agreed, Privasys will treat any information gained during the supply of services as private and confidential. Likewise, you shall keep any methodologies and technology used by Privasys confidential.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Indemnification</h2>
                <p>
                    You agree to defend, indemnify, and hold harmless Privasys, its affiliates, and their respective directors, officers, employees, and agents from and against any and all third-party claims, actions, or proceedings, as well as any and all losses, liabilities, damages, costs, and expenses arising out of or accruing from your use of the services or distribution of applications through the Privasys Platform, to the maximum extent permitted by law.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Term and termination</h2>
                <p>
                    We may suspend or terminate your use of and access to the websites or services at our sole discretion, without prior notice, for any reason or cause. Upon termination, you agree to immediately cease using the services and remove any applications deployed on the platform.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Disclaimer of warranties</h2>
                <p>
                    Neither we nor any third parties provide any warranty or guarantee as to the accuracy, timeliness, performance, completeness, or suitability of the information and materials found or offered on our websites for any particular purpose. You acknowledge that such information and materials may contain inaccuracies or errors and we expressly exclude liability for any such inaccuracies or errors to the fullest extent permitted by law.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Limitation of liability</h2>
                <p>
                    Privasys Ltd. and our directors, officers, agents, employees, subsidiaries, and affiliates will not be liable for any actions, claims, losses, damages, liabilities, and expenses including legal fees from your use of the websites or services provided.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Changes to this agreement</h2>
                <p>
                    If any details of our agreement change, this page will be updated, and the changes posted will be effective immediately. We reserve the right to update or change our agreement at any time. You should check this page periodically.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Governing jurisdiction</h2>
                <p>
                    This agreement shall be governed by and construed in accordance with English Law. Any disputes arising in connection with this agreement are subject to the laws of England and Wales.
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
