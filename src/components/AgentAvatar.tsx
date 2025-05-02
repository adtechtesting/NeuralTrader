

interface AgentAvatarProps {
  name: string;
  personalityType: string;
  size?: number;
}

// Function to get color based on personality type
const getPersonalityColor = (personalityType: string): string => {
  const colors: Record<string, string> = {
    CONSERVATIVE: 'bg-blue-500', // blue
    AGGRESSIVE: 'bg-red-500', // red
    TECHNICAL: 'bg-purple-500', // purple
    FUNDAMENTAL: 'bg-green-500', // green
    EMOTIONAL: 'bg-pink-500', // pink
    CONTRARIAN: 'bg-yellow-500', // yellow
    WHALE: 'bg-indigo-500', // indigo
    NOVICE: 'bg-gray-500', // gray
  };

  return colors[personalityType] || 'bg-gray-500';
};

// Get initials from name
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export default function AgentAvatar({ name, personalityType, size = 40 }: AgentAvatarProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-full ${getPersonalityColor(
        personalityType
      )} text-white font-bold`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.4}px`,
      }}
    >
      {getInitials(name)}
    </div>
  );
}