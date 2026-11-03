import { PsInrPipe } from './ps-inr.pipe';

describe('PsInrPipe', () => {
  const pipe = new PsInrPipe();
  it.each([
    [1000000, '₹10,00,000'], [75000, '₹75,000'], [125500.5, '₹1,25,500.50'],
    [0, '₹0.00'], [-0, '₹0.00'], [0.5, '₹0.50'], [-4500, '−₹4,500'],
    [-125500.5, '−₹1,25,500.50'], [1000000000000.25, '₹10,00,00,00,00,000.25'],
    [12.345, '₹12.35'], [1.005, '₹1.01'],
  ])('formats %s as %s', (value, expected) => {
    expect(pipe.transform(value as number)).toBe(expected);
  });

  it.each([null, undefined, NaN, Infinity, -Infinity, '', '75000', 'invalid', {}, true])(
    'handles missing or invalid input %s without coercion', value => {
      expect(pipe.transform(value as number)).toBe('—');
    },
  );

  it('only rounds the display, never the source value', () => {
    const source = Object.freeze({ amount: 125500.505 });
    expect(pipe.transform(source.amount)).toBe('₹1,25,500.51');
    expect(source.amount).toBe(125500.505);
  });
});
