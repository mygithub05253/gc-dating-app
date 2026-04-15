import { Badge } from '@/components/ui/badge';
import { USER_STATUS_LABELS, USER_STATUS_COLORS } from '@/lib/constants';
import type { UserStatus } from '@/types/user';

interface StatusBadgeProps {
  status: UserStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={USER_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800'}>
      {USER_STATUS_LABELS[status] || status}
    </Badge>
  );
}
