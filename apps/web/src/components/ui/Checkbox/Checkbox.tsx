import type { InputHTMLAttributes, ReactNode } from 'react';
import styles from './Checkbox.module.scss';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
}

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const checkId = id ?? `checkbox-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <label className={`${styles.wrapper} ${className ?? ''}`} htmlFor={checkId}>
      <input type="checkbox" id={checkId} className={styles.hiddenInput} {...rest} />
      <span className={styles.box}>
        <span className={styles.check}>
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2,6 5,9 10,3" />
          </svg>
        </span>
      </span>
      {label && <span className={styles.labelText}>{label}</span>}
    </label>
  );
}
