import { ComponentProps } from 'react';
import { Control, FieldPath, FieldValues, useController } from 'react-hook-form';
import { FormField } from './FormField';

type FormFieldProps = ComponentProps<typeof FormField>;

type ControlledFormFieldProps<T extends FieldValues, Data> = Omit<
  FormFieldProps,
  'value' | 'onChangeText' | 'onBlur' | 'error' | 'inputRef'
> & {
  control: Control<T, unknown, Data>;
  name: FieldPath<T>;
  /** Reshape what the user types before it's stored, e.g. adding dashes to a date. */
  transform?: (text: string) => string;
  /** Other fields whose messages depend on this one, re-checked when it changes (after the first submit). */
  deps?: FieldPath<T>[];
};

/** A FormField wired to react-hook-form: value, change, blur, error message, and focus-on-error. */
export function ControlledFormField<T extends FieldValues, Data>({
  control,
  name,
  transform,
  deps,
  ...fieldProps
}: ControlledFormFieldProps<T, Data>) {
  const { field, fieldState } = useController({ control, name, rules: deps ? { deps } : undefined });
  return (
    <FormField
      {...fieldProps}
      inputRef={field.ref}
      value={typeof field.value === 'string' ? field.value : ''}
      onChangeText={(text) => field.onChange(transform ? transform(text) : text)}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}
