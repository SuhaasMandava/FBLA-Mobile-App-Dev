import { ComponentProps } from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { DateTimeField } from './DateTimeField';

type ControlledDateTimeFieldProps<T extends FieldValues, Data> = Omit<
  ComponentProps<typeof DateTimeField>,
  'value' | 'onChange' | 'error'
> & {
  control: Control<T, unknown, Data>;
  name: FieldPath<T>;
};

/** A DateTimeField wired to react-hook-form. */
export function ControlledDateTimeField<T extends FieldValues, Data>({
  control,
  name,
  ...fieldProps
}: ControlledDateTimeFieldProps<T, Data>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <DateTimeField
      {...fieldProps}
      value={typeof field.value === 'string' ? field.value : ''}
      onChange={field.onChange}
      error={fieldState.error?.message}
    />
  );
}
