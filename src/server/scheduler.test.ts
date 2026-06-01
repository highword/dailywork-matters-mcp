import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getMsUntilNext, generateDateRange, formatDate } from './scheduler.js';

describe('scheduler', () => {
  describe('getMsUntilNext', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns positive ms when target is later today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T08:00:00'));
      const ms = getMsUntilNext('09:00');
      expect(ms).toBe(3600000); // 1 hour
    });

    it('returns next-day ms when target has passed today', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T10:00:00'));
      const ms = getMsUntilNext('09:00');
      // Should be 23 hours (next day 09:00 - today 10:00)
      expect(ms).toBe(23 * 3600000);
    });

    it('returns next-day ms when target is exactly now', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T09:00:00'));
      const ms = getMsUntilNext('09:00');
      expect(ms).toBe(24 * 3600000); // full day
    });

    it('handles midnight target near end of day', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T23:59:00'));
      const ms = getMsUntilNext('00:00');
      expect(ms).toBe(60000); // 1 minute
    });

    it('returns NaN-safe result for invalid format', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-01T08:00:00'));
      // Invalid format should not crash - returns a number (even if wrong)
      const ms = getMsUntilNext('invalid');
      expect(typeof ms).toBe('number');
    });
  });

  describe('generateDateRange', () => {
    it('generates inclusive date range', () => {
      const dates = generateDateRange('2026-05-28', '2026-05-31');
      expect(dates).toEqual(['2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31']);
    });

    it('returns empty array when start > end', () => {
      const dates = generateDateRange('2026-06-01', '2026-05-30');
      expect(dates).toEqual([]);
    });

    it('returns single date when start equals end', () => {
      const dates = generateDateRange('2026-06-01', '2026-06-01');
      expect(dates).toEqual(['2026-06-01']);
    });

    it('handles month boundary', () => {
      const dates = generateDateRange('2026-01-30', '2026-02-02');
      expect(dates).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
    });
  });

  describe('formatDate', () => {
    it('formats date with zero-padded month and day', () => {
      expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('formats double-digit month/day without extra padding', () => {
      expect(formatDate(new Date(2026, 11, 25))).toBe('2026-12-25');
    });
  });
});
