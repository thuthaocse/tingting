import { useEffect, useRef, type InputHTMLAttributes } from 'react';
import { caretAfterDigits, formatMoneyInput, parseMoneyInput } from '../utils/inputs.mjs';
import s from '../ui.module.css';
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'
> & {
  value: number;
  onValueChange: (amount: number) => void;
  maximum?: number;
};
export function MoneyInput({
  value,
  onValueChange,
  maximum = 1_000_000_000_000,
  className = '',
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const frame = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      if (frame.current !== undefined) cancelAnimationFrame(frame.current);
    },
    [],
  );
  return (
    <input
      {...props}
      ref={input}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className={`${s.input} ${className}`}
      value={formatMoneyInput(value)}
      onChange={(event) => {
        const text = event.target.value;
        const digits = text
          .slice(0, event.target.selectionStart ?? text.length)
          .replace(/\D/g, '').length;
        const amount = parseMoneyInput(text, maximum);
        if (amount === null) return;
        onValueChange(amount);
        if (frame.current !== undefined) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
          const position = caretAfterDigits(formatMoneyInput(amount), digits);
          input.current?.setSelectionRange(position, position);
        });
      }}
    />
  );
}
