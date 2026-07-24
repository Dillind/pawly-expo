import AppText from '@/components/core/app-text';

type Props = {
  marginTop?: number;
  marginBottom?: number;
  error?: string;
};

const FieldError = ({ marginTop, marginBottom, error }: Props) => {
  if (!error) return null;

  return (
    <AppText style={{ marginTop, marginBottom }} color="error" size={14}>
      {error}
    </AppText>
  );
};

export default FieldError;
