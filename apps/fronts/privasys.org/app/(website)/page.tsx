'use client';

import { useEffect, useState } from 'react';
import Balancer from 'react-wrap-balancer';

export default function Home() {

    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        window.addEventListener('scroll', () => {
            setScrolled(window.scrollY > 0);
        });
    }, []);

    return (
        <div className={scrolled ? 'scrolled' : ''}>
            <header>
                <nav className='mx-auto w-full lg:w-[60rem] px-6 lg:px-0 flex items-center justify-between py-5'>
                    <a href='#' className='title text-xl -m-1.5 py-1.5'>
                        <span>Privasys</span>
                    </a>
                    <div className='hidden text-sm lg:flex lg:gap-8'>
                        <span className='menu-item selected'>Overview</span>
                        <a href='mailto:contact@privasys.org?subject=Privasys%20website%20contact' className='menu-item'>Contact Us</a>
                    </div>
                </nav>
                <div className='border-t border-gray-300' />
            </header>

            <main className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>

                <section className='mt-24 lg:mt-60 w-full lg:w-3/4'>
                    <h1 className='text-6xl lg:text-[4.6rem] pr-20 lg:pr-0'>We’re committed to&nbsp;protecting your&nbsp;data.</h1>
                    <p className='hero-intro mt-10'>
                        Privacy is a fundamental human right.
                        It’s also one of our core values, which is why we design our products and services to protect it.
                        That’s the kind of innovation we believe in.
                    </p>
                </section>

                <section className='mt-30 lg:mt-60'>
                    <h2 className='text-2xl lg:text-4xl'>
                        We are constantly working on new ways to keep your information safe.
                        Our solutions use innovative privacy technologies and techniques to prevent anyone except you from accessing your information.
                    </h2>
                    <div className='mt-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Confidential by design</h3>
                            <p>
                                <Balancer>
                                    Groundbreaking privacy protections like <a target='_blank' href='https://en.wikipedia.org/wiki/Confidential_computin' rel='noopener noreferrer' className='link'>Confidential Computing</a> give you peace of mind that no one else can access your data, not even us.
                                    Data stays encrypted in secure enclaves, protected from the infrastructure running it, even if the machine is compromised.
                                </Balancer>
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Always verifiable</h3>
                            <p>
                                <Balancer>
                                    We guarantee process integrity with cryptographic guarantees.
                                    Anyone can attest the security and privacy guarantees of our services.
                                    We enforce verifiable transparency, shifting the need to trust a service provider to verifying technical evidence of integrity.
                                </Balancer>
                            </p>
                        </div>
                        <div className='lg:col-span-2'>
                            <h3 className='text-xl lg:text-3xl'>Building the future of self-sovereignty</h3>
                            <p>
                                We are redefining what secure infrastructure means and how to build privacy-preserving solutions seamlessly.
                                We have one of the strongest data protection engineering teams.
                                Over the last few years, our experts have won all international privacy competitions in the financial sector:
                            </p>
                            <div className='mt-1'>
                                <ul>
                                    <li className='pt-1'>
                                        <a target='_blank' href='https://www.linkedin.com/feed/update/urn:li:activity:7312409636110753793/'
                                            rel='noopener noreferrer' className='link'>
                                            2025: Won the Bank of International Settlements competition on privacy-preserving data analytics.
                                        </a>
                                    </li>
                                    <li className='pt-1'>
                                        <a target='_blank' href='https://www.swift.com/news-events/news/swift-hackathon-2024-winning-solutions-unpacked'
                                            rel='noopener noreferrer' className='link'>
                                            2024: Won the Swift competition on ensuring privacy in payment processing.
                                        </a>
                                    </li>
                                    <li className='pt-1'>
                                        <a target='_blank' href='https://www.linkedin.com/posts/bertrand-foing_drug-dealers-pimps-human-traffickers-all-activity-7104871805948960768-yk5c'
                                            rel='noopener noreferrer' className='link'>
                                            2023: Won the G20 competition on ensuring privacy for financial crime data collaboration.
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className='mt-30 lg:mt-60'>
                    <h2 className='text-2xl lg:text-4xl'>
                        We derive intelligence from private data with complete transparency and zero compromise on confidentiality.
                        By connecting secure processing to private siloed data, we unlock powerful insights to solve the world’s most complex challenges.
                    </h2>
                    <div className='mt-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Programmable insights</h3>
                            <p>
                                <Balancer>
                                    Our trustless technology connects sensitive data to secure processing, with no middlemen or blind trust.
                                    It empowers data holders to unlock powerful insights while preserving privacy.
                                    We support programmable business logic, enabling you to design sophisticated workflows.
                                </Balancer>
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Data monetisation enabler</h3>
                            <p>
                                <Balancer>
                                    Your data is sensitive, strategic, and private.
                                    With&nbsp;Privasys, it stays fully encrypted in memory, even during processing.
                                    No exposure. No exceptions.
                                    We offer state-of-the-art solutions compatible with the most stringent privacy regulations.
                                </Balancer>
                            </p>
                        </div>
                    </div>
                </section>

                <section className='mt-30 lg:mt-60'>
                    <h2 className='text-2xl lg:text-4xl'>
                        We power Confidential AI, an intelligence system explicitly designed to allow LLMs and SLMs to securely process private data.
                        We enable you to run AI applications without sacrificing control over your data or model.
                    </h2>
                    <div className='mt-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-x-32 lg:gap-y-20'>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Smarter automation</h3>
                            <p>
                                <Balancer>
                                    Your AI agents are only as good as the data they see.
                                    Privasys gives your models secure access to private, structured, or messy data, without ever exposing it.
                                    Improve the quality of your AI automation just by making it smarter with precise data.
                                </Balancer>
                            </p>
                        </div>
                        <div>
                            <h3 className='text-xl lg:text-3xl'>Collective intelligence</h3>
                            <p>
                                <Balancer>
                                    Agents gain access to multiple private RAGs, transforming siloed, unstructured data into usable intelligence while maintaining complete confidentiality.
                                    Intelligence becomes collaborative, yet secure.
                                </Balancer>
                            </p>
                        </div>
                        <div className='lg:col-span-2'>
                            <h3 className='text-xl lg:text-3xl'>End-to-end data protection for AI workflows</h3>
                            <p className='mt-50 lg:mt-100 text-2xl lg:text-4xl'>
                                Confidential AI is the most advanced usage of our technology.
                                It combines secure enclaves on CPUs and GPUs to guarantee data privacy, security, and lineage for the entire architecture of AI systems.
                            </p>
                            <div className='mt-1'>
                                <ul>
                                    <li className='pt-1'>
                                        <span className='text-black underline'>Confidential Computing:</span>
                                        &nbsp;Keeps data always encrypted in memory, even during processing, and prevents unauthorised access.
                                    </li>
                                    <li className='pt-1'>
                                        <span>
                                            <span className='text-black underline'>Private RAG:</span>
                                            &nbsp;Securely augments your model knowledge with your private data, leveraging powerful search algorithms to efficiently retrieve the relevant information.
                                        </span>
                                    </li>
                                    <li className='pt-1'>
                                        <span className='text-black underline'>Secure AI Inference:</span>
                                        &nbsp;Runs LLMs and SLMs on tamper-proof hardware (CPUs or GPUs), and ensures data privacy even during model inference.
                                    </li>
                                    <li className='pt-1'>
                                        <span className='text-black underline'>Secure-enclave Model Context Protocol (SMCP):</span>
                                        &nbsp;Enables AI agents to interact with external services while guaranteeing data privacy and process integrity.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                <section className='mt-30 lg:mt-60'>
                    <h2 className='text-2xl lg:text-4xl'>
                        The most advanced enterprises and agencies advocate our approach to data protection.
                        It is particularly relevant to guarantee data privacy and security for AI-based systems.
                    </h2>
                    <div className='mt-8 grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-x-24 lg:gap-y-12'>
                        <div className=''>
                            <p>“There are solutions available today, like confidential computing, which give organisations stronger controls to protect their data”</p>
                            <a target='_blank' href='https://www.jpmorgan.com/technology/technology-blog/open-letter-to-our-suppliers'
                                rel='noopener noreferrer' className='link'>JPMorgan</a>
                        </div>
                        <div className=''>
                            <p>“Nothing short of the world-leading security architecture for cloud AI compute at scale”</p>
                            <a target='_blank' href='https://security.apple.com/blog/private-cloud-compute/'
                                rel='noopener noreferrer' className='link'>Apple</a>
                        </div>
                        <div className=''>
                            <p>“Confidential computing offers the promise of protecting model weights and inference data”</p>
                            <a target='_blank' href='https://openai.com/index/reimagining-secure-infrastructure-for-advanced-ai/'
                                rel='noopener noreferrer' className='link'>OpenAI
                            </a>
                        </div>
                        <div className=''>
                            <p>“By 2029, Gartner predicts more than 75% of operations processed in untrusted infrastructure will be secured in-use by confidential computing”</p>
                            <a target='_blank' href='https://www.gartner.com/en/newsroom/press-releases/2025-10-20-gartner-identifies-the-top-strategic-technology-trends-for-2026#:~:text=Confidential%20Computing'
                                rel='noopener noreferrer' className='link'>Gartner</a>
                        </div>
                        <div className=''>
                            <p>“Trusted computing infrastructure supports the integrity of data processes, reduces risks associated with unverified or altered data, and ultimately creates a more robust and transparent AI ecosystem”</p>
                            <a target='_blank' href='https://media.defense.gov/2025/May/22/2003720601/-1/-1/0/CSI_AI_DATA_SECURITY.PDF'
                                rel='noopener noreferrer' className='link'>The NSA
                            </a>
                        </div>
                    </div>
                </section>

                <section className='mt-30 lg:mt-30'>
                    <h2 className='text-2xl lg:text-4xl'>
                        We are ahead of a massive shift towards confidential computing.
                        We are very excited to be at the core of these changes, and we look forward to supporting your projects.
                    </h2>
                    <div className='mt-10'>
                        <a href='mailto:contact@privasys.org?subject=Privasys%20website%20contact' target='_blank' rel='noopener noreferrer'
                            className='px-6 py-2.5 font-bold border-1 rounded-full text-black hover:bg-black hover:text-white'>
                            Contact us
                        </a>
                    </div>
                </section>
            </main>

            <footer className='m-auto w-full lg:w-[60rem] px-6 lg:px-0'>
                <div className='mt-30 border-t border-gray-300' />

                <div className='my-3 text-[#767e88] text-sm'>
                    Privasys Ltd. Registered Company UK-16866500.<br />
                    <span className='text-[#abaeb3] text-xs'>© {new Date().getFullYear()} Privasys Ltd. All rights reserved.</span>
                </div>
            </footer>
        </div >
    );
}