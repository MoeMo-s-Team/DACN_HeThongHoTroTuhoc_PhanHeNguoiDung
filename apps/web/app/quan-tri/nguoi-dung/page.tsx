import { AdminShell } from '../admin-shell';
import { AdminUsers } from './admin-users';

export default function UsersPage() {
  return <AdminShell currentPath="/quan-tri/nguoi-dung"><AdminUsers /></AdminShell>;
}
