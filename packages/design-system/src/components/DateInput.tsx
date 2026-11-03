import { useState } from 'react';
import { Field, Input } from '../index';
import s from './DateInput.module.css';

const vietnameseDate = new Intl.DateTimeFormat('vi-VN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function DateInput({
  label,
  name,
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const date = new Date(`${value}T00:00:00Z`);
  const text = Number.isNaN(date.getTime())
    ? 'Chọn ngày'
    : vietnameseDate.format(date).replace(/^ngày\s+/u, '');

  return (
    <Field label={label}>
      <span className={s.root}>
        <Input
          className={s.date}
          type="date"
          lang="vi"
          aria-label={label}
          name={name}
          value={value}
          required={required}
          onChange={(event) => setValue(event.target.value)}
        />
        <span className={s.value} aria-hidden="true">
          {text}
        </span>
      </span>
    </Field>
  );
}
