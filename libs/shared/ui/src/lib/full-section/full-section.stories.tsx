import type { ComponentStory, ComponentMeta } from '@storybook/react';
import FullSection from './full-section';

const Story: ComponentMeta<typeof FullSection> = {
    component: FullSection,
    title: 'FullSection'
};
export default Story;

const Template: ComponentStory<typeof FullSection> = (args) => (
    <FullSection {...args} />
);

export const Primary = Template.bind({});
Primary.args = {};
