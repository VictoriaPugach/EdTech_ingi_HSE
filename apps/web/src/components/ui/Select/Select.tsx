import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}

/**
 * Стилизованный нативный select. Используется в формах (создание курса).
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className, id, ...rest }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className={styles.wrapper}>
        {label && (
          <label className={styles.label} htmlFor={selectId}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[styles.select, className ?? ''].filter(Boolean).join(' ')}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  },
);

Select.displayName = 'Select';
