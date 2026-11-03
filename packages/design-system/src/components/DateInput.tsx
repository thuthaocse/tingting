import { useState } from 'react';
import { Field, Input } from '../index';
import s from './DateInput.module.css';

function formatDate(date: Date, language: string) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
  }).format(date).replace(/^ngày\s+/u, '');
}

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
  const language = typeof document === 'undefined' ? 'vi' : document.documentElement.lang;
  const text = Number.isNaN(date.getTime())
    ? (language === 'en' ? 'Choose date' : 'Chọn ngày')
    : formatDate(date, language);

  return (
    <Field label={label}>
      <span className={s.root}>
        <Input
          className={s.date}
          type="date"
          lang={language}
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
