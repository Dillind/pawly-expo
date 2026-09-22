import type { ComponentProps } from 'react';
import { useController, type FieldPath, type FieldValues } from 'react-hook-form';

import TextInputValidated from '@/components/core/text-input-validated';

type Props<T extends FieldValues> = Omit<
  ComponentProps<typeof TextInputValidated>,
  'name' | 'value' | 'onChangeText' | 'onBlur'
> & {
  name: FieldPath<T>;
};

const FormTextInput = <T extends FieldValues>({ name, ...rest }: Props<T>) => {
  const {
    field: { ref, value, onChange, onBlur }
  } = useController<T>({ name });

  return (
    <TextInputValidated
      {...rest}
      ref={ref}
      name={name}
      value={value ?? ''}
      onChangeText={onChange}
      onBlur={onBlur}
    />
  );
};

export default FormTextInput;
