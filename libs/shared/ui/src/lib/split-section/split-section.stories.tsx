import type { ComponentStory, ComponentMeta } from '@storybook/react';
import SplitSection from './split-section';

const Story: ComponentMeta<typeof SplitSection> = {
    component: SplitSection,
    title: 'SplitSection'
};
export default Story;

const Template: ComponentStory<typeof SplitSection> = (args) => (
    <SplitSection {...args} />
);

export const Primary = Template.bind({});
Primary.args = {};
