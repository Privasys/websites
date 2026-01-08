import type { ComponentStory, ComponentMeta } from '@storybook/react';
import { StripeButton } from './stripe-button';

const Story: ComponentMeta<typeof StripeButton> = {
    component: StripeButton,
    title: 'StripeButton'
};
export default Story;

const Template: ComponentStory<typeof StripeButton> = (args) => <StripeButton {...args} />;

export const Primary = Template.bind({});
Primary.args = {};
