import type { ComponentProps } from 'react';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import TextInputValidated from '@/components/core/text-input-validated';

type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof TextInputValidated>,
  'name' | 'value' | 'onChangeText' | 'onBlur'
> & {
  name: FieldPath<T>;
  control?: Control<T>;
  parse?: (text: string) => unknown;
};

export const emptyAsNull = (text: string) => (text === '' ? null : text);

const FormTextInput = <T extends FieldValues>({ name, control, parse, ...rest }: Props<T>) => {
  const {
    field: { ref, value, onChange, onBlur }
  } = useController<T>({ name, control });

  return (
    <TextInputValidated
      {...rest}
      ref={ref}
      name={name}
      value={value ?? ''}
      onChangeText={(text) => onChange(parse ? parse(text) : text)}
      onBlur={onBlur}
    />
  );
};

export default FormTextInput;
