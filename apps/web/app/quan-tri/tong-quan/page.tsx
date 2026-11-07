import { AdminShell } from '../admin-shell';
import { AdminDashboard } from './admin-dashboard';

export default function AdministratorHome() {
  return <AdminShell currentPath="/quan-tri/tong-quan"><AdminDashboard /></AdminShell>;
}
