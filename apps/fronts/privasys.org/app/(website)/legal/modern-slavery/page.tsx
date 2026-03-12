'use client';

import { PageShell } from '~/app/components/page-shell';

export default function ModernSlavery() {
    return (
        <PageShell activePage='legal'>

            <article className='mt-24 lg:mt-40 prose-legal'>
                <p className='text-sm text-[#1d1d1f]/50 dark:text-[#f5f5f7]/50 mb-4'>Last updated: March 2026</p>
                <h1 className='text-4xl lg:text-5xl'>Modern Slavery Statement</h1>

                <h2 className='text-2xl mt-12 mb-4'>Our structure and business</h2>
                <p>
                    Privasys is a technology company that has pioneered confidential computing solutions for hardware-attested application deployment. Our goal is to empower developers and organisations to deploy provably secure applications using trusted execution environments.
                </p>
                <p className='mt-4'>
                    We are committed to ensuring that our business operations and supply chains are free from modern slavery, human trafficking, forced labour, and prison labour. This statement outlines our approach to identifying and addressing these risks.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Policies on modern slavery and human trafficking</h2>
                <p>Privasys has implemented a range of policies designed to combat modern slavery and human trafficking. These include:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Ethical Sourcing Policy:</strong> Our suppliers are required to comply with this policy, ensuring that they do not engage in forced labour, prison labour, child labour, or human trafficking.</li>
                    <li><strong>Whistleblower Policy:</strong> Employees and stakeholders are encouraged to report any concerns related to modern slavery.</li>
                    <li><strong>Code of Conduct:</strong> We expect our employees and suppliers to adhere to high ethical standards and uphold human rights.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Risk assessment</h2>
                <p>
                    We map our operations and supply chains to identify regions, industries, or types of suppliers with a higher risk of modern slavery. This includes assessing factors like geography, industry sector, workforce demographics, and sourcing practices. Company-wide risk assessments are conducted regularly in line with compliance frameworks.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Due diligence</h2>
                <p>We conduct due diligence on our suppliers and partners to ensure compliance with our policies and relevant legislation. This process includes:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li><strong>Supplier Review:</strong> Regular reviews are conducted to verify compliance with ethical standards.</li>
                    <li><strong>Third-Party Assessments:</strong> We engage third-party organisations to assess our suppliers' practices.</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Training and awareness</h2>
                <p>Privasys provides training to employees to raise awareness about modern slavery and human trafficking. This training covers:</p>
                <ul className='mt-4 list-disc pl-6 space-y-2'>
                    <li>Identifying signs of modern slavery</li>
                    <li>Reporting mechanisms for suspected cases</li>
                    <li>Company policies and procedures related to ethical sourcing</li>
                </ul>

                <h2 className='text-2xl mt-12 mb-4'>Commitment to ethical pay standards</h2>
                <p>
                    At Privasys, we are committed to ensuring fair treatment and wages for all our employees and those within our supply chain. We strive to provide wages that reflect the cost of living and support a decent standard of living. This commitment forms part of our broader strategy to promote ethical labour practices and reduce vulnerabilities to modern slavery.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Internal accountability</h2>
                <p>
                    As a company, we educate employees and senior management about the importance of legal compliance and ethical operations. Our Code of Conduct provides information about our responsibilities and is our guide for operating in an ethical manner. This Code of Conduct is applicable to all personnel as well as third-party suppliers.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Continuous improvement</h2>
                <p>
                    We are committed to continuously improving our approach to combating modern slavery. This includes reviewing our policies, updating our risk assessments, and engaging with stakeholders to gather feedback and best practices.
                </p>

                <h2 className='text-2xl mt-12 mb-4'>Approval</h2>
                <p>
                    This statement has been approved by the leadership team of Privasys Ltd.
                </p>
            </article>

            <div className='mb-30' />

        </PageShell>
    );
}
