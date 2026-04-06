import { getAvatarInitials, getAvatarColor } from '../../utils/helpers';

export default function Avatar({ name, url, size = 'md', className = '' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' };
  if (url) return <img src={url} alt={name} className={`rounded-full object-cover ${sizes[size]} ${className}`} />;
  return (
    <div className={`rounded-full flex items-center justify-center font-700 text-white flex-shrink-0 ${sizes[size]} ${className}`}
      style={{ background: getAvatarColor(name) }}>
      {getAvatarInitials(name)}
    </div>
  );
}
