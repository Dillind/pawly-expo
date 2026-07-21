import AppText from '@/components/core/app-text';
import { View } from 'react-native';

type Props = {
  title: string;
  description: string;
};

const TextDescriptionHeader = ({ title, description }: Props) => {
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="header" size={32} color="text">
        {title}
      </AppText>
      <AppText variant="body" size={14} color="text">
        {description}
      </AppText>
    </View>
  );
};

export default TextDescriptionHeader;
