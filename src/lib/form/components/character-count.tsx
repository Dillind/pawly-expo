import AppText from '@/components/core/app-text';

type Props = {
  value: string | undefined;
  max: number;
};

const CharacterCount = ({ value, max }: Props) => (
  <AppText size={12} color="textSecondary" align="right">
    {`${value?.length ?? 0}/${max}`}
  </AppText>
);

export default CharacterCount;
