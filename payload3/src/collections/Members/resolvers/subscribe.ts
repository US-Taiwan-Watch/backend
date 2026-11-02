import { memberRelationship } from './relationship';

export const subscribeBillResolver = memberRelationship('subscribeBills');
export const unsubscribeBillResolver = memberRelationship('subscribeBills', true);
export const subscribePeopleResolver = memberRelationship('subscribePeoples');
export const unsubscribePeopleResolver = memberRelationship('subscribePeoples', true);
