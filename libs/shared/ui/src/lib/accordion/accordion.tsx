'use client';

import type { FC, ReactNode } from 'react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { More, Less } from './svgs';

export interface AccordionProps {
    title: string;
    containerStyles: string;
    titleStyles: string;
    body: ReactNode;
}

export const Accordion: FC<AccordionProps> = ({ title, body, containerStyles, titleStyles }) => {

    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={`flex flex-col w-full ${containerStyles}`}
            onClick={() => setIsOpen((prev) => !prev)}
        >
            <button
                aria-controls={title}
                aria-expanded={isOpen}
                className="flex justify-between text-left items-center w-full space-x-4"
            >
                <h4 className={titleStyles}>
                    {title}
                </h4>
                <AnimatePresence initial={false} mode="wait">
                    <motion.div
                        key={isOpen ? 'minus' : 'plus'}
                        initial={{
                            rotate: isOpen ? -90 : 90
                        }}
                        animate={{
                            rotate: 0,
                            transition: {
                                type: 'tween',
                                duration: 0.15,
                                ease: 'circOut'
                            }
                        }}
                        exit={{
                            rotate: isOpen ? -90 : 90,
                            transition: {
                                type: 'tween',
                                duration: 0.15,
                                ease: 'circIn'
                            }
                        }}
                    >
                        {isOpen ? <Less /> : <More />}
                    </motion.div>
                </AnimatePresence>
            </button>
            <motion.div
                id={title}
                initial={false}
                animate={
                    isOpen
                        ? {
                            height: 'auto',
                            opacity: 1,
                            display: 'block',
                            transition: {
                                height: {
                                    duration: 0.4
                                },
                                opacity: {
                                    duration: 0.25,
                                    delay: 0.15
                                }
                            }
                        }
                        : {
                            height: 0,
                            opacity: 0,
                            transition: {
                                height: {
                                    duration: 0.4
                                },
                                opacity: {
                                    duration: 0.25
                                }
                            },
                            transitionEnd: {
                                display: 'none'
                            }
                        }
                }
                className="font-light"
            >
                {body}
            </motion.div>
        </div>
    );
};

export default Accordion;
