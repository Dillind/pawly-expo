import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import FormTextInput from '@/components/core/form-text-input';

jest.mock('@/components/core/icon', () => () => null);
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

type Values = { title: string };

let submit: () => Promise<void>;

const Standalone = () => {
  const { control, handleSubmit, setError } = useForm<Values>({ defaultValues: { title: '' } });
  submit = handleSubmit((values) => {
    if (!values.title) setError('title', { message: 'Give it a title' });
  });

  return (
    <FormTextInput control={control} name="title" placeholder="Title" parse={(t) => t.trim()} />
  );
};

describe('FormTextInput', () => {
  it('shows a validation error without a FormProvider when given control', async () => {
    await render(<Standalone />);

    await act(() => submit());

    expect(screen.getByText('Give it a title')).toBeTruthy();
  });

  it('stores the parsed text', async () => {
    await render(<Standalone />);

    await fireEvent.changeText(screen.getByPlaceholderText('Title'), '  Dark mode  ');
    await act(() => submit());

    expect(screen.queryByText('Give it a title')).toBeNull();
  });
});
