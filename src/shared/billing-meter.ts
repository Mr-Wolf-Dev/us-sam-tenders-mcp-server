import { Actor } from 'apify';

export interface BillingMeter<TEvent extends string = string> {
  charge(eventName: TEvent, count?: number): Promise<void>;
}

/**
 * Creates a BillingMeter backed by Apify Actor.charge() for Pay-Per-Event monetization.
 */
export function createApifyBillingMeter<TEvent extends string = string>(): BillingMeter<TEvent> {
  return {
    async charge(eventName: TEvent, count = 1): Promise<void> {
      await Actor.charge({ eventName, count });
    },
  };
}
